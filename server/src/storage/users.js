import crypto from 'crypto';
import { pool } from './pool.js';

export async function createUser(userData) {
  const {
    id = crypto.randomUUID(),
    username,
    displayName,
    passwordHash,
    password_hash
  } = userData;

  const finalHash = passwordHash || password_hash;

  if (!username) {
    throw new Error('INVALID_USER_DATA: username es requerido');
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (id, username, display_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, display_name AS "displayName", created_at AS "createdAt";`,
      [id, username, displayName, finalHash]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const customError = new Error('USERNAME_TAKEN: El nombre de usuario ya existe');
      customError.code = 'USERNAME_TAKEN';
      throw customError;
    }
    throw err;
  }
}