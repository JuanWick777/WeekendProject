export const SESSION_COOKIE = 'cg_session';
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function isSessionToken(value) {
  return typeof value === 'string' && tokenPattern.test(value);
}

export function readSessionToken(cookieHeader) {
  if (typeof cookieHeader !== 'string') return null;
  const values = cookieHeader.split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(SESSION_COOKIE + '='));
  if (values.length !== 1) return null;
  const value = values[0].slice(SESSION_COOKIE.length + 1);
  return isSessionToken(value) ? value : null;
}

export function sessionCookieOptions(nodeEnv) {
  return { httpOnly: true, sameSite: 'lax', secure: nodeEnv === 'production', path: '/' };
}
