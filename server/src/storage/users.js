import { pool } from './pool.js';

export async function createUser({ username, displayName, passwordHash }) {
  const query = `
    INSERT INTO users (username, display_name, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, display_name AS "displayName", created_at AS "createdAt";
  `;
  try {
    const res = await pool.query(query, [username, displayName, passwordHash]);
    return res.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const customErr = new Error('El nombre de usuario ya está registrado.');
      customErr.code = 'USERNAME_TAKEN';
      throw customErr;
    }
    throw err;
  }
}

export async function findUserByUsername(username) {
  const query = `
    SELECT id, username, display_name AS "displayName", password_hash AS "passwordHash", created_at AS "createdAt"
    FROM users
    WHERE username = $1;
  `;
  const res = await pool.query(query, [username]);
  return res.rows[0] || null;
}

export async function findUserById(id) {
  const query = `
    SELECT id, username, display_name AS "displayName", password_hash AS "passwordHash", created_at AS "createdAt"
    FROM users
    WHERE id = $1;
  `;
  const res = await pool.query(query, [id]);
  return res.rows[0] || null;
}