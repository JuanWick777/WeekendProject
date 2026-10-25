import { pool } from './pool.js';

export async function createUser({ username, displayName, passwordHash }) {
  const query = `
    INSERT INTO users (username, display_name, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, display_name AS "displayName", created_at AS "createdAt";
  `;
  const { rows } = await pool.query(query, [username, displayName, passwordHash]);
  return rows[0];
}

export async function findUserByUsername(username) {
  const query = `
    SELECT id, username, display_name AS "displayName", password_hash AS "passwordHash", created_at AS "createdAt"
    FROM users
    WHERE LOWER(username) = LOWER($1);
  `;
  const { rows } = await pool.query(query, [username]);
  return rows[0] || null;
}

export async function findUserById(id) {
  const query = `
    SELECT id, username, display_name AS "displayName", created_at AS "createdAt"
    FROM users
    WHERE id = $1;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}