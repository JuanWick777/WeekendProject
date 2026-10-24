import { createHash, randomBytes } from 'node:crypto';
import { loginSchema, registerSchema } from '@cybergrid/shared/schemas';
import { AuthError } from './auth-error.js';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './passwords.js';
import { isSessionToken, SESSION_TTL_MS } from './session.js';

function publicUser(user) {
  return { id: user.id, username: user.username, displayName: user.displayName };
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createAuthService({ users, sessions, now = Date.now }) {
  for (const method of ['createUser', 'findUserByUsername', 'findUserById']) {
    if (typeof users?.[method] !== 'function') throw new TypeError('Falta users.' + method);
  }
  for (const method of ['createSession', 'findSessionByTokenHash', 'deleteSessionByTokenHash']) {
    if (typeof sessions?.[method] !== 'function') throw new TypeError('Falta sessions.' + method);
  }

  async function startSession(user, previousToken) {
    const sessionToken = randomBytes(32).toString('base64url');
    const expiresAtMs = now() + SESSION_TTL_MS;
    await sessions.createSession({ userId: user.id, tokenHash: tokenHash(sessionToken), expiresAtMs });
    if (isSessionToken(previousToken)) {
      try {
        await sessions.deleteSessionByTokenHash(tokenHash(previousToken));
      } catch (error) {
        // Do not leave the replacement session active if rotation failed.
        await sessions.deleteSessionByTokenHash(tokenHash(sessionToken)).catch(() => {});
        throw error;
      }
    }
    return { user: publicUser(user), sessionToken, expiresAtMs };
  }

  return Object.freeze({
    async register(payload, previousToken) {
      const { username, displayName, password } = registerSchema.parse(payload);
      if (await users.findUserByUsername(username)) {
        throw new AuthError(409, 'USERNAME_TAKEN', 'Ese nombre de usuario ya está registrado.');
      }
      const passwordHash = await hashPassword(password);
      let user;
      try {
        user = await users.createUser({ username, displayName, passwordHash });
      } catch (error) {
        if (error.code === 'USERNAME_TAKEN') {
          throw new AuthError(409, 'USERNAME_TAKEN', 'Ese nombre de usuario ya está registrado.');
        }
        throw error;
      }
      return startSession(user, previousToken);
    },

    async login(payload, previousToken) {
      const { username, password } = loginSchema.parse(payload);
      const user = await users.findUserByUsername(username);
      const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
      if (!user || !valid) {
        throw new AuthError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');
      }
      return startSession(user, previousToken);
    },

    async authenticateSession(sessionToken) {
      if (!isSessionToken(sessionToken)) return null;
      const session = await sessions.findSessionByTokenHash(tokenHash(sessionToken));
      if (!session || !Number.isFinite(session.expiresAtMs) || session.expiresAtMs <= now()) {
        return null;
      }
      return publicUser(session.user);
    },

    async logout(sessionToken) {
      if (isSessionToken(sessionToken)) await sessions.deleteSessionByTokenHash(tokenHash(sessionToken));
    },
  });
}
