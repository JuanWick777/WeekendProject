import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createAuthService } from '../src/auth/auth-service.js';
import { createServerRuntime } from '../src/runtime.js';
import { SESSION_TTL_MS } from '../src/auth/session.js';
import { createTestAuthRepositories } from './helpers/auth-repositories.js';
import { createTestSocket } from './helpers/socket-client.js';

const origin = 'http://127.0.0.1:5173';
let runtime;
let repositories;
let authService;
let baseUrl;
let wsUrl;
let time;
let clients;

async function listen(options = {}) {
  runtime = createServerRuntime({ authService, appOrigin: origin, nodeEnv: 'test', now: () => time, enableGame: false, ...options });
  await new Promise((resolve, reject) => {
    runtime.server.once('error', reject); runtime.server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = 'http://127.0.0.1:' + runtime.server.address().port;
  wsUrl = baseUrl.replace('http:', 'ws:') + '/ws';
}

async function api(path, { cookie, method = 'GET', body, requestOrigin = origin } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (method !== 'GET' && requestOrigin !== null) headers.origin = requestOrigin;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(baseUrl + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function account(username) {
  const result = await api('/api/auth/register', {
    method: 'POST', body: { username, displayName: username, password: 'test-energy-123' },
  });
  expect(result.response.status).toBe(200);
  return { user: result.data.data.user, cookie: result.cookie };
}

async function socket(account, options) {
  const client = createTestSocket(wsUrl, { cookie: account.cookie, ...options });
  clients.push(client);
  await client.waitFor((message) => message.type === 'welcome');
  return client;
}

async function pair(options = {}) {
  await listen(options);
  const a = await account('alice'); const b = await account('bob');
  const sa = await socket(a); const sb = await socket(b);
  const created = await api('/api/rooms', { cookie: a.cookie, method: 'POST', body: { name: 'Grid' } });
  expect(created.response.status).toBe(200);
  const code = created.data.data.code;
  await api(`/api/rooms/${code}/join`, { cookie: b.cookie, method: 'POST' });
  return { a, b, sa, sb, code };
}

async function markReady(pair) {
  for (const member of [pair.a, pair.b]) {
    const result = await api(`/api/rooms/${pair.code}/ready`, { cookie: member.cookie, method: 'PATCH', body: { ready: true } });
    expect(result.response.status).toBe(200);
  }
}

beforeEach(() => {
  time = Date.now(); clients = [];
  repositories = createTestAuthRepositories();
  authService = createAuthService({ ...repositories, now: () => time });
});
afterEach(async () => {
  for (const client of clients) client.ws.terminate();
  if (runtime) await runtime.close();
  runtime = null;
});

describe('HTTP y WebSockets reales con repositorios de prueba', () => {
  it('comparte lobby y Listo entre dos cuentas, refleja me y devuelve ping/pong', async () => {
    const p = await pair();
    const sameRoom = (message) => message.type === 'lobby' && message.payload?.players.length === 2;
    expect((await p.sa.waitFor(sameRoom)).payload.code).toBe(p.code);
    expect((await p.sb.waitFor(sameRoom)).payload.code).toBe(p.code);
    await markReady(p);
    await p.sa.waitFor((message) => message.type === 'lobby' && message.payload?.players.every((player) => player.ready));
    const me = await api('/api/auth/me', { cookie: p.a.cookie });
    expect(me.data.data.roomCode).toBe(p.code);
    p.sb.ws.send(JSON.stringify({ type: 'ping', payload: { id: 7, sentAtMs: 123.5 } }));
    expect((await p.sb.waitFor((message) => message.type === 'pong')).payload).toEqual({ id: 7, sentAtMs: 123.5 });
    const notStarted = await api(`/api/rooms/${p.code}/start`, { cookie: p.a.cookie, method: 'POST' });
    expect(notStarted.response.status).toBe(503);
    expect(notStarted.data.error.code).toBe('GAME_NOT_READY');
  });

  it('protege salas, pertenencia, anfitrión, Origin y payload sin aceptar identidad externa', async () => {
    const p = await pair();
    expect((await api('/api/rooms', { method: 'POST', body: { name: 'Anonymous' } })).response.status).toBe(401);
    expect((await api(`/api/rooms/${p.code}/start`, { cookie: p.b.cookie, method: 'POST' })).response.status).toBe(403);
    expect((await api(`/api/rooms/${p.code}/ready`, { cookie: p.b.cookie, method: 'PATCH', body: { ready: true, userId: p.a.user.id } })).response.status).toBe(400);
    expect((await api(`/api/rooms/${p.code}/leave`, { cookie: p.b.cookie, method: 'POST', body: { userId: p.a.user.id } })).response.status).toBe(400);
    expect((await api(`/api/rooms/${p.code}/leave`, { cookie: p.b.cookie, method: 'POST', requestOrigin: 'https://attacker.example' })).response.status).toBe(403);
    const outsider = await account('outsider');
    expect((await api(`/api/rooms/${p.code}`, { cookie: outsider.cookie })).response.status).toBe(403);
  });

  it('rechaza upgrades sin sesión, vencidos, de origen ajeno y de otra ruta', async () => {
    await listen();
    const a = await account('alice');
    async function rejected({ cookie, requestOrigin = origin, url = wsUrl }) {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(url, { origin: requestOrigin, headers: cookie ? { Cookie: cookie } : {} });
        ws.on('error', () => {});
        ws.on('open', () => { ws.terminate(); reject(new Error('Unexpected accepted upgrade')); });
        ws.on('unexpected-response', (_request, response) => { response.resume(); ws.terminate(); resolve(response.statusCode); });
      });
    }
    expect(await rejected({})).toBe(401);
    expect(await rejected({ cookie: a.cookie, requestOrigin: 'https://attacker.example' })).toBe(403);
    expect(await rejected({ cookie: a.cookie, url: wsUrl.replace('/ws', '/other') })).toBe(404);
    time += SESSION_TTL_MS;
    expect(await rejected({ cookie: a.cookie })).toBe(401);
  });

  it('reemplaza el socket sin duplicar jugador ni desconectarlo por el cierre anterior', async () => {
    const p = await pair();
    const replacement = await socket(p.a);
    expect(await p.sa.closeResult).toBe(4001);
    replacement.ws.send(JSON.stringify({ type: 'ping', payload: { id: 99, sentAtMs: 1 } }));
    await replacement.waitFor((message) => message.type === 'pong' && message.payload.id === 99);
    const room = await api(`/api/rooms/${p.code}`, { cookie: p.a.cookie });
    expect(room.data.data.players).toHaveLength(2);
    expect(room.data.data.players.find((player) => player.id === p.a.user.id).connected).toBe(true);
  });

  it('logout cierra inmediatamente el socket de esa sesión y conserva al rival conectado', async () => {
    const p = await pair();
    expect((await api('/api/auth/logout', { cookie: p.a.cookie, method: 'POST' })).response.status).toBe(200);
    expect(await p.sa.closeResult).toBe(4401);
    const changed = await p.sb.waitFor((message) => message.type === 'lobby' && message.payload?.players.some((player) => player.id === p.a.user.id && !player.connected));
    expect(changed.payload.players.find((player) => player.id === p.b.user.id).connected).toBe(true);
  });

  it('invalida el socket al vencer la sesión aunque todavía no toque heartbeat', async () => {
    await listen(); const a = await account('alice'); const client = await socket(a);
    time += SESSION_TTL_MS;
    client.ws.send(JSON.stringify({ type: 'ping', payload: { id: 1, sentAtMs: 0 } }));
    expect(await client.closeResult).toBe(4401);
    expect(client.messages.some((message) => message.type === 'pong')).toBe(false);
  });

  it('rechaza input fuera de fase y payloads falsificados; cierra mensajes grandes', async () => {
    await listen(); const a = await account('alice'); const client = await socket(a);
    const input = { seq: 1, moveX: 1, moveY: 0, aimX: 1, aimY: 0, attack: false };
    client.ws.send(JSON.stringify({ type: 'input', payload: input }));
    await client.waitFor((message) => message.type === 'error' && message.payload.code === 'INVALID_PHASE');
    client.ws.send(JSON.stringify({ type: 'input', payload: { ...input, x: 700 } }));
    await client.waitFor((message) => message.type === 'error' && message.payload.code === 'INVALID_MESSAGE');
    client.ws.send('x'.repeat(4097));
    expect(await client.closeResult).toBe(1009);
  });

  it('aplica límite de frecuencia y cierra tras tres mensajes inválidos', async () => {
    await listen({ socketOptions: { maxMessagesPerSecond: 2 } });
    const a = await account('alice'); const client = await socket(a);
    for (let id = 0; id < 3; id += 1) client.ws.send(JSON.stringify({ type: 'ping', payload: { id, sentAtMs: 0 } }));
    await client.waitFor((message) => message.type === 'error' && message.payload.code === 'RATE_LIMITED');
    expect(await client.closeResult).toBe(1008);
    const second = await socket(a);
    for (let index = 0; index < 3; index += 1) {
      time += 1000;
      second.messages.length = 0;
      second.ws.send('{');
      await second.waitFor((message) => message.type === 'error' && message.payload.code === 'INVALID_MESSAGE');
    }
    expect(await second.closeResult).toBe(1008);
  });

  it('usa heartbeat para cerrar una conexión que deja de contestar pong', async () => {
    await listen({ socketOptions: { heartbeatMs: 50 } });
    const a = await account('alice'); const client = await socket(a, { autoPong: false });
    expect(await client.closeResult).toBe(1006);
  });

  it('transfiere host al salir, limpia me y envía lobby null al usuario que sale', async () => {
    const p = await pair();
    await api(`/api/rooms/${p.code}/leave`, { cookie: p.a.cookie, method: 'POST' });
    await p.sa.waitFor((message) => message.type === 'lobby' && message.payload === null);
    const changed = await p.sb.waitFor((message) => message.type === 'lobby' && message.payload?.hostId === p.b.user.id);
    expect(changed.payload.players).toHaveLength(1);
    expect((await api('/api/auth/me', { cookie: p.a.cookie })).data.data.roomCode).toBeNull();
  });

  it('completa countdown con un hook de prueba y entrega solo inputs vigentes de playing', async () => {
    const onStartMatch = vi.fn(); const onInput = vi.fn();
    const p = await pair({ onStartMatch, onInput, roomOptions: { countdownMs: 30 } });
    await markReady(p);
    expect((await api(`/api/rooms/${p.code}/start`, { cookie: p.a.cookie, method: 'POST' })).response.status).toBe(200);
    await p.sb.waitFor((message) => message.type === 'lobby' && message.payload?.status === 'playing');
    expect(onStartMatch).toHaveBeenCalledTimes(1);
    const input = { seq: 4, moveX: 1, moveY: 0, aimX: 0, aimY: -1, attack: true };
    p.sa.ws.send(JSON.stringify({ type: 'input', payload: input }));
    p.sa.ws.send(JSON.stringify({ type: 'input', payload: { ...input, seq: 3 } }));
    await p.sa.waitFor((message) => message.type === 'error' && message.payload.code === 'STALE_INPUT');
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onInput.mock.calls[0][0]).toEqual({ userId: p.a.user.id, roomCode: p.code, input, receivedAtMs: time });
  });
});
