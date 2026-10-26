import { pool } from '../storage/pool.js';

/**
 * Obtiene métricas agregadas de telemetría ajustadas strictly al contrato.
 * @param {Object} options - Filtros { source: 'all' | 'live' | 'seed' }
 * @returns {Promise<Object>} Estructura con { source, matches, playerResults, overall, players }
 */
export async function getTelemetry({ source = 'all' } = {}) {
  const validSource = ['all', 'live', 'seed'].includes(source) ? source : 'all';

  // Excluir rondas abortadas y aplicar filtro de origen si aplica
  const whereClauses = ["m.finish_reason IS DISTINCT FROM 'aborted'"];
  const params = [];

  if (validSource !== 'all') {
    params.push(validSource);
    whereClauses.push(`m.source = $${params.length}`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  // Consulta de totales generales y participaciones (m.id para referenciar la clave primaria de matches)
  const overallQuery = `
    SELECT
      COUNT(DISTINCT m.id)::INT AS total_matches,
      COUNT(pm.player_id)::INT AS total_player_results,
      COALESCE(SUM(CASE WHEN pm.winner = TRUE THEN 1 ELSE 0 END), 0)::INT AS total_wins,
      COALESCE(SUM(pm.kills), 0)::INT AS total_kills,
      COALESCE(SUM(pm.deaths), 0)::INT AS total_deaths,
      COALESCE(SUM(pm.alive_ms), 0)::NUMERIC AS total_alive_ms,
      COALESCE(SUM(pm.participated_ms), 0)::NUMERIC AS total_participated_ms,
      COALESCE(SUM(pm.control_time_ms), 0)::NUMERIC AS total_control_ms
    FROM matches m
    LEFT JOIN player_matches pm ON m.id = pm.match_id
    ${whereSql};
  `;

  // Consulta agrupada por jugador individual (m.id en JOIN y conteo de partidas únicas)
  const playersQuery = `
    SELECT
      pm.player_id AS "playerId",
      COUNT(DISTINCT m.id)::INT AS matches,
      COUNT(pm.match_id)::INT AS "playerResults",
      COALESCE(SUM(CASE WHEN pm.winner = TRUE THEN 1 ELSE 0 END), 0)::INT AS wins,
      COALESCE(SUM(pm.kills), 0)::INT AS kills,
      COALESCE(SUM(pm.deaths), 0)::INT AS deaths,
      COALESCE(SUM(pm.alive_ms), 0)::NUMERIC AS "totalAliveMs",
      COALESCE(SUM(pm.participated_ms), 0)::NUMERIC AS "totalParticipatedMs",
      COALESCE(SUM(pm.control_time_ms), 0)::NUMERIC AS "totalControlMs"
    FROM matches m
    JOIN player_matches pm ON m.id = pm.match_id
    ${whereSql}
    GROUP BY pm.player_id
    ORDER BY wins DESC, kills DESC;
  `;

  const overallRes = await pool.query(overallQuery, params);
  const playersRes = await pool.query(playersQuery, params);

  const rawOverall = overallRes.rows[0] || {};
  const totalMatches = Number(rawOverall.total_matches || 0);
  const totalPlayerResults = Number(rawOverall.total_player_results || 0);

  // Respuesta por defecto cuando no hay registros
  if (totalPlayerResults === 0) {
    return {
      source: validSource,
      matches: totalMatches,
      playerResults: 0,
      overall: {
        winRate: 0,
        kdr: 0,
        averageAliveSeconds: 0,
        survivalRate: 0,
        averageControlSeconds: 0
      },
      players: []
    };
  }

  const round = (val) => Math.round(val * 1000) / 1000;

  const totalWins = Number(rawOverall.total_wins || 0);
  const totalKills = Number(rawOverall.total_kills || 0);
  const totalDeaths = Number(rawOverall.total_deaths || 0);
  const totalAliveMs = Number(rawOverall.total_alive_ms || 0);
  const totalParticipatedMs = Number(rawOverall.total_participated_ms || 0);
  const totalControlMs = Number(rawOverall.total_control_ms || 0);

  // Cálculos globales (Escala 0-100% para winRate y survivalRate)
  const overallWinRate = round((100 * totalWins) / totalPlayerResults);
  const overallKdr = round(totalKills / Math.max(1, totalDeaths));
  const overallAvgAlive = round(totalAliveMs / totalPlayerResults / 1000);
  const overallSurvivalRate = totalParticipatedMs > 0 ? round((100 * totalAliveMs) / totalParticipatedMs) : 0;
  const overallAvgControl = round(totalControlMs / totalPlayerResults / 1000);

  // Mapeo detallado por jugador
  const players = playersRes.rows.map(row => {
    const pResults = Number(row.playerResults || 0);
    const pWins = Number(row.wins || 0);
    const pKills = Number(row.kills || 0);
    const pDeaths = Number(row.deaths || 0);
    const pAliveMs = Number(row.totalAliveMs || 0);
    const pPartMs = Number(row.totalParticipatedMs || 0);
    const pControlMs = Number(row.totalControlMs || 0);

    return {
      playerId: row.playerId,
      matches: Number(row.matches || 0),
      playerResults: pResults,
      winRate: pResults > 0 ? round((100 * pWins) / pResults) : 0,
      kdr: round(pKills / Math.max(1, pDeaths)),
      averageAliveSeconds: pResults > 0 ? round(pAliveMs / pResults / 1000) : 0,
      survivalRate: pPartMs > 0 ? round((100 * pAliveMs) / pPartMs) : 0,
      averageControlSeconds: pResults > 0 ? round(pControlMs / pResults / 1000) : 0
    };
  });

  return {
    source: validSource,
    matches: totalMatches,
    playerResults: totalPlayerResults,
    overall: {
      winRate: overallWinRate,
      kdr: overallKdr,
      averageAliveSeconds: overallAvgAlive,
      survivalRate: overallSurvivalRate,
      averageControlSeconds: overallAvgControl
    },
    players
  };
}