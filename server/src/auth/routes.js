import { Router } from 'express';
import { createAuthRateLimit } from './rate-limit.js';
import { requireAllowedOrigin, requireAuthReady, requireSession } from './middleware.js';
import { readSessionToken, SESSION_COOKIE, sessionCookieOptions } from './session.js';

export function createAuthRouter({
  authService, appOrigin, nodeEnv, getRoomCode = () => null, rateLimit,
  onSessionInvalidated = () => {},
}) {
  const router = Router();
  const cookieOptions = sessionCookieOptions(nodeEnv);
  const allowedOrigin = requireAllowedOrigin(appOrigin);
  const limitAttempts = createAuthRateLimit(rateLimit);

  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuthReady(authService));

  for (const action of ['register', 'login']) {
    router.post('/' + action, allowedOrigin, limitAttempts, async (request, response) => {
      const previousToken = readSessionToken(request.headers.cookie);
      const result = await authService[action](request.body, previousToken);
      if (previousToken) onSessionInvalidated(previousToken);
      response.cookie(SESSION_COOKIE, result.sessionToken, {
        ...cookieOptions, expires: new Date(result.expiresAtMs),
      });
      response.json({ ok: true, data: { user: result.user } });
    });
  }

  router.get('/me', requireSession(authService), async (request, response) => {
    response.json({ ok: true, data: { user: request.user, roomCode: await getRoomCode(request.user.id) } });
  });

  router.post('/logout', allowedOrigin, async (request, response) => {
    const token = readSessionToken(request.headers.cookie);
    await authService.logout(token);
    if (token) onSessionInvalidated(token);
    response.clearCookie(SESSION_COOKIE, cookieOptions);
    response.json({ ok: true, data: { loggedOut: true } });
  });
  return router;
}
