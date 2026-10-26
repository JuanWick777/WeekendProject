export function createEvaluationRateLimit({
  maxRequests, windowMs = 60_000, now = Date.now, maxEntries = 1000,
}) {
  const windows = new Map();
  return (request, response, next) => {
    const time = now();
    const key = request.ip;
    let entry = windows.get(key);
    if (!entry || entry.resetAt <= time) {
      if (!entry && windows.size >= maxEntries) {
        for (const [ip, value] of windows) if (value.resetAt <= time) windows.delete(ip);
        if (windows.size >= maxEntries) return reject(response, windowMs);
      }
      entry = { count: 0, resetAt: time + windowMs };
      windows.set(key, entry);
    }
    if (entry.count >= maxRequests) return reject(response, entry.resetAt - time);
    entry.count++;
    next();
  };
}

function reject(response, remainingMs) {
  response.set('Retry-After', String(Math.max(1, Math.ceil(remainingMs / 1000))));
  return response.status(429).json({
    ok: false,
    error: { code: 'EVALUATION_RATE_LIMITED', message: 'Demasiadas solicitudes. Espera antes de reintentar.' },
  });
}
