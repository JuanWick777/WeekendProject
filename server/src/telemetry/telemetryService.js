import { pool } from '../storage/pool.js';

/**
 * Consulta métricas agregadas de telemetría para partidas con estado 'completed'.
 * @param {Object} [options]
 * @param {'all'|'live'|'seed'} [options.source='all'] - Filtro por origen de partida.
 * @param {string} [options.userId] - Filtro opcional por ID de jugador.
 * @returns {Promise<{
 *   winRate: number,
 *   kdr: number,
 *   survivalRate: number,
 *   averageAliveSeconds: number,
 *   averageControlSeconds: number
 * }>}
 */
export async function getTelemetry({ source = 'all', userId = null } = {}) {
  const whereConditions = ["m.status = 'completed'"];
  const queryParams = [];

  if (source === 'live' || source === 'seed') {
    queryParams.push(source);
    whereConditions.push(`m.source = $${queryParams.length}`);
  }

  if (userId) {
    queryParams.push(userId);
    whereConditions.push(`pr.player_id = $${queryParams.length}`);
  }

  const whereClause = whereConditions.join(' AND ');

  const query = `
    SELECT
      COUNT(*)::INTEGER AS total_matches,
      COALESCE(SUM(CASE WHEN pr.won = TRUE THEN 1 ELSE 0 END), 0)::INTEGER AS total_wins,
      COALESCE(SUM(pr.kills), 0)::BIGINT AS total_kills,
      COALESCE(SUM(pr.deaths), 0)::BIGINT AS total_deaths,
      COALESCE(SUM(pr.alive_ms), 0)::NUMERIC AS total_alive_ms,
      COALESCE(SUM(pr.participated_ms), 0)::NUMERIC AS total_participated_ms,
      COALESCE(SUM(pr.control_time_ms), 0)::NUMERIC AS total_control_ms
    FROM player_results pr
    JOIN matches m ON pr.match_id = m.id
    WHERE ${whereClause};
  `;

  const { rows } = await pool.query(query, queryParams);
  const row = rows[0] || {};

  const totalMatches = Number(row.total_matches || 0);
  const totalWins = Number(row.total_wins || 0);
  const totalKills = Number(row.total_kills || 0);
  const totalDeaths = Number(row.total_deaths || 0);
  const totalAliveMs = Number(row.total_alive_ms || 0);
  const totalParticipatedMs = Number(row.total_participated_ms || 0);
  const totalControlMs = Number(row.total_control_ms || 0);

  // Manejo estricto para evitar NaN / Infinity mediante divisiones entre cero
  const winRate = totalMatches > 0 ? Number((totalWins / totalMatches).toFixed(4)) : 0;
  const kdr = totalDeaths > 0 ? Number((totalKills / totalDeaths).toFixed(4)) : Number(totalKills.toFixed(4));
  const survivalRate = totalParticipatedMs > 0 ? Number((totalAliveMs / totalParticipatedMs).toFixed(4)) : 0;
  const averageAliveSeconds = totalMatches > 0 ? Number((totalAliveMs / totalMatches / 1000).toFixed(3)) : 0;
  const averageControlSeconds = totalMatches > 0 ? Number((totalControlMs / totalMatches / 1000).toFixed(3)) : 0;

  return {
    winRate,
    kdr,
    survivalRate,
    averageAliveSeconds,
    averageControlSeconds
  };
}