import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { pool } from '../src/storage/pool.js';
import { createUser } from '../src/storage/users.js';
import { saveMatch } from '../src/storage/matches.js';
import { processSeedBatch } from '../src/storage/seedService.js';
import { getTelemetry } from '../src/telemetry/telemetryService.js';

describe('Storage & Telemetry Service Suite (Paso 8)', () => {
  let testUserId;
  const testUsername = `vitest_user_${Date.now()}`;

  beforeAll(async () => {
    // Inicialización del esquema de pruebas
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

    const user = await createUser({
      username: testUsername,
      displayName: 'Vitest User',
      passwordHash: '$2b$10$mockHashForVitest'
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM player_matches;');
    await pool.query('DELETE FROM matches;');
    await pool.query('DELETE FROM seed_batches;');
  });

  describe('1. Persistencia e Idempotencia (saveMatch)', () => {
    it('debe guardar una partida correctamente asignando source="live" por defecto', async () => {
      const matchId = `match_live_${Date.now()}`;
      const matchResult = {
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
            playerId: testUserId,
            kills: 3,
            deaths: 1,
            controlTimeMs: 10000,
            aliveMs: 20000,
            participatedMs: 30000,
            winner: true
          }
        ]
      };

      const result = await saveMatch(matchResult);
      expect(result.inserted).toBe(true);

      const dbMatch = await pool.query('SELECT * FROM matches WHERE id = $1;', [matchId]);
      expect(dbMatch.rows[0].source).toBe('live');
    });

    it('debe derivar el score como Math.floor(controlTimeMs / 1000)', async () => {
      const matchId = `match_score_${Date.now()}`;
      const controlTimeMs = 15750; // Debería derivar a 15 de score

      await saveMatch({
        matchId,
        durationMs: 30000,
        players: [{ playerId: testUserId, controlTimeMs }]
      });

      const pm = await pool.query('SELECT score FROM player_matches WHERE match_id = $1;', [matchId]);
      expect(pm.rows[0].score).toBe(15);
    });
  });

  describe('2. Siembra Sintética Atómica (processSeedBatch)', () => {
    it('debe ejecutar la siembra atómicamente con Semilla 0 y bots sintéticos', async () => {
      const batchId = `vitest_batch_0`;
      const res = await processSeedBatch({ seed: 0, matches: 3, batchId });

      expect(res.status).toBe('success');
      expect(res.insertedMatches).toBe(3);

      const seedMatches = await pool.query('SELECT COUNT(*) FROM matches WHERE source = \'seed\';');
      expect(parseInt(seedMatches.rows[0].count, 10)).toBe(3);
    });

    it('debe ser idempotente al intentar re-ejecutar el mismo batchId', async () => {
      const batchId = `vitest_batch_repeat`;
      await processSeedBatch({ seed: 1, matches: 2, batchId });
      
      // Segunda ejecución con mismo batchId
      const secondRun = await processSeedBatch({ seed: 1, matches: 2, batchId });
      expect(secondRun.insertedMatches).toBe(0);
    });
  });

  describe('3. Telemetría y Filtros (getTelemetry)', () => {
    it('debe retornar la estructura de telemetría con porcentajes válidos (0-100%)', async () => {
      await processSeedBatch({ seed: 42, matches: 2, batchId: 'batch_telem' });

      const telemetry = await getTelemetry({ source: 'all' });
      
      expect(telemetry).toHaveProperty('source');
      expect(telemetry).toHaveProperty('matches');
      expect(telemetry).toHaveProperty('playerResults');
      expect(telemetry).toHaveProperty('overall');
      expect(telemetry).toHaveProperty('players');

      expect(telemetry.overall.winRate).toBeGreaterThanOrEqual(0);
      expect(telemetry.overall.winRate).toBeLessThanOrEqual(100);
    });

    it('debe filtrar correctamente según la fuente (live vs seed)', async () => {
      // 1 live match
      await saveMatch({
        matchId: `live_filter_${Date.now()}`,
        durationMs: 20000,
        players: [{ playerId: testUserId, winner: true }]
      }, { source: 'live' });

      // 2 seed matches
      await processSeedBatch({ seed: 99, matches: 2, batchId: 'batch_filter' });

      const liveTelemetry = await getTelemetry({ source: 'live' });
      expect(liveTelemetry.matches).toBe(1);

      const seedTelemetry = await getTelemetry({ source: 'seed' });
      expect(seedTelemetry.matches).toBe(2);
    });
  });
});