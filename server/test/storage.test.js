import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { pool } from '../src/storage/pool.js';
import { createUser } from '../src/storage/users.js';
import { saveMatch } from '../src/storage/matches.js';
import { processSeedBatch } from '../src/storage/seedService.js';
import { getTelemetry } from '../src/telemetry/telemetryService.js';

describe('Capa de Infraestructura y Persistencia (Rol C)', () => {
  let testUser;

  beforeAll(async () => {
    // Recreación limpia del esquema
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
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM player_matches;');
    await pool.query('DELETE FROM matches;');
    await pool.query('DELETE FROM seed_batches;');
    await pool.query('DELETE FROM users;');

    testUser = await createUser({
      username: `user_test_${Date.now()}_${Math.random()}`,
      displayName: 'Test User',
      passwordHash: '$2b$10$mockHash'
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('1. Usuarios y Autenticación', () => {
    it('debe crear un usuario correctamente', async () => {
      expect(testUser).toBeDefined();
      expect(testUser.id).toBeDefined();
      expect(testUser.username).toContain('user_test_');
    });
  });

  describe('2. Persistencia Transaccional de Partidas (matches.js)', () => {
    it('debe guardar una partida correctamente e ignorar duplicados (idempotencia)', async () => {
      const matchId = `match_valid_${Date.now()}`;
      const validMatch = {
        matchId,
        roomCode: 'ROOM_1',
        mode: 'rotating_control',
        startedAtMs: 1000,
        endedAtMs: 31000,
        durationMs: 30000,
        status: 'completed',
        finishReason: 'time',
        players: [
          {
            playerId: testUser.id,
            kills: 5,
            deaths: 2,
            controlTimeMs: 15000,
            aliveMs: 25000,
            participatedMs: 30000,
            winner: true
          }
        ]
      };

      const res1 = await saveMatch(validMatch);
      expect(res1.inserted).toBe(true);

      const res2 = await saveMatch(validMatch);
      expect(res2.inserted).toBe(false);
    });

    it('debe rechazar la transacción si falla la coherencia temporal', async () => {
      const invalidMatch = {
        matchId: `match_invalid_${Date.now()}`,
        startedAtMs: 30000,
        endedAtMs: 1000, // Coherencia temporal inválida
        durationMs: 30000,
        players: []
      };

      await expect(saveMatch(invalidMatch)).rejects.toThrow('[Storage Error] Métricas incoherentes');
    });
  });

  describe('3. Servicio de Siembra (seedService.js)', () => {
    it('debe procesar un lote sintético e ignorar ejecuciones duplicadas', async () => {
      const batchId = `seed_batch_${Date.now()}`;
      const res1 = await processSeedBatch({ seed: 0, matches: 5, batchId });

      expect(res1.alreadyExists).toBe(false);
      expect(res1.insertedMatches).toBe(5);

      const res2 = await processSeedBatch({ seed: 0, matches: 5, batchId });
      expect(res2.alreadyExists).toBe(true);
      expect(res2.insertedMatches).toBe(0);
    });
  });

  describe('4. Telemetría y Agregados SQL (telemetryService.js)', () => {
    it('debe retornar 0 sin generar NaN o Infinity cuando no existen registros', async () => {
      const dummyUserId = `dummy_${Date.now()}`;
      const telemetry = await getTelemetry({ source: 'live', userId: dummyUserId });

      expect(telemetry.winRate).toBe(0);
      expect(telemetry.kdr).toBe(0);
      expect(telemetry.survivalRate).toBe(0);
    });
  });
});