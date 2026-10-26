import pg from 'pg';

const isTestEnv = process.env.NODE_ENV === 'test';

if (isTestEnv && !process.env.TEST_DATABASE_URL) {
  console.error("ERROR FATAL: NODE_ENV está configurado en 'test' pero falta la variable TEST_DATABASE_URL.");
  process.exit(1);
}

const connectionString = isTestEnv 
  ? process.env.TEST_DATABASE_URL 
  : process.env.DATABASE_URL;

export const pool = new pg.Pool({
  connectionString,
});