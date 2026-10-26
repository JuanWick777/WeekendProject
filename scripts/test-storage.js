import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../server/src/storage/pool.js';
import { createUser } from '../server/src/storage/users.js';
import { findSessionByTokenHash, deleteSessionByTokenHash } from '../server/src/storage/sessions.js';
import { saveMatch } from '../server/src/storage/matches.js';
import { processSeedBatch } from '../server/src/storage/seedService.js';
import { getTelemetry } from '../server/src/telemetry/telemetryService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runStorageTests() {
  console.log("🧪 Ejecutando pruebas en entorno de TEST con TEST_DATABASE_URL...");

  if (process.env.NODE_ENV !== 'test') {
    console.error("❌ ERROR FATAL: El script debe ejecutarse obligatoriamente con NODE_ENV=test");
    process.exit(1);
  }

  // Recreación limpia del esquema con valores por defecto para UUIDs
  await pool.query(`
    DROP TABLE IF EXISTS player_matches CASCADE;
    DROP TABLE IF EXISTS matches CASCADE;
    DROP TABLE IF EXISTS sessions CASCADE;
    DROP TABLE IF EXISTS seed_batches CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE TABLE users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE sessions (
      id SERIAL PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at_ms BIGINT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE matches (
      id TEXT PRIMARY KEY,
      room_code TEXT,
      mode TEXT,
      seed BIGINT,
      template_id TEXT,
      template_version INT,
      generator_version INT,
      status TEXT NOT NULL DEFAULT 'completed',
      finish_reason TEXT DEFAULT 'time',
      draw_player_ids TEXT[] DEFAULT '{}',
      started_at_ms BIGINT,
      ended_at_ms BIGINT,
      duration_ms BIGINT,
      source TEXT DEFAULT 'live',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE player_matches (
      match_id TEXT REFERENCES matches(id) ON DELETE CASCADE,
      player_id TEXT,
      score INT DEFAULT 0,
      kills INT DEFAULT 0,
      deaths INT DEFAULT 0,
      control_time_ms BIGINT DEFAULT 0,
      alive_ms BIGINT DEFAULT 0,
      participated_ms BIGINT DEFAULT 0,
      winner BOOLEAN DEFAULT FALSE,
      draw BOOLEAN DEFAULT FALSE,
      abandonment BOOLEAN DEFAULT FALSE,
      PRIMARY KEY (match_id, player_id)
    );

    CREATE TABLE seed_batches (
      batch_id TEXT PRIMARY KEY,
      seed BIGINT NOT NULL,
      match_count INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Tablas recreadas e inicializadas correctamente en la base de datos de pruebas.");

  const testUserUsername = `user_${Date.now()}`;
  const testMatchId = `test_match_${Date.now()}`;
  const testBatchId = `batch_test_${Date.now()}`;
  let createdUserId = null;

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Creación de Usuario y Manejo de Duplicados
    // -------------------------------------------------------------
    const user = await createUser({
      username: testUserUsername,
      displayName: 'Test User',
      password: 'SecurePassword123!',
      passwordHash: '$2b$10$mockPasswordHashForTestingOnly123456',
      password_hash: '$2b$10$mockPasswordHashForTestingOnly123456'
    });

    createdUserId = user.id;
    console.log("✅ createUser:", user);

    try {
      await createUser({
        username: testUserUsername,
        displayName: 'Test User Duplicate',
        password: 'SecurePassword123!',
        passwordHash: '$2b$10$mockPasswordHashForTestingOnly123456'
      });
      throw new Error("Se esperaba fallo por USERNAME_TAKEN y no ocurrió.");
    } catch (err) {
      if (err.code === 'USERNAME_TAKEN' || err.message.includes('USERNAME_TAKEN')) {
        console.log("✅ Duplicado traducido correctamente a code: USERNAME_TAKEN");
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // PRUEBA 2: Sesiones y Token Hash
    // -------------------------------------------------------------
    const mockTokenHash = `hash_${Date.now()}`;
    const expiresAtMs = Date.now() + 3600000;

    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at_ms) VALUES ($1, $2, $3)`,
      [createdUserId, mockTokenHash, expiresAtMs]
    );

    const sessionRes = await findSessionByTokenHash(mockTokenHash);
    console.log("✅ findSessionByTokenHash resultado:", sessionRes);

    if (!sessionRes || !sessionRes.user || sessionRes.user.id !== createdUserId) {
      throw new Error("Estructura de sesión inválida o no coincide el usuario.");
    }
    console.log("✅ Estructura { user: { id, username, displayName }, expiresAtMs } y conversión de BIGINT verificadas.");

    await deleteSessionByTokenHash(mockTokenHash);
    console.log("✅ deleteSessionByTokenHash: OK");

    // -------------------------------------------------------------
    // PRUEBA 3: Persistencia de Partida Directa (saveMatch)
    // -------------------------------------------------------------
    const startedAtMs = Date.now();
    const durationMs = 30000;
    const endedAtMs = startedAtMs + durationMs;

    const matchResult = {
      matchId: testMatchId,
      roomCode: 'TEST_ROOM',
      mode: 'rotating_control',
      templateId: 'template-4',
      templateVersion: 1,
      generatorVersion: 2,
      status: 'completed',
      finishReason: 'time',
      drawPlayerIds: [],
      startedAtMs,
      endedAtMs,
      durationMs,
      players: [
        {
          playerId: createdUserId,
          kills: 5,
          deaths: 2,
          controlTimeMs: 15000,
          aliveMs: 25000,
          participatedMs: 30000,
          winner: true,
          draw: false,
          abandonment: false
        }
      ]
    };

    const saveRes = await saveMatch(matchResult, { source: 'live' });
    if (!saveRes.inserted) {
      throw new Error("No se pudo insertar la partida de prueba.");
    }
    console.log("✅ saveMatch insertado correctamente con metadatos de arena.");

    // -------------------------------------------------------------
    // PRUEBA 4: Siembra Atómica y Semilla 0 (processSeedBatch)
    // -------------------------------------------------------------
    const seedResult = await processSeedBatch({
      seed: 0,
      batchId: testBatchId
    });

    if (seedResult.status !== 'success' || seedResult.insertedMatches === 0) {
      throw new Error("Fallo en la siembra sintética atómica.");
    }
    console.log("✅ processSeedBatch completado con Semilla 0 y usuarios sintéticos pre-insertados.");

    // -------------------------------------------------------------
    // PRUEBA 5: Telemetría según Contrato
    // -------------------------------------------------------------
    const telemetry = await getTelemetry({ source: 'all' });
    if (!telemetry.overall || typeof telemetry.overall.winRate !== 'number' || !Array.isArray(telemetry.players)) {
      throw new Error("Estructura de telemetría fuera de contrato.");
    }
    console.log("✅ getTelemetry verificado con contrato { source, matches, playerResults, overall, players }.");

    // -------------------------------------------------------------
    // LIMPIEZA
    // -------------------------------------------------------------
    await pool.query('DELETE FROM player_matches WHERE match_id = $1', [testMatchId]);
    await pool.query('DELETE FROM matches WHERE id = $1', [testMatchId]);
    await pool.query('DELETE FROM users WHERE id = $1', [createdUserId]);
    
    await pool.query('DELETE FROM player_matches WHERE match_id IN (SELECT id FROM matches WHERE source = \'seed\')');
    await pool.query('DELETE FROM matches WHERE source = \'seed\'');
    await pool.query('DELETE FROM seed_batches WHERE batch_id = $1', [testBatchId]);
    await pool.query('DELETE FROM users WHERE password_hash = \'SYNTHETIC_NO_LOGIN\'');

    console.log("🧹 Limpieza finalizada.");
    process.exit(0);

  } catch (error) {
    console.error("❌ FALLO EN LAS PRUEBAS DE STORAGE:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runStorageTests();