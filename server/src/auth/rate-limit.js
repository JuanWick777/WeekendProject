import { AuthError } from './auth-error.js';

export function createAuthRateLimit({ maxAttempts = 20, windowMs = 60_000, now = Date.now } = {}) {
  const windows = new Map();
  const maxEntries = 10_000;

  return (request, response, next) => {
    const time = now();
    const key = request.ip;
    let entry = windows.get(key);
    if (!entry || entry.resetAtMs <= time) {
      if (!entry && windows.size >= maxEntries) {
        for (const [ip, value] of windows) {
          if (value.resetAtMs <= time) windows.delete(ip);
        }
        if (windows.size >= maxEntries) {
          response.set('Retry-After', String(Math.ceil(windowMs / 1000)));
          throw new AuthError(429, 'AUTH_RATE_LIMITED', 'Intenta iniciar sesión más tarde.');
        }
      }
      entry = { attempts: 0, resetAtMs: time + windowMs };
      windows.set(key, entry);
    }
    entry.attempts += 1;
    if (entry.attempts > maxAttempts) {
      response.set('Retry-After', String(Math.ceil((entry.resetAtMs - time) / 1000)));
      throw new AuthError(429, 'AUTH_RATE_LIMITED', 'Demasiados intentos. Espera antes de reintentar.');
    }
    next();
  };
}
