import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { AuthError } from './auth-error.js';

const deriveKey = promisify(scrypt);
const parameters = Object.freeze({ N: 32_768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
const prefix = 'scrypt$32768$8$3$';
const encodedPattern = /^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
let activeDerivations = 0;

// The same work is performed for a missing username, without a real account.
export const DUMMY_PASSWORD_HASH = prefix + '0'.repeat(32) + '$' + '0'.repeat(128);

async function derive(password, salt) {
  if (activeDerivations >= 2) {
    throw new AuthError(429, 'AUTH_BUSY', 'Hay varios accesos en curso. Intenta de nuevo.');
  }
  activeDerivations += 1;
  try {
    return await deriveKey(password, salt, 64, parameters);
  } finally {
    activeDerivations -= 1;
  }
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return prefix + salt.toString('hex') + '$' + key.toString('hex');
}

export async function verifyPassword(password, encoded) {
  const match = typeof encoded === 'string' ? encodedPattern.exec(encoded) : null;
  if (!match) return false;
  const actual = await derive(password, Buffer.from(match[1], 'hex'));
  return timingSafeEqual(actual, Buffer.from(match[2], 'hex'));
}
