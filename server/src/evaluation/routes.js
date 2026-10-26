import { Router } from 'express';
import { seedSchema, telemetryQuerySchema } from '@cybergrid/shared/schemas';
import { createEvaluationRateLimit } from './rate-limit.js';

export function createEvaluationRouter({ evaluationService, rateLimit = {} } = {}) {
  const router = Router();
  let activeSeeds = 0;
  const seedLimit = createEvaluationRateLimit({ maxRequests: 6, ...rateLimit.seed });
  const telemetryLimit = createEvaluationRateLimit({ maxRequests: 60, ...rateLimit.telemetry });
  const ready = (request, response, next) => {
    if (!evaluationService?.processSeedBatch || !evaluationService?.getTelemetry) {
      return response.status(503).json({
        ok: false,
        error: { code: 'EVALUATION_NOT_READY', message: 'El almacenamiento de evaluación no está disponible.' },
      });
    }
    next();
  };
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/telemetry', ready, (request, _response, next) => {
    request.evaluationQuery = telemetryQuerySchema.parse(request.query);
    next();
  }, telemetryLimit, async (request, response) => {
    const started = performance.now();
    const data = await evaluationService.getTelemetry(request.evaluationQuery);
    response.set('Server-Timing', 'telemetry;dur=' + (performance.now() - started).toFixed(2));
    response.json({ ok: true, data });
  });

  router.post('/seed', ready, (request, response, next) => {
    if (request.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return response.status(415).json({
        ok: false,
        error: { code: 'JSON_REQUIRED', message: 'Usa Content-Type: application/json.' },
      });
    }
    request.evaluationBatch = seedSchema.parse(request.body);
    next();
  }, seedLimit, async (request, response) => {
    if (activeSeeds >= 2) {
      response.set('Retry-After', '1');
      return response.status(503).json({
        ok: false,
        error: { code: 'SEED_BUSY', message: 'El servicio de siembra está ocupado. Reintenta en un momento.' },
      });
    }
    activeSeeds++;
    const started = performance.now();
    try {
      const data = await evaluationService.processSeedBatch(request.evaluationBatch);
      response.set('Server-Timing', 'seed;dur=' + (performance.now() - started).toFixed(2));
      response.json({ ok: true, data });
    } finally { activeSeeds--; }
  });
  return router;
}
