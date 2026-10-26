import { WebSocket, WebSocketServer } from 'ws';
import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { PROTOCOL_VERSION, SERVER_MESSAGES } from '@cybergrid/shared/protocol';
import { clientMessageSchema } from '@cybergrid/shared/schemas';
import { readSessionToken } from '../auth/session.js';

export function attachSocketServer(server, {
  authService = null, roomManager = null, appOrigin = 'http://127.0.0.1:5173',
  now = Date.now, onInput = null, onPlayerLeft = null, onConnected = null,
  heartbeatMs = 15_000, maxConnections = 200, maxMessagesPerSecond = 60,
} = {}) {
  const wss = new WebSocketServer({
    noServer: true, maxPayload: GAME_CONFIG.network.maxSocketPayloadBytes, perMessageDeflate: false,
  });
  const connections = new Map();
  let closed = false;
  let pendingUpgrades = 0;

  function closeSocket(ws, code, reason) {
    ws.close(code, reason);
    const timeout = setTimeout(() => ws.terminate(), 1000);
    timeout.unref();
    ws.once('close', () => clearTimeout(timeout));
  }

  function retire(record, code, reason) {
    if (connections.get(record.user.id) === record) {
      connections.delete(record.user.id);
      roomManager.setConnected(record.user.id, false);
    }
    closeSocket(record.ws, code, reason);
  }

  function send(record, type, payload) {
    const ws = record.ws;
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 262_144) { ws.terminate(); return; }
    ws.send(JSON.stringify({ type, payload }), (error) => { if (error) ws.terminate(); });
  }

  function sendError(record, code, message) { send(record, SERVER_MESSAGES.ERROR, { code, message }); }

  function broadcast(roomCode, type, payload) {
    for (const [id, record] of connections) {
      if (roomManager?.getUserRoomCode(id) === roomCode) send(record, type, payload);
    }
  }

  const unsubscribe = roomManager?.subscribe((event) => {
    if (event.type === 'lobby') {
      for (const id of event.memberIds) {
        const record = connections.get(id);
        if (record) send(record, SERVER_MESSAGES.LOBBY, event.view);
      }
    } else if (event.type === 'left') {
      const record = connections.get(event.userId);
      if (record) send(record, SERVER_MESSAGES.LOBBY, null);
      onPlayerLeft?.({ roomCode: event.roomCode, userId: event.userId, wasPlaying: event.wasPlaying });
    } else if (event.type === 'start-failed') {
      broadcast(event.roomCode, SERVER_MESSAGES.ERROR, {
        code: 'MATCH_START_FAILED', message: 'No se pudo iniciar la partida. Intenta de nuevo.',
      });
    }
  });

  function reject(socket, status) {
    if (socket.destroyed) return;
    const reason = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 429: 'Too Many Requests', 503: 'Service Unavailable' }[status];
    socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  }

  function connect(ws, session, token) {
    const { user, expiresAtMs } = session;
    const previous = connections.get(user.id);
    const record = {
      ws, user, token, expiresAtMs, lastSeq: -1, alive: true, checking: false,
      messagesAtMs: now(), messages: 0, invalidMessages: 0,
    };
    connections.set(user.id, record);
    ws.on('error', () => {});
    ws.on('pong', () => { record.alive = true; });
    ws.on('close', () => {
      if (connections.get(user.id) !== record) return;
      connections.delete(user.id);
      roomManager.setConnected(user.id, false);
    });
    ws.on('message', (raw, binary) => {
      if (connections.get(user.id) !== record || closed || ws.readyState !== WebSocket.OPEN) return;
      if (now() >= record.expiresAtMs) { retire(record, 4401, 'Session expired'); return; }
      if (now() - record.messagesAtMs >= 1000) { record.messagesAtMs = now(); record.messages = 0; }
      record.messages += 1;
      if (record.messages > maxMessagesPerSecond) {
        sendError(record, 'RATE_LIMITED', 'Demasiados mensajes.'); retire(record, 1008, 'Rate limit'); return;
      }
      let parsed;
      if (!binary) {
        try { parsed = clientMessageSchema.safeParse(JSON.parse(raw.toString())); } catch { /* Invalid JSON. */ }
      }
      if (!parsed?.success) {
        record.invalidMessages += 1;
        sendError(record, 'INVALID_MESSAGE', 'El mensaje no cumple el contrato.');
        if (record.invalidMessages >= 3) retire(record, 1008, 'Invalid messages');
        return;
      }
      const { type, payload } = parsed.data;
      if (type === 'ping') { send(record, SERVER_MESSAGES.PONG, payload); return; }
      if (!roomManager.isPlaying(user.id)) { sendError(record, 'INVALID_PHASE', 'La ronda no está activa.'); return; }
      if (!onInput) { sendError(record, 'GAME_NOT_READY', 'La simulación no está conectada.'); return; }
      if (payload.seq <= record.lastSeq) { sendError(record, 'STALE_INPUT', 'La secuencia de input ya fue procesada.'); return; }
      try {
        const accepted = onInput({ userId: user.id, roomCode: roomManager.getUserRoomCode(user.id), input: payload, receivedAtMs: now() });
        if (accepted === false) sendError(record, 'INPUT_REJECTED', 'El input ya no corresponde a la ronda activa.');
        else record.lastSeq = payload.seq;
      } catch { sendError(record, 'INPUT_FAILED', 'No se pudo procesar el input.'); }
    });
    // Register the replacement before closing the old socket, so its close event cannot disconnect this one.
    if (previous) closeSocket(previous.ws, 4001, 'Connection replaced');
    send(record, SERVER_MESSAGES.WELCOME, {
      protocolVersion: PROTOCOL_VERSION, user, roomCode: roomManager.getUserRoomCode(user.id), nextInputSeq: 0,
    });
    roomManager.setConnected(user.id, true);
    const roomCode = roomManager.getUserRoomCode(user.id);
    if (roomCode) send(record, SERVER_MESSAGES.LOBBY, roomManager.getRoom(roomCode, user.id));
    onConnected?.({ userId: user.id, roomCode });
  }

  async function upgrade(request, socket, head) {
    const ignoreError = () => {};
    socket.on('error', ignoreError);
    socket.setTimeout(5000, () => socket.destroy());
    let pending = false;
    try {
      if (new URL(request.url, 'http://localhost').pathname !== '/ws') return reject(socket, 404);
      if (request.headers.origin !== appOrigin) return reject(socket, 403);
      if (closed || !authService || !roomManager) return reject(socket, 503);
      if (wss.clients.size + pendingUpgrades >= maxConnections) return reject(socket, 429);
      pendingUpgrades += 1;
      pending = true;
      const token = readSessionToken(request.headers.cookie);
      const session = await authService.getSession(token);
      if (!session) return reject(socket, 401);
      if (closed || socket.destroyed) return reject(socket, 503);
      socket.setTimeout(0);
      socket.removeListener('error', ignoreError);
      wss.handleUpgrade(request, socket, head, (ws) => connect(ws, session, token));
    } catch { reject(socket, 503); }
    finally { if (pending) pendingUpgrades -= 1; }
  }
  server.on('upgrade', upgrade);

  async function checkSession(record) {
    if (record.checking) return;
    record.checking = true;
    try {
      const session = await authService.getSession(record.token);
      if (connections.get(record.user.id) !== record) return;
      if (!session) retire(record, 4401, 'Session invalid');
      else record.expiresAtMs = session.expiresAtMs;
    } catch { retire(record, 1013, 'Authentication unavailable'); }
    finally { record.checking = false; }
  }

  const heartbeat = setInterval(() => {
    for (const record of connections.values()) {
      if (record.ws.readyState !== WebSocket.OPEN) continue;
      if (!record.alive) { record.ws.terminate(); continue; }
      record.alive = false;
      record.ws.ping();
      void checkSession(record);
    }
  }, heartbeatMs);
  heartbeat.unref();

  function close() {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    unsubscribe?.();
    server.removeListener('upgrade', upgrade);
    for (const ws of wss.clients) ws.terminate();
    wss.close();
  }
  server.once('close', close);

  return Object.freeze({
    broadcast,
    sendToUser(userId, type, payload) {
      const record = connections.get(userId);
      if (record) send(record, type, payload);
    },
    closeSession(token) {
      for (const record of connections.values()) {
        if (record.token === token) retire(record, 4401, 'Session invalidated');
      }
    },
    close,
  });
}
