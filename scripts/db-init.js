import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../server/src/storage/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log('⏳ Inicializando esquema DDL y aplicando migraciones...');

  try {
    // 1. Leer el archivo schema.sql
    const schemaPath = path.join(__dirname, '../server/src/storage/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // 2. Ejecutar DDL e instrucciones ALTER TABLE
    await pool.query(sql);

    console.log('✅ Esquema DDL y migraciones (NUMERIC(16,3)) aplicados correctamente en Supabase.');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDatabase();