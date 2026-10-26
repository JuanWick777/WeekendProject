import { createHash } from 'node:crypto';
import { generateMap } from '@cybergrid/shared/maps';
import { pool } from './pool.js';
import { saveMatches } from './matches.js';

function uuid(text) {
  const bytes = createHash('sha256').update(text).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export async function processSeedBatch({ seed, matches, batchId }) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff
    || !Number.isInteger(matches) || matches < 100 || matches > 1000
    || typeof batchId !== 'string' || !/^[A-Za-z0-9_-]{3,64}$/.test(batchId)) {
    throw new Error('INVALID_SEED_BATCH');
  }
    const rng = random(seed), integer = max => Math.floor(rng() * max);
    const users = Array.from({ length: 8 }, (_, i) => ({
      playerId: uuid('seed-user:' + seed + ':' + i), displayName: 'Bot ' + (i + 1),
    }));
    const map = generateMap(seed);
    const results = [];
    for (let m = 0; m < matches; m++) {
      const shuffled = [...users];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = integer(i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const players = shuffled.slice(0, 2 + integer(3)).map(p => ({
        ...p, score: 0, controlTimeMs: 0, kills: 0, deaths: 0,
        aliveMs: 150000, participatedMs: 150000, won: false, draw: false, forfeited: false,
      }));
      if (m % 10 !== 0) {
        const events = integer(11);
        for (let k = 0; k < events; k++) {
          const victim = integer(players.length);
          const attacker = (victim + 1 + integer(players.length - 1)) % players.length;
          players[attacker].kills++;
          players[victim].deaths++;
          players[victim].aliveMs -= 3000;
        }
        let remaining = integer(105001);
        for (let p = 0; p < players.length; p++) {
          const control = p === players.length - 1 ? remaining : integer(remaining + 1);
          players[p].controlTimeMs = control;
          players[p].score = Math.floor(control / 1000);
          remaining -= control;
        }
      }
      const sorted = [...players].sort((a,b) => b.score-a.score || b.kills-a.kills || a.deaths-b.deaths);
      const first = sorted[0];
      const leaders = sorted.filter(p => p.score === first.score && p.kills === first.kills && p.deaths === first.deaths);
      const winnerId = leaders.length === 1 ? first.playerId : null;
      const drawPlayerIds = leaders.length > 1 ? leaders.map(p => p.playerId) : [];
      for (const p of players) { p.won = p.playerId === winnerId; p.draw = drawPlayerIds.includes(p.playerId); }
      const startedAtMs = 1700000000000 + m * 180000;
      results.push({
        matchId: uuid('seed-match:' + batchId + ':' + m), roomCode: 'SEED00', mode: 'rotating_control',
        seed, templateId: map.templateId, templateVersion: map.templateVersion, generatorVersion: map.generatorVersion,
        startedAtMs, endedAtMs: startedAtMs + 150000, durationMs: 150000,
        status: 'completed', finishReason: 'time', winnerId, drawPlayerIds, players,
      });
    }

  const client = await pool.connect();
  let discard;
  try {
    await client.query('BEGIN');
    const batch = await client.query(
      'INSERT INTO seed_batches (batch_id,inserted_matches) VALUES ($1,0) ON CONFLICT DO NOTHING RETURNING batch_id',
      [batchId],
    );
    if (!batch.rowCount) {
      await client.query('COMMIT');
      return { batchId, insertedMatches: 0, alreadyExists: true };
    }
    const userRows = users.map((u,i) => [u.playerId,'seed:' + seed + ':' + i,u.displayName]);
    const placeholders = userRows.map((_row,i) => '($' + (i*3+1) + ',$' + (i*3+2) + ',$' + (i*3+3) + ",'SYNTHETIC_NO_LOGIN')").join(',');
    await client.query(
      'INSERT INTO users (id,username,display_name,password_hash) VALUES ' + placeholders + ' ON CONFLICT (id) DO NOTHING',
      userRows.flat(),
    );
    const { insertedMatches } = await saveMatches(results, { client, source: 'seed' });
    await client.query('UPDATE seed_batches SET inserted_matches=$1 WHERE batch_id=$2', [insertedMatches,batchId]);
    await client.query('COMMIT');
    return { batchId, insertedMatches, alreadyExists: false };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { discard = rollbackError; }
    throw error;
  } finally {
    client.release(discard);
  }
}
