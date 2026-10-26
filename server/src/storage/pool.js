import pg from 'pg';

const testing = process.env.NODE_ENV === 'test';
const connectionString = testing ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
if (!connectionString) throw new Error(testing ? 'Falta TEST_DATABASE_URL.' : 'Falta DATABASE_URL.');
const schema = testing ? process.env.TEST_DATABASE_SCHEMA : null;
if (schema && !/^cg_test_[a-f0-9]+$/.test(schema)) throw new Error('TEST_DATABASE_SCHEMA inválido.');
const settings = [
  ...(schema ? ['search_path=' + schema + ',public'] : []),
  ...(testing ? ['statement_timeout=20000','lock_timeout=10000','idle_in_transaction_session_timeout=20000'] : []),
];
export const pool = new pg.Pool({
  connectionString,
  max: 5,
  connectionTimeoutMillis: 5000,
  ...(settings.length ? { options: settings.map((s) => '-c ' + s).join(' ') } : {}),
  ...(testing ? { query_timeout: 25000, application_name: 'cybergrid-storage-tests' } : {}),
});