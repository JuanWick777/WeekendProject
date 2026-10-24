import { randomUUID } from 'node:crypto';

// Test double only. Runtime authentication must use C's PostgreSQL repositories.
export function createTestAuthRepositories() {
  const userRows = new Map();
  const sessionRows = new Map();
  const users = {
    async createUser({ username, displayName, passwordHash }) {
      if ([...userRows.values()].some((user) => user.username === username)) {
        throw Object.assign(new Error('Duplicate username'), { code: 'USERNAME_TAKEN' });
      }
      const user = { id: randomUUID(), username, displayName, passwordHash };
      userRows.set(user.id, user);
      return structuredClone(user);
    },
    async findUserByUsername(username) {
      return structuredClone([...userRows.values()].find((user) => user.username === username) ?? null);
    },
    async findUserById(id) {
      return structuredClone(userRows.get(id) ?? null);
    },
  };
  const sessions = {
    async createSession(session) {
      sessionRows.set(session.tokenHash, structuredClone(session));
    },
    async findSessionByTokenHash(tokenHash) {
      const session = sessionRows.get(tokenHash);
      const user = session && userRows.get(session.userId);
      return user ? { user: structuredClone(user), expiresAtMs: session.expiresAtMs } : null;
    },
    async deleteSessionByTokenHash(tokenHash) {
      sessionRows.delete(tokenHash);
    },
  };
  return { users, sessions, userRows, sessionRows };
}
