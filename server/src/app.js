import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { API_ROUTES, PROTOCOL_VERSION } from '@cybergrid/shared/protocol';

const defaultClientDist = fileURLToPath(new URL('../../client/dist/', import.meta.url));

export function createApp({ clientDist = defaultClientDist } = {}) {
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
        websocket: 'pending',
        database: 'pending',
      },
    });
  });

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
