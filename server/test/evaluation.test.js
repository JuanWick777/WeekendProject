import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

let server, baseUrl, service;
const batch = (id = 'sample-batch') => ({ seed: 42, matches: 100, batchId: id });
const result = input => ({ batchId: input.batchId, insertedMatches: input.matches, alreadyExists: false });
beforeEach(() => {
  service = {
    processSeedBatch: vi.fn(async input => result(input)),
    getTelemetry: vi.fn(async ({ source }) => ({ source, matches: 0, playerResults: 0, overall: {}, players: [] })),
  };
});
afterEach(async () => {
  if (server?.listening) {
    server.closeIdleConnections();
    await new Promise(resolve => server.close(resolve));
  }
  server = null;
});
async function start(options = {}) {
  server = createServer(createApp({ evaluationService: service, ...options }));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  baseUrl = 'http://127.0.0.1:' + server.address().port;
}
function seed(input = batch(), headers = {}) {
  return fetch(baseUrl + '/api/test/seed', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(input),
  });
}
const telemetry = query => fetch(baseUrl + '/api/test/telemetry' + (query ?? ''));

describe('frontera HTTP de evaluación', { timeout: 10000 }, () => {
  it('comunica servicios ausentes sin inventar datos', async () => {
    await start({ evaluationService: null });
    for (const response of [await seed(), await telemetry()]) {
      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe('EVALUATION_NOT_READY');
    }
    expect(service.processSeedBatch).not.toHaveBeenCalled();
  });

  it('rechaza semillas, cantidades, identificadores y campos inválidos antes de llamar al repositorio', async () => {
    await start();
    for (const input of [
      null, [], {}, { ...batch(), seed: -1 }, { ...batch(), seed: 2 ** 32 },
      { ...batch(), seed: '42' }, { ...batch(), matches: 99 }, { ...batch(), matches: 1001 },
      { ...batch(), matches: 100.5 }, { ...batch(), batchId: 'bad space' },
      { ...batch(), batchId: 'a'.repeat(65) }, { ...batch(), source: 'live' },
    ]) {
      const response = await seed(input);
      expect(response.status).toBe(400);
      expect(['VALIDATION_ERROR', 'INVALID_JSON']).toContain((await response.json()).error.code);
    }
    expect(service.processSeedBatch).not.toHaveBeenCalled();
  });

  it('rechaza filtros desconocidos, repetidos y parámetros adicionales', async () => {
    await start();
    for (const query of ['?source=invalid', '?source=live&source=seed', '?source[]=live', '?source=live&extra=1']) {
      const response = await telemetry(query);
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    }
    expect(service.getTelemetry).not.toHaveBeenCalled();
  });

  it('aplica JSON obligatorio, límite de 2 KB y errores estructurados de parseo', async () => {
    await start();
    const malformed = await fetch(baseUrl + '/api/test/seed', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"seed":' });
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe('INVALID_JSON');
    const empty = await fetch(baseUrl + '/api/test/seed', { method: 'POST', headers: { 'content-type': 'application/json' } });
    expect(empty.status).toBe(400);
    const charset = await fetch(baseUrl + '/api/test/seed', { method: 'POST', headers: { 'content-type': 'application/json; charset=iso-8859-1' }, body: JSON.stringify(batch()) });
    expect(charset.status).toBe(415);
    expect((await charset.json()).error.code).toBe('UNSUPPORTED_JSON_ENCODING');
    const large = await seed({ ...batch(), extra: 'x'.repeat(3000) });
    expect(large.status).toBe(413);
    expect((await large.json()).error.code).toBe('PAYLOAD_TOO_LARGE');
    const unsupported = await fetch(baseUrl + '/api/test/seed', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(batch()) });
    expect(unsupported.status).toBe(415);
    expect((await unsupported.json()).error.code).toBe('JSON_REQUIRED');
    expect(service.processSeedBatch).not.toHaveBeenCalled();
  });

  it('limita ambas rutas por separado, ignora IP reenviada sin confianza y recupera la ventana', async () => {
    let time = 0;
    const now = () => time;
    await start({ evaluationRateLimit: { seed: { maxRequests: 1, now }, telemetry: { maxRequests: 2, now } } });
    expect((await seed()).status).toBe(200);
    const denied = await seed(batch('next-batch'), { 'x-forwarded-for': '203.0.113.9' });
    expect(denied.status).toBe(429);
    expect(denied.headers.get('retry-after')).toBe('60');
    expect((await denied.json()).error.code).toBe('EVALUATION_RATE_LIMITED');
    expect((await telemetry()).status).toBe(200);
    expect((await telemetry()).status).toBe(200);
    expect((await telemetry()).status).toBe(429);
    time = 60001;
    expect((await seed(batch('after-reset'))).status).toBe(200);
    expect((await telemetry()).status).toBe(200);
  });

  it('admite dos siembras, rechaza sobrecarga y libera capacidad después de confirmar', async () => {
    const pending = [];
    const requests = [];
    service.processSeedBatch.mockImplementation(input => new Promise(resolve => pending.push(() => resolve(result(input)))));
    await start();
    try {
      requests.push(seed(batch('first-batch')), seed(batch('second-batch')));
      await vi.waitFor(() => expect(service.processSeedBatch).toHaveBeenCalledTimes(2));
      const busy = await seed(batch('third-batch'));
      expect(busy.status).toBe(503);
      expect(busy.headers.get('retry-after')).toBe('1');
      expect((await busy.json()).error.code).toBe('SEED_BUSY');
      for (const resolve of pending.splice(0)) resolve();
      expect((await Promise.all(requests)).every(response => response.status === 200)).toBe(true);
      service.processSeedBatch.mockImplementation(async input => result(input));
      expect((await seed(batch('fourth-batch'))).status).toBe(200);
    } finally {
      for (const resolve of pending) resolve();
      await Promise.allSettled(requests);
    }
  });

  it('oculta errores privados de SQL y recupera capacidad después de rechazos', async () => {
    const secret = 'PRIVATE_SQL_CONNECTION_DETAIL';
    service.processSeedBatch.mockRejectedValue(new Error(secret));
    service.getTelemetry.mockRejectedValue(new Error(secret));
    await start();
    for (const response of [await seed(), await seed(batch('second-fail')), await telemetry()]) {
      expect(response.status).toBe(500);
      const output = await response.text();
      expect(output).not.toContain(secret);
      expect(JSON.parse(output).error.code).toBe('INTERNAL_ERROR');
    }
    service.processSeedBatch.mockImplementation(async input => result(input));
    expect((await seed(batch('recovered-batch'))).status).toBe(200);
  });
});
