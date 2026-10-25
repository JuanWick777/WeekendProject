import { pool } from './pool.js';
import { saveMatch } from './matches.js';
import crypto from 'node:crypto';

/**
 * Procesa un lote de siembra sintética de partidas de forma idempotente.
 * @param {Object} params
 * @param {number} params.seed - Semilla numérica para generación determinista.
 * @param {Array|number} [params.matches] - Arreglo de partidas o cantidad a generar.
 * @param {string} params.batchId - Identificador único del lote.
 * @param {string} [params.defaultUserId] - ID de usuario base para partidas sintéticas.
 * @returns {Promise<{ batchId: string, insertedMatches: number, alreadyExists: boolean }>}
 */
export async function processSeedBatch({ seed, matches, batchId, defaultUserId = null }) {
  // 1. Preparar o generar partidas sintéticas coherentes
  const matchPayloads = Array.isArray(matches)
    ? matches
    : generateSyntheticMatches(seed, typeof matches === 'number' ? matches : 100, defaultUserId);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 2. Verificar idempotencia en seed_batches
    const checkBatchQuery = `SELECT batch_id FROM seed_batches WHERE batch_id = $1;`;
    const existingBatch = await client.query(checkBatchQuery, [batchId]);

    if (existingBatch.rowCount > 0) {
      await client.query('COMMIT');
      return {
        batchId,
        insertedMatches: 0,
        alreadyExists: true
      };
    }

    // 3. Registrar el lote en seed_batches incluyendo inserted_matches
    const insertBatchQuery = `
      INSERT INTO seed_batches (batch_id, inserted_matches)
      VALUES ($1, $2)
      ON CONFLICT (batch_id) DO NOTHING;
    `;
    await client.query(insertBatchQuery, [batchId, matchPayloads.length]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // 4. Persistir cada partida sintética con source = 'seed'
  let insertedCount = 0;
  for (const matchPayload of matchPayloads) {
    const matchWithSource = {
      ...matchPayload,
      seed: matchPayload.seed ?? seed,
      source: 'seed'
    };

    const res = await saveMatch(matchWithSource);
    if (res.saved) {
      insertedCount++;
    }
  }

  // 5. Ajustar conteo real si se ignoraron duplicados durante el bucle
  if (insertedCount !== matchPayloads.length) {
    await pool.query(
      `UPDATE seed_batches SET inserted_matches = $1 WHERE batch_id = $2;`,
      [insertedCount, batchId]
    );
  }

  return {
    batchId,
    insertedMatches: insertedCount,
    alreadyExists: false
  };
}

/**
 * Generador de partidas sintéticas con métricas coherentes:
 * 0 <= controlTimeMs <= aliveMs <= participatedMs <= durationMs
 */
function generateSyntheticMatches(baseSeed, count, userId) {
  const syntheticMatches = [];
  let currentSeed = Number(baseSeed) || 12345;

  function lcg() {
    currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
    return currentSeed / 4294967296;
  }

  const targetUserId = userId || crypto.randomUUID();

  for (let i = 0; i < count; i++) {
    const matchId = crypto.randomUUID();
    const durationMs = Math.floor(30000 + lcg() * 90000); // 30s a 120s
    const startedAtMs = 1700000000000 + i * 1000;
    const endedAtMs = startedAtMs + durationMs;

    const participatedMs = durationMs;
    const aliveMs = Math.floor(participatedMs * (0.5 + lcg() * 0.5));
    const controlTimeMs = Math.floor(aliveMs * lcg());

    const won = lcg() > 0.5;

    syntheticMatches.push({
      id: matchId,
      seed: baseSeed,
      status: 'completed',
      startedAtMs,
      endedAtMs,
      durationMs,
      winnerId: won ? targetUserId : null,
      source: 'seed',
      players: [
        {
          userId: targetUserId,
          displayName: 'Synthetic_Bot',
          score: Math.floor(lcg() * 2000),
          controlTimeMs,
          kills: Math.floor(lcg() * 10),
          deaths: Math.floor(lcg() * 5),
          aliveMs,
          participatedMs,
          won,
          draw: !won && lcg() > 0.8,
          forfeited: false
        }
      ]
    });
  }

  return syntheticMatches;
}