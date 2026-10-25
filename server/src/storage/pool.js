import pg from 'pg';

const isTest = process.env.NODE_ENV === 'test';
const connectionString = isTest
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

if (!connectionString) {
  const missingVar = isTest ? 'TEST_DATABASE_URL' : 'DATABASE_URL';
  throw new Error(`[Storage Config Error] Falta la variable de entorno obligatoria: ${missingVar}. Revisa tu archivo .env`);
}

export const pool = new pg.Pool({
  connectionString,
});