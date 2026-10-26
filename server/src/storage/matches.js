import { pool } from './pool.js';

/**
 * Persiste una partida y sus participantes de forma idempotente.
 * 
 * @param {Object} matchData - Datos de la partida
 * @param {Object} options - Opciones adicionales { source: 'live' | 'seed', client: pgClient }
 * @returns {Promise<Object>} Objeto { inserted: boolean, matchId: string }
 */
export async function saveMatch(matchData, options = {}) {
  const { source = 'live', client: customClient } = options;
  const db = customClient || pool;

  const {
    matchId,
    roomCode = null,
    mode = 'rotating_control',
    seed = 0,
    templateId = 'template-4',
    templateVersion = 1,
    generatorVersion = 2,
    status = 'completed',
    drawPlayerIds = [],
    startedAtMs,
    endedAtMs,
    durationMs,
    players = []
  } = matchData;

  if (!matchId) {
    throw new Error('INVALID_MATCH_ID: Se requiere matchId');
  }

  // Normalizar status para cumplir con el CHECK constraint matches_status_check
  let normalizedStatus = status || 'completed';
  if (normalizedStatus === 'finished') normalizedStatus = 'completed';

  // Normalizar finish_reason para cumplir con el CHECK constraint matches_finish_reason_check
  const validReasons = ['time', 'score', 'elimination', 'aborted', 'surrender', 'disconnect'];
  let normalizedFinishReason = matchData.finishReason || matchData.finish_reason || 'time';
  if (normalizedFinishReason === 'time_limit') normalizedFinishReason = 'time';
  if (normalizedFinishReason === 'score_limit') normalizedFinishReason = 'score';
  if (!validReasons.includes(normalizedFinishReason)) {
    normalizedFinishReason = 'time';
  }

  // Validación de coherencia temporal (0 <= control <= alive <= participated <= duration)
  if (Array.isArray(players) && durationMs != null) {
    for (const p of players) {
      const ctrl = p.controlTimeMs || 0;
      const alive = p.aliveMs || 0;
      const part = p.participatedMs || 0;

      if (ctrl < 0 || alive < ctrl || part < alive || (durationMs > 0 && part > durationMs)) {
        throw new Error(`TEMPORAL_COHERENCE_ERROR: Inconsistencia en tiempos de jugador (${p.playerId || p.userId})`);
      }
    }
  }

  // 1. Insertar en la tabla matches (referenciando la clave primaria 'id')
  const insertMatchQuery = `
    INSERT INTO matches (
      id, room_code, mode, seed, template_id, template_version, 
      generator_version, status, finish_reason, draw_player_ids, 
      started_at_ms, ended_at_ms, duration_ms, source
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (id) DO NOTHING;
  `;

  const matchRes = await db.query(insertMatchQuery, [
    matchId,
    roomCode,
    mode,
    seed,
    templateId,
    templateVersion,
    generatorVersion,
    normalizedStatus,
    normalizedFinishReason,
    drawPlayerIds,
    startedAtMs,
    endedAtMs,
    durationMs,
    source
  ]);

  if (matchRes.rowCount === 0 && !customClient) {
    return { inserted: false, matchId };
  }

  // 2. Insertar participantes en player_matches (FK 'match_id')
  const insertPlayerQuery = `
    INSERT INTO player_matches (
      match_id, player_id, score, kills, deaths, 
      control_time_ms, alive_ms, participated_ms, 
      winner, draw, abandonment
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (match_id, player_id) DO NOTHING;
  `;

  for (const p of players) {
    const playerId = p.playerId || p.userId;
    if (!playerId) continue;

    await db.query(insertPlayerQuery, [
      matchId,
      playerId,
      p.score || 0,
      p.kills || 0,
      p.deaths || 0,
      p.controlTimeMs || 0,
      p.aliveMs || 0,
      p.participatedMs || 0,
      p.winner || false,
      p.draw || false,
      p.abandonment || false
    ]);
  }

  return { inserted: true, matchId };
}