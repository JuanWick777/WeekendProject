import { describe, it, expect, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { pool } from '../src/storage/pool.js';
import { createUser } from '../src/storage/users.js';
import { saveMatch } from '../src/storage/matches.js';
import { processSeedBatch } from '../src/storage/seedService.js';
import { getTelemetry } from '../src/telemetry/telemetryService.js';

describe('Capa de Infraestructura y Persistencia (Rol C)', () => {
  const testSuffix = Date.now();
  let testUser;

  afterAll(async () => {
    if (testUser?.id) {
      await pool.query('DELETE FROM player_results WHERE player_id = $1', [testUser.id]);
      await pool.query('DELETE FROM matches WHERE winner_id = $1', [testUser.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
    await pool.end();
  });

  describe('1. Usuarios y Autenticación', () => {
    it('debe crear un usuario correctamente', async () => {
      testUser = await createUser({
        username: `vitest_user_${testSuffix}`,
        displayName: 'Vitest User',
        passwordHash: 'hashed_pw_vitest'
      });

      expect(testUser).toHaveProperty('id');
      expect(testUser.username).toBe(`vitest_user_${testSuffix}`);
    });
  });

  describe('2. Persistencia Transaccional de Partidas (matches.js)', () => {
    it('debe guardar una partida correctamente e ignorar duplicados (idempotencia)', async () => {
      const matchId = crypto.randomUUID();
      const matchPayload = {
        id: matchId,
        seed: 777,
        status: 'completed',
        startedAtMs: 1729830000000.123,
        endedAtMs: 1729830060000.456,
        durationMs: 60000.333,
        winnerId: testUser.id,
        source: 'live',
        players: [
          {
            userId: testUser.id,
            displayName: testUser.displayName,
            score: 1200,
            controlTimeMs: 20000,
            kills: 3,
            deaths: 1,
            aliveMs: 50000,
            participatedMs: 60000.333,
            won: true,
            draw: false,
            forfeited: false
          }
        ]
      };

      const result = await saveMatch(matchPayload);
      expect(result.saved).toBe(true);
      expect(result.duplicate).toBe(false);

      // Re-guardar misma partida (Idempotencia)
      const dupResult = await saveMatch(matchPayload);
      expect(dupResult.saved).toBe(false);
      expect(dupResult.duplicate).toBe(true);

      // Limpieza de la partida de prueba
      await pool.query('DELETE FROM player_results WHERE match_id = $1', [matchId]);
      await pool.query('DELETE FROM matches WHERE id = $1', [matchId]);
    });

    it('debe rechazar la transacción si falla la coherencia temporal', async () => {
      const invalidMatch = {
        id: crypto.randomUUID(),
        seed: 778,
        status: 'completed',
        startedAtMs: 1729830000000,
        endedAtMs: 1729830060000,
        durationMs: 60000,
        winnerId: testUser.id,
        source: 'live',
        players: [
          {
            userId: testUser.id,
            displayName: testUser.displayName,
            controlTimeMs: 80000, // Incoherente: mayor a durationMs (60000)
            aliveMs: 50000,
            participatedMs: 60000
          }
        ]
      };

      await expect(saveMatch(invalidMatch)).rejects.toThrow('[Storage Error] Métricas incoherentes');
    });
  });

  describe('3. Servicio de Siembra (seedService.js)', () => {
    it('debe procesar un lote sintético e ignorar ejecuciones duplicadas', async () => {
      const batchId = `vitest_batch_${crypto.randomUUID()}`;
      const seed = 888;

      const res1 = await processSeedBatch({
        seed,
        matches: 5,
        batchId,
        defaultUserId: testUser.id
      });

      expect(res1.alreadyExists).toBe(false);
      expect(res1.insertedMatches).toBe(5);

      // Repetir mismo batchId
      const res2 = await processSeedBatch({
        seed,
        matches: 5,
        batchId,
        defaultUserId: testUser.id
      });

      expect(res2.alreadyExists).toBe(true);
      expect(res2.insertedMatches).toBe(0);

      // Limpieza de datos de siembra
      await pool.query('DELETE FROM player_results WHERE player_id = $1 AND match_id IN (SELECT id FROM matches WHERE source = \'seed\' AND seed = $2)', [testUser.id, seed]);
      await pool.query('DELETE FROM matches WHERE source = \'seed\' AND seed = $1', [seed]);
      await pool.query('DELETE FROM seed_batches WHERE batch_id = $1', [batchId]);
    });
  });

  describe('4. Telemetría y Agregados SQL (telemetryService.js)', () => {
    it('debe retornar 0 sin generar NaN o Infinity cuando no existen registros', async () => {
      const dummyUserId = crypto.randomUUID();
      const telemetry = await getTelemetry({ source: 'live', userId: dummyUserId });

      expect(telemetry.winRate).toBe(0);
      expect(telemetry.kdr).toBe(0);
      expect(telemetry.survivalRate).toBe(0);
      expect(telemetry.averageAliveSeconds).toBe(0);
      expect(telemetry.averageControlSeconds).toBe(0);
    });
  });
});