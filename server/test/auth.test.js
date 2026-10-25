import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createAuthService } from '../src/auth/auth-service.js';
import { SESSION_TTL_MS } from '../src/auth/session.js';
import { createTestAuthRepositories } from './helpers/auth-repositories.js';

const origin = 'http://127.0.0.1:5173';
const credentials = { username: 'Alice', displayName: 'Alice Grid', password: 'energy-password-123' };
let repositories;
let authService;
let server;
let baseUrl;
let time;

async function listen(options = {}) {
  server = createServer(createApp({ authService, appOrigin: origin, nodeEnv: 'test', ...options }));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = 'http://127.0.0.1:' + server.address().port;
}

async function call(path, { method = 'GET', body, cookie, requestOrigin = origin } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  if (method !== 'GET' && requestOrigin !== null) headers.origin = requestOrigin;
  const response = await fetch(baseUrl + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    response, data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}

function register(options = {}) {
  return call('/api/auth/register', { method: 'POST', body: credentials, ...options });
}

beforeEach(() => {
  time = Date.now();
  repositories = createTestAuthRepositories();
  authService = createAuthService({ ...repositories, now: () => time });
});

afterEach(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  vi.restoreAllMocks();
});

describe('autenticación por HTTP real con repositorios de prueba', () => {
  it('registra, normaliza y autentica por cookie sin publicar hashes ni tokens', async () => {
    await listen();
    const result = await register();
    expect(result.response.status).toBe(200);
    expect(result.data.data.user).toEqual({
      id: expect.any(String), username: 'alice', displayName: 'Alice Grid',
    });
    const cookieHeader = result.response.headers.get('set-cookie');
    expect(cookieHeader).toMatch(/HttpOnly/);
    expect(cookieHeader).toMatch(/SameSite=Lax/);
    expect(cookieHeader).toMatch(/Path=\//);
    expect(cookieHeader).not.toMatch(/Secure/);
    const userRow = [...repositories.userRows.values()][0];
    expect(userRow.passwordHash).toMatch(/^scrypt\$32768\$8\$3\$/);
    expect(userRow.passwordHash).not.toContain(credentials.password);
    const sessionRow = [...repositories.sessionRows.values()][0];
    expect(sessionRow.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sessionRow.tokenHash).not.toBe(result.cookie.split('=')[1]);
    expect(sessionRow.expiresAtMs).toBe(time + SESSION_TTL_MS);
    const me = await call('/api/auth/me', { cookie: result.cookie });
    expect(me.response.status).toBe(200);
    expect(me.data).toEqual({ ok: true, data: { user: result.data.data.user, roomCode: null } });
    expect(JSON.stringify(me.data)).not.toMatch(/password|token|Hash/);
    expect(me.response.headers.get('cache-control')).toBe('no-store');
  });

  it('rechaza duplicados normalizados y carreras de unicidad reportadas por C', async () => {
    await listen();
    expect((await register()).response.status).toBe(200);
    const duplicate = await register({ body: { ...credentials, username: 'ALICE' } });
    expect(duplicate.response.status).toBe(409);
    vi.spyOn(repositories.users, 'findUserByUsername').mockResolvedValue(null);
    const race = await register();
    expect(race.response.status).toBe(409);
    expect(race.data.error.code).toBe('USERNAME_TAKEN');
    expect(repositories.userRows.size).toBe(1);
    expect(repositories.sessionRows.size).toBe(1);
  });

  it('rechaza contraseña incorrecta y usuario inexistente con el mismo error', async () => {
    await listen();
    await register();
    const wrong = await call('/api/auth/login', {
      method: 'POST', body: { username: 'alice', password: 'incorrect-password' },
    });
    const missing = await call('/api/auth/login', {
      method: 'POST', body: { username: 'nobody', password: 'incorrect-password' },
    });
    expect(wrong.response.status).toBe(401);
    expect(missing.response.status).toBe(401);
    expect(wrong.data).toEqual(missing.data);
    expect(wrong.cookie).toBeUndefined();
    expect(repositories.sessionRows.size).toBe(1);
  });

  it('inicia sesión y reemplaza la sesión presentada sin permitir reutilizarla', async () => {
    await listen();
    const first = await register();
    const login = await call('/api/auth/login', {
      method: 'POST', cookie: first.cookie,
      body: { username: ' ALICE ', password: credentials.password },
    });
    expect(login.response.status).toBe(200);
    expect(login.cookie).not.toBe(first.cookie);
    expect((await call('/api/auth/me', { cookie: first.cookie })).response.status).toBe(401);
    expect((await call('/api/auth/me', { cookie: login.cookie })).response.status).toBe(200);
    expect(repositories.sessionRows.size).toBe(1);
  });

  it('rechaza sesión ausente, inventada, duplicada y vencida exactamente en su plazo', async () => {
    await listen();
    const registered = await register();
    for (const cookie of [undefined, 'cg_session=malformed', 'cg_session=' + 'a'.repeat(43), registered.cookie + '; ' + registered.cookie]) {
      expect((await call('/api/auth/me', { cookie })).response.status).toBe(401);
    }
    time += SESSION_TTL_MS;
    expect((await call('/api/auth/me', { cookie: registered.cookie })).response.status).toBe(401);
  });

  it('logout invalida la sesión, limpia la cookie y es idempotente', async () => {
    await listen();
    const registered = await register();
    const logout = await call('/api/auth/logout', { method: 'POST', cookie: registered.cookie });
    expect(logout.response.status).toBe(200);
    expect(logout.data.data.loggedOut).toBe(true);
    expect(logout.response.headers.get('set-cookie')).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await call('/api/auth/me', { cookie: registered.cookie })).response.status).toBe(401);
    expect((await call('/api/auth/logout', { method: 'POST' })).response.status).toBe(200);
    expect(repositories.sessionRows.size).toBe(0);
  });

  it('bloquea origen ajeno o ausente sin crear cuentas, sesiones ni cerrar la válida', async () => {
    await listen();
    const registered = await register();
    for (const requestOrigin of ['https://attacker.example', null]) {
      for (const action of ['register', 'login', 'logout']) {
        const result = await call('/api/auth/' + action, {
          method: 'POST', cookie: registered.cookie, requestOrigin,
          body: action === 'register' ? { ...credentials, username: 'other' } : undefined,
        });
        expect(result.response.status).toBe(403);
        expect(result.data.error.code).toBe('ORIGIN_FORBIDDEN');
      }
    }
    expect(repositories.userRows.size).toBe(1);
    expect(repositories.sessionRows.size).toBe(1);
    expect((await call('/api/auth/me', { cookie: registered.cookie })).response.status).toBe(200);
  });

  it('valida Zod antes de crear usuario y rechaza identidad inyectada', async () => {
    await listen();
    for (const body of [
      { ...credentials, userId: 'admin' }, { ...credentials, password: 'short' },
      { ...credentials, username: 'bad name' }, { ...credentials, displayName: ' ' },
    ]) {
      const result = await register({ body });
      expect(result.response.status).toBe(400);
      expect(result.data.error.code).toBe('VALIDATION_ERROR');
    }
    expect(repositories.userRows.size).toBe(0);
    expect(repositories.sessionRows.size).toBe(0);
  });

  it('marca la cookie Secure en producción también al eliminarla', async () => {
    await listen({ nodeEnv: 'production' });
    const registered = await register();
    expect(registered.response.headers.get('set-cookie')).toMatch(/; Secure/);
    const logout = await call('/api/auth/logout', { method: 'POST', cookie: registered.cookie });
    expect(logout.response.headers.get('set-cookie')).toMatch(/; Secure/);
  });

  it('limita intentos y vuelve a admitirlos al vencer la ventana', async () => {
    await listen({ authRateLimit: { maxAttempts: 2, windowMs: 1000, now: () => time } });
    await register({ body: {} });
    await register({ body: {} });
    const limited = await register();
    expect(limited.response.status).toBe(429);
    expect(limited.response.headers.get('retry-after')).toBe('1');
    expect(repositories.userRows.size).toBe(0);
    time += 1000;
    expect((await register()).response.status).toBe(200);
  });

  it('no publica errores de almacenamiento ni crea una sesión ante credenciales corruptas', async () => {
    await listen();
    const registered = await register();
    vi.spyOn(repositories.sessions, 'findSessionByTokenHash').mockRejectedValue(new Error('DATABASE_SECRET'));
    const result = await call('/api/auth/me', { cookie: registered.cookie });
    expect(result.response.status).toBe(500);
    expect(JSON.stringify(result.data)).not.toContain('DATABASE_SECRET');
    const row = [...repositories.userRows.values()][0];
    row.passwordHash = 'scrypt$999999999$8$3$malicious';
    const login = await call('/api/auth/login', {
      method: 'POST', body: { username: 'alice', password: credentials.password },
    });
    expect(login.response.status).toBe(401);
    expect(repositories.sessionRows.size).toBe(1);
  });

  it('no activa almacenamiento en memoria cuando faltan repositorios de producción', async () => {
    await listen({ authService: null });
    const result = await register();
    expect(result.response.status).toBe(503);
    expect(result.data.error.code).toBe('AUTH_NOT_READY');
    expect(repositories.userRows.size).toBe(0);
    const health = await call('/api/health');
    expect(health.data.data.authentication).toBe('pending');
    expect(health.data.data.protocolVersion).toBe(3);
  });
});
