import { pool } from './pool.js';
import { saveMatch } from './matches.js';

function createPRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function processSeedBatch({ seed, matches = 5, batchId }) {
  if (seed === undefined || seed === null) {
    throw new Error('INVALID_SEED: Se requiere el parámetro seed.');
  }

  const effectiveBatchId = batchId || `batch_seed_${seed}`;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const batchRes = await client.query(
      `INSERT INTO seed_batches (batch_id, seed, match_count)
       VALUES ($1, $2, $3)
       ON CONFLICT (batch_id) DO NOTHING
       RETURNING batch_id;`,
      [effectiveBatchId, seed, matches]
    );

    if (batchRes.rowCount === 0) {
      await client.query('COMMIT');
      return { status: 'success', insertedMatches: 0, alreadyExists: true, batchId: effectiveBatchId };
    }

    const prng = createPRNG(seed);
    let totalInserted = 0;

    const syntheticUsers = [];
    for (let i = 0; i < 8; i++) {
      const uId = `00000000-0000-4000-8000-${String(seed).padStart(6, '0')}${String(i).padStart(6, '0')}`;
      const username = `bot_${seed}_${i}`;

      await client.query(
        `INSERT INTO users (id, username, display_name, password_hash)
         VALUES ($1, $2, $3, 'SYNTHETIC_NO_LOGIN')
         ON CONFLICT DO NOTHING;`,
        [uId, username, `Bot ${i + 1}`]
      );
      syntheticUsers.push(uId);
    }

    for (let m = 0; m < matches; m++) {
      const matchId = `seed_match_${effectiveBatchId}_${m}`;
      const durationMs = 30000;
      const startedAtMs = 1700000000000 + m * 60000;
      const endedAtMs = startedAtMs + durationMs;

      const playerCount = 2 + Math.floor(prng() * 3);
      const shuffled = [...syntheticUsers].sort(() => prng() - 0.5);
      const selectedPlayers = shuffled.slice(0, playerCount);

      const maxControl = Math.floor(durationMs * 0.8);
      const winnerIndex = Math.floor(prng() * playerCount);
      const playersData = [];

      for (let pIdx = 0; pIdx < playerCount; pIdx++) {
        const pId = selectedPlayers[pIdx];
        const isWinner = pIdx === winnerIndex;
        const ctrl = isWinner ? Math.floor(maxControl * 0.6) : Math.floor(maxControl * (0.1 + prng() * 0.2));
        const alive = Math.min(durationMs, ctrl + Math.floor(prng() * 10000));
        const part = durationMs;

        playersData.push({
          playerId: pId,
          score: Math.floor(ctrl / 1000),
          kills: isWinner ? 3 + Math.floor(prng() * 4) : Math.floor(prng() * 2),
          deaths: isWinner ? Math.floor(prng() * 2) : 2 + Math.floor(prng() * 3),
          controlTimeMs: ctrl,
          aliveMs: alive,
          participatedMs: part,
          winner: isWinner,
          draw: false,
          abandonment: false
        });
      }

      const matchPayload = {
        matchId,
        roomCode: `SEED_${seed}`,
        mode: 'rotating_control',
        seed,
        templateId: 'template-4',
        templateVersion: 1,
        generatorVersion: 2,
        status: 'completed',
        finishReason: 'time',
        drawPlayerIds: [],
        startedAtMs,
        endedAtMs,
        durationMs,
        players: playersData
      };

      await saveMatch(matchPayload, { source: 'seed', client });
      totalInserted++;
    }

    await client.query('COMMIT');
    return { status: 'success', insertedMatches: totalInserted, alreadyExists: false, batchId: effectiveBatchId };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}