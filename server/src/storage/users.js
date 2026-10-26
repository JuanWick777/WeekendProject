import { pool } from './pool.js';

export async function createUser({
  username,
  displayName,
  passwordHash,
}) {
  try {
    const result = await pool.query(
      `INSERT INTO users (username, display_name, password_hash)
       VALUES ($1,$2,$3)
       RETURNING id, username, display_name AS "displayName"`,
      [username.trim().toLowerCase(), displayName, passwordHash],
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw Object.assign(new Error('El usuario ya existe.'), {
        code: 'USERNAME_TAKEN',
      });
    }

    throw error;
  }
}

export async function findUserByUsername(username) {
  const result = await pool.query(
    `SELECT id, username, display_name AS "displayName",
            password_hash AS "passwordHash"
     FROM users WHERE username=$1`,
    [username.trim().toLowerCase()],
  );

  return result.rows[0] ?? null;
}

export async function findUserById(id) {
  const result = await pool.query(
    `SELECT id, username, display_name AS "displayName"
     FROM users WHERE id=$1`,
    [id],
  );

  return result.rows[0] ?? null;
}