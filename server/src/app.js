import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ZodError } from 'zod';
import { API_ROUTES, PROTOCOL_VERSION } from '@cybergrid/shared/protocol';
import { AuthError } from './auth/auth-error.js';
import { createAuthRouter } from './auth/routes.js';

const defaultClientDist = fileURLToPath(new URL('../../client/dist/', import.meta.url));

export function createApp({
  clientDist = defaultClientDist,
  authService = null,
  appOrigin = 'http://127.0.0.1:5173',
  nodeEnv = 'development',
  getRoomCode,
  authRateLimit,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '128kb' }));

  app.get(API_ROUTES.HEALTH, (_request, response) => {
    response.json({
      ok: true,
      data: {
        service: 'cybergrid-server',
        stage: 'bootstrap',
        protocolVersion: PROTOCOL_VERSION,
        authentication: authService ? 'ready' : 'pending',
        websocket: 'pending',
        database: 'pending',
      },
    });
  });

  app.use('/api/auth', createAuthRouter({
    authService, appOrigin, nodeEnv, getRoomCode, rateLimit: authRateLimit,
  }));

  app.use('/api', (_request, response) => {
    response.status(404).json({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Esta ruta aún no está implementada.' },
    });
  });

  if (existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist));
    app.get('/', (_request, response) => response.sendFile(path.join(clientDist, 'index.html')));
  } else {
    app.get('/', (_request, response) => {
      response.type('text').send('Cliente pendiente de build. Usa npm run dev o npm run build.');
    });
  }

  app.use((error, _request, response, _next) => {
    if (error instanceof AuthError || error instanceof ZodError) {
      return response.status(error instanceof AuthError ? error.status : 400).json({
        ok: false,
        error: {
          code: error instanceof AuthError ? error.code : 'VALIDATION_ERROR',
          message: error instanceof AuthError ? error.message : 'Revisa los campos de la solicitud.',
        },
      });
    }
    const invalidJson = error.type === 'entity.parse.failed';
    const tooLarge = error.type === 'entity.too.large';
    response.status(invalidJson ? 400 : tooLarge ? 413 : 500).json({
      ok: false,
      error: {
        code: invalidJson ? 'INVALID_JSON' : tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR',
        message: invalidJson
          ? 'El cuerpo debe ser JSON válido.'
          : tooLarge
            ? 'El cuerpo supera el tamaño permitido.'
            : 'No se pudo completar la petición.',
      },
    });
  });

  return app;
}
