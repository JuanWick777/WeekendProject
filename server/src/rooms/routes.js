import { Router } from 'express';
import { z } from 'zod';
import { createRoomSchema, readySchema, roomCodeSchema } from '@cybergrid/shared/schemas';
import { requireAllowedOrigin, requireSession } from '../auth/middleware.js';

export function createRoomRouter({ authService, roomManager, appOrigin }) {
  const router = Router();
  const emptyBody = z.strictObject({}).optional();
  router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
  router.use(requireSession(authService));
  router.use((request, response, next) => {
    if (['GET', 'HEAD'].includes(request.method)) return next();
    return requireAllowedOrigin(appOrigin)(request, response, next);
  });
  router.param('code', (request, _response, next, code) => {
    request.roomCode = roomCodeSchema.parse(code);
    next();
  });
  router.post('/', (request, response) => {
    const room = roomManager.create(request.user, createRoomSchema.parse(request.body));
    response.json({ ok: true, data: room });
  });
  router.get('/:code', (request, response) => {
    response.json({ ok: true, data: roomManager.getRoom(request.roomCode, request.user.id) });
  });
  router.post('/:code/join', (request, response) => {
    emptyBody.parse(request.body);
    response.json({ ok: true, data: roomManager.join(request.user, request.roomCode) });
  });
  router.post('/:code/leave', (request, response) => {
    emptyBody.parse(request.body);
    roomManager.leave(request.user.id, request.roomCode);
    response.json({ ok: true, data: { left: true } });
  });
  router.patch('/:code/ready', (request, response) => {
    const { ready } = readySchema.parse(request.body);
    response.json({ ok: true, data: roomManager.setReady(request.user.id, request.roomCode, ready) });
  });
  for (const action of ['start', 'rematch']) {
    router.post('/:code/' + action, (request, response) => {
      emptyBody.parse(request.body);
      response.json({ ok: true, data: roomManager[action](request.user.id, request.roomCode) });
    });
  }
  return router;
}
