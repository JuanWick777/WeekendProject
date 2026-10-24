import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let server;
let baseUrl;

beforeAll(async () => {
  server = createServer(createApp());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = 'http://127.0.0.1:' + server.address().port;
});

afterAll(async () => {
  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('frontera HTTP del bootstrap', () => {
  it('anuncia el protocolo v2 y el estado real de los servicios', async () => {
    const response = await fetch(baseUrl + '/api/health');
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      protocolVersion: 2, authentication: 'pending', websocket: 'pending', database: 'pending',
    });
  });

  it('no convierte una API de juego inexistente en una página HTML con HTTP 200', async () => {
    const response = await fetch(baseUrl + '/api/rooms/ABC123');
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('rechaza JSON mal formado con un error estructurado', async () => {
    const response = await fetch(baseUrl + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"username":',
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_JSON');
  });
});
