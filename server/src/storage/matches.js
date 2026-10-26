import { pool } from './pool.js';

export async function saveMatch(matchData, options = {}) {
  const matchId = matchData?.matchId || matchData?.id;
  if (!matchId) {
    throw new Error('INVALID_MATCH_ID: Se requiere matchId');
  }

  const {
    roomCode = null,
    mode = null,
    seed = null,
    templateId = null,
    templateVersion = null,
    generatorVersion = null,
    status = 'completed',
    finishReason = 'time',
    drawPlayerIds = [],
    startedAtMs = null,
    endedAtMs = null,
    durationMs = 0,
    players = []
  } = matchData;

  // Validación de coherencia temporal
  if (
    (startedAtMs !== null && endedAtMs !== null && Number(endedAtMs) < Number(startedAtMs)) ||
    (durationMs !== null && Number(durationMs) < 0)
  ) {
    throw new Error('[Storage Error] Métricas incoherentes');
  }

  for (const p of players) {
    const ctrl = Number(p.controlTimeMs ?? 0);
    const alive = Number(p.aliveMs ?? 0);
    const part = Number(p.participatedMs ?? durationMs ?? 0);
    const dur = Number(durationMs ?? part);

    if (ctrl < 0 || alive < 0 || part < 0 || dur < 0) {
      throw new Error('[Storage Error] Métricas incoherentes');
    }
    if (ctrl > alive || alive > part || part > dur) {
      throw new Error('[Storage Error] Métricas incoherentes');
    }
  }

  const client = options.client || (await pool.connect());
  const shouldRelease = !options.client;

  try {
    if (shouldRelease) {
      await client.query('BEGIN');
    }

    const source = options.source || matchData.source || 'live';

    const matchIns = await client.query(
      `INSERT INTO matches (
        id, room_code, mode, seed, template_id, template_version,
        generator_version, status, finish_reason, draw_player_ids,
        started_at_ms, ended_at_ms, duration_ms, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO NOTHING
      RETURNING id;`,
      [
        matchId, roomCode, mode, seed, templateId, templateVersion,
        generatorVersion, status, finishReason, drawPlayerIds,
        startedAtMs, endedAtMs, durationMs, source
      ]
    );

    if (matchIns.rowCount === 0) {
      if (shouldRelease) {
        await client.query('COMMIT');
      }
      return { inserted: false, matchId };
    }

    for (const p of players) {
      const score = Math.floor(Number(p.controlTimeMs ?? 0) / 1000);
      await client.query(
        `INSERT INTO player_matches (
          match_id, player_id, score, kills, deaths,
          control_time_ms, alive_ms, participated_ms, winner, draw, abandonment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (match_id, player_id) DO NOTHING;`,
        [
          matchId,
          p.playerId || p.id,
          score,
          p.kills ?? 0,
          p.deaths ?? 0,
          p.controlTimeMs ?? 0,
          p.aliveMs ?? 0,
          p.participatedMs ?? 0,
          p.winner ?? false,
          p.draw ?? false,
          p.abandonment ?? false
        ]
      );
    }

    if (shouldRelease) {
      await client.query('COMMIT');
    }
    return { inserted: true, matchId };

  } catch (err) {
    if (shouldRelease) {
      await client.query('ROLLBACK');
    }
    throw err;
  } finally {
    if (shouldRelease) {
      client.release();
    }
  }
}