import { pool } from './pool.js';

export async function createSession({ userId, tokenHash, expiresAtMs }) {
  const query = `
    INSERT INTO sessions (user_id, token_hash, expires_at_ms)
    VALUES ($1, $2, $3)
    RETURNING id, user_id AS "userId", token_hash AS "tokenHash", expires_at_ms AS "expiresAtMs", created_at AS "createdAt";
  `;
  const res = await pool.query(query, [userId, tokenHash, expiresAtMs]);
  const row = res.rows[0];
  const expiresNum = Number(row.expiresAtMs);
  return {
    ...row,
    expiresAtMs: Number.isFinite(expiresNum) ? expiresNum : row.expiresAtMs,
  };
}

export async function findSessionByTokenHash(tokenHash) {
  const query = `
    SELECT 
      s.expires_at_ms AS "expiresAtMs",
      u.id AS "userId",
      u.username AS "username",
      u.display_name AS "displayName"
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = $1;
  `;
  const res = await pool.query(query, [tokenHash]);
  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  const expiresAtMs = Number(row.expiresAtMs);

  if (!Number.isFinite(expiresAtMs)) {
    throw new Error('Valor inválido o no finito para expiresAtMs en la base de datos.');
  }

  return {
    user: {
      id: row.userId,
      username: row.username,
      displayName: row.displayName,
    },
    expiresAtMs,
  };
}

export async function deleteSessionByTokenHash(tokenHash) {
  const query = `DELETE FROM sessions WHERE token_hash = $1;`;
  await pool.query(query, [tokenHash]);
}