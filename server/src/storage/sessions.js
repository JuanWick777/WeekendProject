import { pool } from './pool.js';

export async function createSession({ userId, tokenHash, expiresAtMs }) {
  const query = `
    INSERT INTO sessions (user_id, token_hash, expires_at_ms)
    VALUES ($1, $2, $3)
    RETURNING id, user_id AS "userId", token_hash AS "tokenHash", expires_at_ms AS "expiresAtMs", created_at AS "createdAt";
  `;
  const { rows } = await pool.query(query, [userId, tokenHash, expiresAtMs]);
  return rows[0];
}

export async function findSessionByTokenHash(tokenHash) {
  const query = `
    SELECT id, user_id AS "userId", token_hash AS "tokenHash", expires_at_ms AS "expiresAtMs", created_at AS "createdAt"
    FROM sessions
    WHERE token_hash = $1;
  `;
  const { rows } = await pool.query(query, [tokenHash]);
  return rows[0] || null;
}

export async function deleteSessionByTokenHash(tokenHash) {
  const query = `
    DELETE FROM sessions
    WHERE token_hash = $1;
  `;
  await pool.query(query, [tokenHash]);
}