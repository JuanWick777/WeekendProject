import { pool } from '../storage/pool.js';

export async function getTelemetry(options = {}) {
  const source = options.source || 'all';
  const userId = options.userId || null;

  let sourceFilter = '';
  const params = [];

  if (source !== 'all') {
    params.push(source);
    sourceFilter = `WHERE m.source = $${params.length}`;
  }

  let userFilter = '';
  if (userId) {
    params.push(userId);
    const userParamIdx = params.length;
    userFilter = sourceFilter
      ? `${sourceFilter} AND pm.player_id = $${userParamIdx}`
      : `WHERE pm.player_id = $${userParamIdx}`;
  }

  const matchesRes = await pool.query(
    `SELECT COUNT(DISTINCT m.id) AS total_matches
     FROM matches m
     ${sourceFilter};`,
    source !== 'all' ? [source] : []
  );
  const totalMatches = parseInt(matchesRes.rows[0]?.total_matches || '0', 10);

  const statsRes = await pool.query(
    `SELECT
       COUNT(pm.match_id) AS total_player_results,
       SUM(CASE WHEN pm.winner THEN 1 ELSE 0 END) AS wins,
       SUM(pm.kills) AS kills,
       SUM(pm.deaths) AS deaths,
       SUM(CASE WHEN pm.deaths = 0 THEN 1 ELSE 0 END) AS survived
     FROM player_matches pm
     JOIN matches m ON pm.match_id = m.id
     ${userFilter};`,
    params
  );

  const stats = statsRes.rows[0] || {};
  const totalPlayerResults = parseInt(stats.total_player_results || '0', 10);
  const wins = parseInt(stats.wins || '0', 10);
  const kills = parseInt(stats.kills || '0', 10);
  const deaths = parseInt(stats.deaths || '0', 10);
  const survived = parseInt(stats.survived || '0', 10);

  const rawWinRate = totalPlayerResults > 0 ? (wins / totalPlayerResults) * 100 : 0;
  const rawKdr = deaths > 0 ? kills / deaths : kills;
  const rawSurvivalRate = totalPlayerResults > 0 ? (survived / totalPlayerResults) * 100 : 0;

  const winRate = Number.isNaN(rawWinRate) ? 0 : Math.round(rawWinRate * 100) / 100;
  const kdr = Number.isNaN(rawKdr) ? 0 : Math.round(rawKdr * 100) / 100;
  const survivalRate = Number.isNaN(rawSurvivalRate) ? 0 : Math.round(rawSurvivalRate * 100) / 100;

  const playersRes = await pool.query(
    `SELECT
       u.id,
       u.username,
       u.display_name AS "displayName",
       COUNT(pm.match_id) AS "matchCount",
       SUM(CASE WHEN pm.winner THEN 1 ELSE 0 END) AS wins,
       SUM(pm.kills) AS kills,
       SUM(pm.deaths) AS deaths
     FROM users u
     JOIN player_matches pm ON u.id = pm.player_id
     JOIN matches m ON pm.match_id = m.id
     ${sourceFilter}
     GROUP BY u.id, u.username, u.display_name;`,
    source !== 'all' ? [source] : []
  );

  return {
    source,
    matches: totalMatches,
    playerResults: totalPlayerResults,
    winRate,
    kdr,
    survivalRate,
    overall: {
      matches: totalMatches,
      playerResults: totalPlayerResults,
      winRate,
      kdr,
      survivalRate
    },
    players: playersRes.rows.map(p => ({
      id: p.id,
      username: p.username,
      displayName: p.displayName,
      matches: parseInt(p.matchCount, 10),
      wins: parseInt(p.wins, 10),
      kills: parseInt(p.kills, 10),
      deaths: parseInt(p.deaths, 10)
    }))
  };
}