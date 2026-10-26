import { pool } from '../storage/pool.js';

function metrics(s) {
  return {
    wins: s.wins,
    kills: s.kills,
    deaths: s.deaths,
    winRate: s.matches
      ? 100 * s.wins / s.matches
      : 0,
    kdr: s.kills / Math.max(1, s.deaths),
    averageAliveSeconds: s.matches
      ? s.alive / s.matches / 1000
      : 0,
    survivalRate: s.participated
      ? 100 * s.alive / s.participated
      : 0,
    averageControlSeconds: s.matches
      ? s.control / s.matches / 1000
      : 0,
  };
}

export async function getTelemetry({ source = 'all' } = {}) {
  if (!['all', 'live', 'seed'].includes(source)) {
    throw new Error('INVALID_SOURCE');
  }

  const [count, results] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS matches
       FROM matches
       WHERE status='completed'
         AND ($1='all' OR source=$1)`,
      [source],
    ),
    pool.query(
      `SELECT
         p.player_id AS "playerId",
         MAX(p.display_name) AS "displayName",
         COUNT(*) AS matches,
         SUM(CASE WHEN p.won THEN 1 ELSE 0 END) AS wins,
         SUM(p.kills) AS kills,
         SUM(p.deaths) AS deaths,
         SUM(p.alive_ms) AS alive,
         SUM(p.participated_ms) AS participated,
         SUM(p.control_time_ms) AS control
       FROM player_results p
       JOIN matches m ON p.match_id=m.id
       WHERE m.status='completed'
         AND ($1='all' OR m.source=$1)
       GROUP BY p.player_id
       ORDER BY p.player_id`,
      [source],
    ),
  ]);

  const total = {
    matches: 0,
    wins: 0,
    kills: 0,
    deaths: 0,
    alive: 0,
    participated: 0,
    control: 0,
  };

  const players = results.rows.map(row => {
    const sums = {};

    for (const key of Object.keys(total)) {
      const value = Number(row[key] ?? 0);

      if (!Number.isFinite(value)) {
        throw new Error('INVALID_DATABASE_METRIC');
      }

      sums[key] = value;
      total[key] += value;
    }

    return {
      playerId: row.playerId,
      displayName: row.displayName,
      matches: sums.matches,
      ...metrics(sums),
    };
  });

  return {
    source,
    matches: Number(count.rows[0].matches),
    playerResults: total.matches,
    overall: metrics(total),
    players,
  };
}