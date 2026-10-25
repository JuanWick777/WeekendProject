import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createAuthService } from '../src/auth/auth-service.js';
import { createServerRuntime } from '../src/runtime.js';
import { createTestAuthRepositories } from './helpers/auth-repositories.js';
import { createTestSocket } from './helpers/socket-client.js';

const origin = 'http://127.0.0.1:5173';
let runtime;
let baseUrl;
let clients = [];

async function api(path, cookie, method = 'GET', body) {
  const headers = { origin };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function connect(cookie) {
  const client = createTestSocket(baseUrl.replace('http:', 'ws:') + '/ws', { cookie, origin });
  clients.push(client); await client.waitFor((message) => message.type === 'welcome');
  return client;
}

async function setup({ saveMatch, gameOptions } = {}) {
  const authService = createAuthService(createTestAuthRepositories());
  runtime = createServerRuntime({ authService, appOrigin: origin, nodeEnv: 'test', saveMatch,
    roomOptions: { countdownMs: 20 }, gameOptions });
  await new Promise((resolve, reject) => { runtime.server.once('error', reject); runtime.server.listen(0, '127.0.0.1', resolve); });
  baseUrl = 'http://127.0.0.1:' + runtime.server.address().port;
  const accounts = [];
  for (const username of ['alice', 'bob']) {
    const response = await api('/api/auth/register', null, 'POST', { username, displayName: username, password: 'grid-password-123' });
    expect(response.response.status).toBe(200);
    accounts.push({ user: response.data.data.user, cookie: response.cookie, client: await connect(response.cookie) });
  }
  const [a, b] = accounts;
  const create = await api('/api/rooms', a.cookie, 'POST', { name: 'Live round' });
  const code = create.data.data.code;
  await api(`/api/rooms/${code}/join`, b.cookie, 'POST');
  for (const account of accounts) await api(`/api/rooms/${code}/ready`, account.cookie, 'PATCH', { ready: true });
  expect((await api(`/api/rooms/${code}/start`, a.cookie, 'POST')).response.status).toBe(200);
  const first = await a.client.waitFor((message) => message.type === 'match:start');
  const second = await b.client.waitFor((message) => message.type === 'match:start');
  expect(first.payload.map).toEqual(second.payload.map);
  return { a, b, code, start: first.payload };
}

afterEach(async () => {
  for (const client of clients) client.ws.terminate();
  clients = [];
  await runtime?.close(); runtime = null;
});

describe('partida autoritativa por WebSocket real', () => {
  it('comparte mapa/estados, mueve/dispara por input, recupera la ronda y guarda el resultado una vez', async () => {
    const saveMatch = vi.fn(async () => {});
    const { a, b, code, start } = await setup({ saveMatch, gameOptions: {
      matchOptions: { durationMs: 2000, nodeDurationMs: 400, nodePreviewMs: 100 },
    } });
    const initial = start.state.players.find((player) => player.id === a.user.id);
    a.client.ws.send(JSON.stringify({ type: 'input', payload: { seq: 0, moveX: 1, moveY: 0, aimX: 1, aimY: 0, attack: true } }));
    const moved = await b.client.waitFor((message) => message.type === 'state'
      && message.payload.players.find((player) => player.id === a.user.id).x > initial.x + 1);
    await a.client.waitFor((message) => message.type === 'event' && message.payload.kind === 'shot');
    a.client.ws.terminate();
    const replacement = await connect(a.cookie);
    const recovered = (await replacement.waitFor((message) => message.type === 'match:start')).payload;
    expect(recovered.matchId).toBe(start.matchId); expect(recovered.map).toEqual(start.map);
    const resumedPlayer = recovered.state.players.find((player) => player.id === a.user.id);
    expect(resumedPlayer.x).toBeGreaterThanOrEqual(moved.payload.players.find((player) => player.id === a.user.id).x);
    expect(resumedPlayer.hp).toBe(initial.hp);
    replacement.ws.send(JSON.stringify({ type: 'input', payload: { seq: 0, moveX: -1, moveY: 0, aimX: 1, aimY: 0, attack: false } }));
    await replacement.waitFor((message) => message.type === 'state'
      && message.payload.players.find((player) => player.id === a.user.id).x < resumedPlayer.x);
    const result = (await replacement.waitFor((message) => message.type === 'match:end', 4000)).payload;
    await vi.waitFor(() => expect(saveMatch).toHaveBeenCalledTimes(1));
    expect(result).toMatchObject({ matchId: start.matchId, durationMs: 2000, finishReason: 'time', status: 'completed' });
    expect(saveMatch.mock.calls[0][0]).toEqual(result);
    expect((await api(`/api/rooms/${code}`, a.cookie)).data.data.status).toBe('finished');
    const nodes = new Set(b.client.messages.filter((m) => m.type === 'state').map((m) => m.payload.objective.activeNodeId));
    expect([...nodes].sort()).toEqual(['center', 'east', 'north', 'south', 'west'].sort());
    expect((await api(`/api/rooms/${code}/rematch`, a.cookie, 'POST')).data.data.players.every((p) => !p.ready)).toBe(true);
  });

  it('resuelve abandono desde la ruta real y guarda el ganador restante', async () => {
    const saveMatch = vi.fn(async () => {});
    const { a, b, code, start } = await setup({ saveMatch });
    await api(`/api/rooms/${code}/leave`, b.cookie, 'POST');
    const result = (await a.client.waitFor((message) => message.type === 'match:end')).payload;
    await vi.waitFor(() => expect(saveMatch).toHaveBeenCalledTimes(1));
    expect(result).toMatchObject({ matchId: start.matchId, finishReason: 'forfeit', winnerId: a.user.id });
    expect(result.players.find((p) => p.playerId === b.user.id).forfeited).toBe(true);
    expect(runtime.games.getStatus(code).persistence).toBe('saved');
  });

  it('informa un fallo de guardado sin publicar un éxito ni duplicar el resultado', async () => {
    const saveMatch = vi.fn(async () => { throw new Error('DATABASE_PRIVATE_DETAIL'); });
    const { a, b, code } = await setup({ saveMatch });
    await api(`/api/rooms/${code}/leave`, b.cookie, 'POST');
    await a.client.waitFor((message) => message.type === 'match:end');
    const failure = await a.client.waitFor((message) => message.type === 'error' && message.payload.code === 'RESULT_NOT_SAVED');
    expect(JSON.stringify(failure)).not.toContain('DATABASE_PRIVATE_DETAIL');
    expect(runtime.games.getStatus(code).persistence).toBe('failed');
    expect(saveMatch).toHaveBeenCalledTimes(1);
  });

  it('no sigue moviendo ni disparando tras desconectarse', async () => {
    const { a, b } = await setup({ saveMatch: async () => {} });
    a.client.ws.send(JSON.stringify({ type: 'input', payload: { seq: 0, moveX: 1, moveY: 0, aimX: 1, aimY: 0, attack: true } }));
    await b.client.waitFor((message) => message.type === 'state' && message.payload.players.some((p) => p.id === a.user.id && p.x > 65));
    a.client.ws.terminate();
    const disconnected = await b.client.waitFor((message) => message.type === 'state' && message.payload.players.some((p) => p.id === a.user.id && !p.connected));
    const player = disconnected.payload.players.find((p) => p.id === a.user.id);
    const shots = b.client.messages.filter((m) => m.type === 'event' && m.payload.kind === 'shot' && m.payload.actorId === a.user.id).length;
    await b.client.waitFor((message) => message.type === 'state' && message.payload.tick >= disconnected.payload.tick + 10);
    const newest = [...b.client.messages].reverse().find((message) => message.type === 'state').payload;
    expect(newest.players.find((p) => p.id === a.user.id).x).toBe(player.x);
    expect(b.client.messages.filter((m) => m.type === 'event' && m.payload.kind === 'shot' && m.payload.actorId === a.user.id)).toHaveLength(shots);
    expect(b.client.ws.readyState).toBe(WebSocket.OPEN);
  });
});
