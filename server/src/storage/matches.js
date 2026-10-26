import { pool } from './pool.js';

function validate(result) {
  const fail = () => { throw new Error('INVALID_MATCH_RESULT'); };
  if (!result || typeof result.matchId !== 'string' || !result.matchId.length
    || result.mode !== 'rotating_control' || !Number.isInteger(result.seed)
    || result.seed < 0 || result.seed > 0xffffffff
    || typeof result.roomCode !== 'string' || result.roomCode.length > 10
    || typeof result.templateId !== 'string'
    || ![result.templateVersion, result.generatorVersion].every(n => Number.isInteger(n) && n > 0)) fail();
  const { startedAtMs: start, endedAtMs: end, durationMs: duration } = result;
  if (![start, end, duration].every(Number.isFinite) || start < 0 || end < start
    || duration < 0 || duration > 150000 || Math.abs(end - start - duration) > 0.002) fail();
  if (!['completed', 'aborted'].includes(result.status)
    || !['time', 'forfeit', 'empty'].includes(result.finishReason)
    || (result.status === 'aborted') !== (result.finishReason === 'empty')
    || !Array.isArray(result.players) || result.players.length < 2 || result.players.length > 4
    || !Array.isArray(result.drawPlayerIds)) fail();
  const ids = new Set(result.players.map(p => p.playerId));
  if (ids.size !== result.players.length || [...ids].some(id => typeof id !== 'string' || !id.length)) fail();
  if ((result.winnerId !== null && !ids.has(result.winnerId))
    || new Set(result.drawPlayerIds).size !== result.drawPlayerIds.length
    || result.drawPlayerIds.some(id => !ids.has(id))
    || (result.winnerId !== null && result.drawPlayerIds.length)
    || (result.status === 'aborted' && (result.winnerId !== null || result.drawPlayerIds.length))) fail();
  let total = 0;
  for (const p of result.players) {
    if (![p.controlTimeMs, p.aliveMs, p.participatedMs].every(Number.isFinite)
      || p.controlTimeMs < 0 || p.controlTimeMs > p.aliveMs
      || p.aliveMs > p.participatedMs || p.participatedMs > duration
      || ![p.score, p.kills, p.deaths].every(n => Number.isInteger(n) && n >= 0)
      || p.score !== Math.floor(p.controlTimeMs / 1000)
      || typeof p.displayName !== 'string' || !p.displayName.length
      || ![p.won, p.draw, p.forfeited].every(v => typeof v === 'boolean')
      || p.won !== (p.playerId === result.winnerId)
      || p.draw !== result.drawPlayerIds.includes(p.playerId)
      || (p.forfeited && (p.won || p.draw))) fail();
    total += p.controlTimeMs;
  }
  if (total > duration + 0.001) fail();
}

// Keep each statement comfortably below PostgreSQL's parameter limit.
const CHUNK_SIZE = 250;
const placeholders = (rows, columns, jsonColumn = -1) => rows.map((_row, i) =>
  '(' + Array.from({ length: columns }, (_value, j) => '$' + (i * columns + j + 1) + (j === jsonColumn ? '::jsonb' : '')).join(',') + ')').join(',');

export async function saveMatches(results, { client: suppliedClient, source = 'live' } = {}) {
  if (!Array.isArray(results)) throw new Error('INVALID_MATCH_RESULTS');
  if (!['live', 'seed'].includes(source)) throw new Error('INVALID_SOURCE');
  const unique = new Map();
  for (const result of results) {
    validate(result);
    if (!unique.has(result.matchId)) unique.set(result.matchId, result);
  }
  if (!unique.size) return { insertedMatches: 0 };
  const values = [...unique.values()];
  const client = suppliedClient ?? await pool.connect();
  let discard;
  try {
    if (!suppliedClient) await client.query('BEGIN');
    let insertedMatches = 0;
    for (let offset = 0; offset < values.length; offset += CHUNK_SIZE) {
      const chunk = values.slice(offset, offset + CHUNK_SIZE);
      const headers = chunk.map((r) => [
        r.matchId,r.roomCode,r.mode,r.seed,r.templateId,r.templateVersion,r.generatorVersion,
        r.startedAtMs,r.endedAtMs,r.durationMs,r.status,r.finishReason,r.winnerId,
        JSON.stringify(r.drawPlayerIds),source,source === 'seed',
      ]);
      const inserted = await client.query(
        'INSERT INTO matches (id,room_code,mode,seed,template_id,template_version,generator_version,' +
        'started_at_ms,ended_at_ms,duration_ms,status,finish_reason,winner_id,draw_player_ids,source,is_synthetic) VALUES ' +
        placeholders(headers,16,13) + ' ON CONFLICT (id) DO NOTHING RETURNING id',
        headers.flat(),
      );
      const ids = new Set(inserted.rows.map((r) => r.id));
      insertedMatches += ids.size;
      const participants = chunk.filter((r) => ids.has(r.matchId)).flatMap((r) => r.players.map((p) => [
        r.matchId,p.playerId,p.displayName,p.score,p.controlTimeMs,p.kills,p.deaths,
        p.aliveMs,p.participatedMs,p.won,p.draw,p.forfeited,
      ]));
      if (participants.length) {
        await client.query(
          'INSERT INTO player_results (match_id,player_id,display_name,score,control_time_ms,kills,deaths,' +
          'alive_ms,participated_ms,won,draw,forfeited) VALUES ' + placeholders(participants,12),
          participants.flat(),
        );
      }
    }
    if (!suppliedClient) await client.query('COMMIT');
    return { insertedMatches };
  } catch (error) {
    if (!suppliedClient) {
      try { await client.query('ROLLBACK'); } catch (rollbackError) { discard = rollbackError; }
    }
    throw error;
  } finally {
    if (!suppliedClient) client.release(discard);
  }
}

// Preserve the live-game contract; it uses the same validated bulk writer.
export async function saveMatch(result, options = {}) {
  const { insertedMatches } = await saveMatches([result], options);
  return { matchId: result.matchId, inserted: insertedMatches === 1 };
}
