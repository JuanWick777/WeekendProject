import { pool } from './pool.js';

/**
 * Guarda una partida y sus resultados de jugadores en una única transacción PostgreSQL.
 * @param {Object} match
 * @returns {Promise<{ saved: boolean, duplicate: boolean, id: string }>}
 */
export async function saveMatch(match) {
  const {
    id,
    seed = 0,
    status = 'completed',
    startedAtMs,
    endedAtMs,
    durationMs,
    winnerId = null,
    source = 'live',
    players = []
  } = match;

  // 1. Validar reglas de coherencia para cada jugador
  const duration = Number(durationMs);
  for (const player of players) {
    const controlTimeMs = Number(player.controlTimeMs ?? 0);
    const aliveMs = Number(player.aliveMs ?? 0);
    const participatedMs = Number(player.participatedMs ?? 0);

    const isValidCoherence =
      0 <= controlTimeMs &&
      controlTimeMs <= aliveMs &&
      aliveMs <= participatedMs &&
      participatedMs <= duration;

    if (!isValidCoherence) {
      throw new Error(
        `[Storage Error] Métricas incoherentes para el usuario ${player.userId}: ` +
        `se requiere 0 <= controlTimeMs (${controlTimeMs}) <= aliveMs (${aliveMs}) <= participatedMs (${participatedMs}) <= durationMs (${duration})`
      );
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 2. Inserción idempotente de la cabecera de la partida
    const insertMatchQuery = `
      INSERT INTO matches (id, seed, status, started_at_ms, ended_at_ms, duration_ms, winner_id, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `;

    const resMatch = await client.query(insertMatchQuery, [
      id,
      seed,
      status,
      startedAtMs,
      endedAtMs,
      durationMs,
      winnerId,
      source
    ]);

    if (resMatch.rowCount === 0) {
      await client.query('COMMIT');
      return { saved: false, duplicate: true, id };
    }

    // 3. Inserción de resultados incluyendo display_name
    const insertPlayerQuery = `
      INSERT INTO player_results (
        match_id, player_id, display_name, score, control_time_ms, kills, deaths,
        alive_ms, participated_ms, won, draw, forfeited
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (match_id, player_id) DO NOTHING;
    `;

    for (const player of players) {
      await client.query(insertPlayerQuery, [
        id,
        player.userId,
        player.displayName || player.username || 'Jugador',
        player.score ?? 0,
        player.controlTimeMs ?? 0,
        player.kills ?? 0,
        player.deaths ?? 0,
        player.aliveMs ?? 0,
        player.participatedMs ?? 0,
        Boolean(player.won),
        Boolean(player.draw),
        Boolean(player.forfeited)
      ]);
    }

    await client.query('COMMIT');
    return { saved: true, duplicate: false, id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}