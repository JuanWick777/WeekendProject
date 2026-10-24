import { randomInt, randomUUID } from 'node:crypto';
import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { ROOM_STATES } from '@cybergrid/shared/protocol';
import { RoomError } from './room-error.js';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode = () => Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');

export function createRoomManager({
  now = Date.now, codeFactory = generateCode, onStartMatch = null,
  countdownMs = GAME_CONFIG.room.countdownMs,
  reconnectGraceMs = GAME_CONFIG.room.reconnectGraceMs, maxRooms = 100,
} = {}) {
  const rooms = new Map();
  const membership = new Map();
  const connected = new Set();
  const graceTimers = new Map();
  const listeners = new Set();
  let disposed = false;

  function view(room) {
    return {
      code: room.code, name: room.name, hostId: room.hostId, status: room.status,
      countdownEndsAtMs: room.countdownEndsAtMs,
      players: [...room.players.values()].map((player) => ({ ...player })),
    };
  }

  function emit(event) {
    for (const listener of listeners) listener(event);
  }

  function publish(room) {
    emit({ type: 'lobby', view: view(room), memberIds: [...room.players.keys()] });
  }

  function find(code, userId) {
    const room = rooms.get(code);
    if (!room) throw new RoomError(404, 'ROOM_NOT_FOUND', 'La sala no existe.');
    if (!room.players.has(userId)) throw new RoomError(403, 'NOT_IN_ROOM', 'No perteneces a esa sala.');
    return room;
  }

  function hostRoom(code, userId) {
    const room = find(code, userId);
    if (room.hostId !== userId) throw new RoomError(403, 'HOST_ONLY', 'Solo el anfitrión puede hacer esto.');
    return room;
  }

  function clearGrace(userId) {
    clearTimeout(graceTimers.get(userId));
    graceTimers.delete(userId);
  }

  function cancelCountdown(room) {
    if (room.status !== ROOM_STATES.COUNTDOWN) return;
    clearTimeout(room.countdownTimer);
    room.countdownTimer = null;
    room.countdownEndsAtMs = null;
    room.status = ROOM_STATES.LOBBY;
  }

  function remove(room, userId) {
    const wasPlaying = room.status === ROOM_STATES.PLAYING;
    clearGrace(userId);
    cancelCountdown(room);
    room.players.delete(userId);
    membership.delete(userId);
    emit({ type: 'left', userId, roomCode: room.code, wasPlaying });
    if (room.players.size === 0) {
      clearTimeout(room.countdownTimer);
      rooms.delete(room.code);
      return;
    }
    if (room.hostId === userId) {
      room.hostId = [...room.players.values()].find((player) => player.connected)?.id
        ?? room.players.keys().next().value;
    }
    publish(room);
  }

  function scheduleGrace(room, userId) {
    clearGrace(userId);
    const timer = setTimeout(() => {
      if (membership.get(userId) === room.code && !connected.has(userId)) remove(room, userId);
    }, reconnectGraceMs);
    timer.unref?.();
    graceTimers.set(userId, timer);
  }

  function addPlayer(room, user) {
    room.players.set(user.id, {
      id: user.id, displayName: user.displayName, ready: false, connected: connected.has(user.id),
    });
    membership.set(user.id, room.code);
    if (!connected.has(user.id)) scheduleGrace(room, user.id);
    publish(room);
    return view(room);
  }

  function isReady(room) {
    return room.players.size >= GAME_CONFIG.room.minPlayers
      && [...room.players.values()].every((player) => player.ready && player.connected);
  }

  return Object.freeze({
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getUserRoomCode(userId) { return membership.get(userId) ?? null; },
    getRoom(code, userId) { return view(find(code, userId)); },
    isPlaying(userId) {
      return rooms.get(membership.get(userId))?.status === ROOM_STATES.PLAYING;
    },
    create(user, { name }) {
      if (disposed) throw new RoomError(503, 'ROOMS_CLOSED', 'El servidor se está cerrando.');
      if (membership.has(user.id)) throw new RoomError(409, 'ALREADY_IN_ROOM', 'Ya perteneces a una sala.');
      if (rooms.size >= maxRooms) throw new RoomError(429, 'ROOM_LIMIT', 'No hay espacio para otra sala.');
      let code;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidate = codeFactory();
        if (/^[A-Z0-9]{6}$/.test(candidate) && !rooms.has(candidate)) { code = candidate; break; }
      }
      if (!code) throw new RoomError(503, 'CODE_UNAVAILABLE', 'No se pudo generar un código de sala.');
      const room = {
        code, name, hostId: user.id, status: ROOM_STATES.LOBBY,
        countdownEndsAtMs: null, countdownTimer: null, players: new Map(),
      };
      rooms.set(code, room);
      return addPlayer(room, user);
    },
    join(user, code) {
      const current = membership.get(user.id);
      if (current === code) return view(find(code, user.id));
      if (current) throw new RoomError(409, 'ALREADY_IN_ROOM', 'Sal de tu sala antes de entrar a otra.');
      const room = rooms.get(code);
      if (!room) throw new RoomError(404, 'ROOM_NOT_FOUND', 'La sala no existe.');
      if (room.status !== ROOM_STATES.LOBBY) throw new RoomError(409, 'ROOM_STARTED', 'La ronda ya inició.');
      if (room.players.size >= GAME_CONFIG.room.maxPlayers) throw new RoomError(409, 'ROOM_FULL', 'La sala está llena.');
      return addPlayer(room, user);
    },
    leave(userId, code) { remove(find(code, userId), userId); },
    setReady(userId, code, ready) {
      const room = find(code, userId);
      if (![ROOM_STATES.LOBBY, ROOM_STATES.COUNTDOWN].includes(room.status)) {
        throw new RoomError(409, 'INVALID_PHASE', 'Listo solo está disponible antes de la ronda.');
      }
      const player = room.players.get(userId);
      if (ready && !player.connected) throw new RoomError(409, 'NOT_CONNECTED', 'Conecta al servidor antes de marcar Listo.');
      if (!ready) cancelCountdown(room);
      player.ready = ready;
      publish(room);
      return view(room);
    },
    start(userId, code) {
      const room = hostRoom(code, userId);
      if (room.status !== ROOM_STATES.LOBBY) throw new RoomError(409, 'INVALID_PHASE', 'La sala no está en el lobby.');
      if (!isReady(room)) throw new RoomError(409, 'NOT_READY', 'Se necesitan al menos dos jugadores conectados y listos.');
      if (!onStartMatch) throw new RoomError(503, 'GAME_NOT_READY', 'El inicio de partidas todavía no está disponible.');
      room.status = ROOM_STATES.COUNTDOWN;
      room.countdownEndsAtMs = now() + countdownMs;
      room.countdownTimer = setTimeout(() => {
        if (disposed || rooms.get(code) !== room || room.status !== ROOM_STATES.COUNTDOWN) return;
        if (!isReady(room)) { cancelCountdown(room); publish(room); return; }
        room.status = ROOM_STATES.PLAYING;
        room.countdownEndsAtMs = null;
        room.countdownTimer = null;
        try {
          onStartMatch({
            matchId: randomUUID(), seed: randomInt(0, 2 ** 32), roomCode: code,
            startedAtMs: now(),
            players: [...room.players.values()].map(({ id, displayName }) => ({ id, displayName })),
          });
        } catch {
          room.status = ROOM_STATES.LOBBY;
          for (const player of room.players.values()) player.ready = false;
          emit({ type: 'start-failed', roomCode: code, memberIds: [...room.players.keys()] });
        }
        publish(room);
      }, countdownMs);
      room.countdownTimer.unref?.();
      publish(room);
      return view(room);
    },
    markFinished(code) {
      const room = rooms.get(code);
      if (!room || room.status !== ROOM_STATES.PLAYING) return false;
      room.status = ROOM_STATES.FINISHED;
      publish(room);
      return true;
    },
    rematch(userId, code) {
      const room = hostRoom(code, userId);
      if (room.status !== ROOM_STATES.FINISHED) throw new RoomError(409, 'INVALID_PHASE', 'La ronda aún no termina.');
      room.status = ROOM_STATES.LOBBY;
      for (const player of room.players.values()) player.ready = false;
      publish(room);
      return view(room);
    },
    setConnected(userId, value) {
      if (disposed) return;
      if (value) connected.add(userId); else connected.delete(userId);
      const room = rooms.get(membership.get(userId));
      if (!room) return;
      const player = room.players.get(userId);
      if (player.connected === value) return;
      player.connected = value;
      if (value) clearGrace(userId);
      else {
        player.ready = false;
        cancelCountdown(room);
        scheduleGrace(room, userId);
      }
      publish(room);
    },
    dispose() {
      disposed = true;
      for (const timer of graceTimers.values()) clearTimeout(timer);
      for (const room of rooms.values()) clearTimeout(room.countdownTimer);
      graceTimers.clear(); rooms.clear(); membership.clear(); connected.clear(); listeners.clear();
    },
  });
}
