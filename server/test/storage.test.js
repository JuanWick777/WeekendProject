import './helpers/pg-latency.js';
import pg from 'pg';
import { describe, it, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { generateMap } from '@cybergrid/shared/maps';
import { createMatch } from '@cybergrid/shared/simulation';
import { createAuthService } from '../src/auth/auth-service.js';
import { loadPostgresServices } from '../src/postgres-services.js';
import { createServerRuntime } from '../src/runtime.js';

const schema = 'cg_test_' + randomUUID().replaceAll('-', '');
process.env.TEST_DATABASE_SCHEMA = schema;
const { pool } = await import('../src/storage/pool.js');
const users = await import('../src/storage/users.js');
const sessions = await import('../src/storage/sessions.js');
const { saveMatch, saveMatches } = await import('../src/storage/matches.js');
const { processSeedBatch } = await import('../src/storage/seedService.js');
const { getTelemetry } = await import('../src/telemetry/telemetryService.js');

describe('PostgreSQL: contrato real de almacenamiento', { timeout: 30000 }, () => {
  let a, b, httpRuntime, httpUrl;
  async function openHttp() {
    const services = await loadPostgresServices();
    httpRuntime = createServerRuntime({
      ...services, nodeEnv: 'test', enableGame: false,
      evaluationRateLimit: { seed: { maxRequests: 1000 }, telemetry: { maxRequests: 1000 } },
    });
    await new Promise((resolve, reject) => {
      httpRuntime.server.once('error', reject);
      httpRuntime.server.listen(0, '127.0.0.1', resolve);
    });
    httpUrl = 'http://127.0.0.1:' + httpRuntime.server.address().port;
  }
  async function httpSeed(input) {
    const response = await fetch(httpUrl + '/api/test/seed', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
    });
    return { response, body: await response.json() };
  }
  async function httpTelemetry(source = 'all') {
    const response = await fetch(httpUrl + '/api/test/telemetry?source=' + source);
    return { response, body: await response.json() };
  }
  function simulation() {
    return createMatch({
      matchId:randomUUID(),roomCode:'ABC123',startedAtMs:1700000000000,map:generateMap(42),
      players:[a,b].map(u => ({ id:u.id,displayName:u.displayName })),
    });
  }
  function fixture() {
    const game = simulation();
    game.advanceTo(150000);
    const result = game.getResult();
    result.winnerId=a.id;
    result.drawPlayerIds=[];
    result.players.forEach((p,i) => Object.assign(p,{
      score:i?5:10,controlTimeMs:i?5000:10000,kills:i?2:4,deaths:i?4:2,
      aliveMs:i?50000:100000,won:i===0,draw:false,
    }));
    return result;
  }
  beforeAll(async () => {
    await pool.query('CREATE SCHEMA "' + schema + '"');
    await pool.query(await readFile(new URL('../src/storage/schema.sql',import.meta.url),'utf8'));
    await openHttp();
  },30000);
  beforeEach(async () => {
    const tables=['player_results','matches','sessions','seed_batches','users'];
    await pool.query('TRUNCATE ' + tables.map(t => '"' + schema + '"."' + t + '"').join(',') + ' CASCADE');
    a=await users.createUser({ username:'player_a',displayName:'A',passwordHash:'test-hash' });
    b=await users.createUser({ username:'player_b',displayName:'B',passwordHash:'test-hash' });
  },30000);
  afterAll(async () => {
    try { await httpRuntime?.close(); await pool.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE'); }
    finally { await pool.end(); }
  },30000);
  it('HTTP público devuelve ceros de PostgreSQL sin sesión ni caché', async () => {
    const { response, body } = await httpTelemetry();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('server-timing'), /telemetry;dur=\d/);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(body.ok, true);
    assert.equal(body.data.matches, 0);
    assert.equal(body.data.playerResults, 0);
    assert.deepEqual(body.data.players, []);
    assert.ok(Object.values(body.data.overall).every(n => n === 0 && Number.isFinite(n)));
  });
  it('HTTP siembra 100/1000, repite lotes sin duplicar y separa datos humanos', async () => {
    await saveMatch(fixture());
    const first = await httpSeed({ seed: 42, matches: 100, batchId: 'http-small' });
    assert.equal(first.response.status, 200);
    assert.deepEqual(first.body, { ok: true, data: { batchId: 'http-small', insertedMatches: 100, alreadyExists: false } });
    assert.equal(first.response.headers.get('set-cookie'), null);
    const duplicate = await httpSeed({ seed: 0xffffffff, matches: 1000, batchId: 'http-small' });
    assert.equal(duplicate.response.status, 200);
    assert.deepEqual(duplicate.body.data, { batchId: 'http-small', insertedMatches: 0, alreadyExists: true });
    const large = await httpSeed({ seed: 0, matches: 1000, batchId: 'http-large' });
    assert.equal(large.response.status, 200);
    assert.equal(large.body.data.insertedMatches, 1000);
    assert.equal((await httpTelemetry('seed')).body.data.matches, 1100);
    const live = (await httpTelemetry('live')).body.data;
    assert.equal(live.matches, 1);
    assert.equal(live.overall.winRate, 50);
    assert.equal(live.overall.kdr, 1);
    assert.equal(live.overall.survivalRate, 50);
    assert.equal((await httpTelemetry()).body.data.matches, 1101);
    assert.equal((await pool.query("SELECT COUNT(*) AS n FROM matches WHERE (source='live' AND is_synthetic) OR (source='seed' AND NOT is_synthetic)")).rows[0].n, '0');
  });
  it('HTTP rechaza entradas inválidas antes de escribir registros', async () => {
    for (const input of [
      { seed: 0, matches: 99, batchId: 'invalid-http' },
      { seed: 2 ** 32, matches: 100, batchId: 'invalid-http' },
      { seed: 42, matches: 100, batchId: 'invalid-http', source: 'live' },
    ]) assert.equal((await httpSeed(input)).response.status, 400);
    assert.equal((await pool.query('SELECT COUNT(*) AS n FROM matches')).rows[0].n, '0');
    assert.equal((await pool.query('SELECT COUNT(*) AS n FROM seed_batches')).rows[0].n, '0');
  });
  it('HTTP conserva la idempotencia de PostgreSQL al reiniciar la API y ante duplicados simultáneos', async () => {
    const input = { seed: 42, matches: 100, batchId: 'http-restart' };
    const parallel = await Promise.all([httpSeed(input), httpSeed(input)]);
    assert.ok(parallel.every(r => r.response.status === 200));
    assert.equal(parallel.reduce((sum, r) => sum + r.body.data.insertedMatches, 0), 100);
    await httpRuntime.close();
    await openHttp();
    const duplicate = await httpSeed(input);
    assert.equal(duplicate.response.status, 200);
    assert.deepEqual(duplicate.body.data, { batchId: 'http-restart', insertedMatches: 0, alreadyExists: true });
    assert.equal((await httpTelemetry('seed')).body.data.matches, 100);
  });
  it('utiliza los tipos del esquema oficial',async () => {
    const { rows }=await pool.query(
      'SELECT table_name,column_name,udt_name,numeric_scale FROM information_schema.columns WHERE table_schema=$1',[schema],
    );
    const column=(table,name) => rows.find(r => r.table_name===table && r.column_name===name);
    assert.equal(column('users','id').udt_name,'uuid');
    assert.equal(column('matches','draw_player_ids').udt_name,'jsonb');
    assert.equal(column('matches','duration_ms').numeric_scale,3);
    assert.equal(column('player_results','control_time_ms').numeric_scale,3);
    assert.equal(column('seed_batches','inserted_matches').udt_name,'int4');
  });
  it('restaura búsquedas, privacidad y duplicados de usuarios',async () => {
    const user=await users.findUserByUsername('PLAYER_A');
    assert.equal(user.id,a.id);
    assert.equal(user.passwordHash,'test-hash');
    assert.equal((await users.findUserById(a.id)).passwordHash,undefined);
    assert.doesNotThrow(() => createAuthService({ users,sessions }));
    await assert.rejects(users.createUser({ username:'PLAYER_A',displayName:'Otro',passwordHash:'test' }),{ code:'USERNAME_TAKEN' });
  });
  it('recupera sesiones con tiempo numérico y permite eliminarlas',async () => {
    const tokenHash='a'.repeat(64),expiresAtMs=1800000000000;
    await sessions.createSession({ userId:a.id,tokenHash,expiresAtMs });
    const found=await sessions.findSessionByTokenHash(tokenHash);
    assert.equal(found.user.id,a.id);
    assert.equal(found.expiresAtMs,expiresAtMs);
    assert.ok(Number.isFinite(found.expiresAtMs));
    await sessions.deleteSessionByTokenHash(tokenHash);
    assert.equal(await sessions.findSessionByTokenHash(tokenHash),null);
  });
  it('guarda un resultado real fraccionario, victoria y abandono sin duplicarlo',async () => {
    const game=simulation();
    game.advanceTo(1234.567);
    game.forfeit(b.id);
    game.advanceTo(1234.567);
    const result=game.getResult();
    assert.equal((await saveMatch(result)).inserted,true);
    assert.equal((await saveMatch(result)).inserted,false);
    const header=(await pool.query('SELECT * FROM matches WHERE id=$1',[result.matchId])).rows[0];
    assert.equal(header.winner_id,a.id);
    assert.equal(header.template_id,result.templateId);
    assert.equal(Number(header.template_version),result.templateVersion);
    assert.ok(Math.abs(Number(header.duration_ms)-result.durationMs)<0.001);
    const rows=(await pool.query('SELECT * FROM player_results WHERE match_id=$1',[result.matchId])).rows;
    assert.equal(rows.length,2);
    assert.equal(rows.find(p => p.player_id===a.id).won,true);
    assert.equal(rows.find(p => p.player_id===b.id).forfeited,true);
    assert.equal(rows.find(p => p.player_id===a.id).display_name,'A');
  });
  it('conserva un empate como arreglo JSONB',async () => {
    const game=simulation();
    game.advanceTo(150000);
    const result=game.getResult();
    await saveMatch(result);
    const { rows }=await pool.query('SELECT winner_id,draw_player_ids FROM matches WHERE id=$1',[result.matchId]);
    assert.equal(rows[0].winner_id,null);
    assert.deepEqual(rows[0].draw_player_ids,result.drawPlayerIds);
  });
  it('revierte toda la partida si falla una clave foránea',async () => {
    const result=fixture();
    result.players[1].playerId=randomUUID();
    await assert.rejects(saveMatch(result),{ code:'23503' });
    assert.equal((await pool.query('SELECT COUNT(*) AS n FROM matches')).rows[0].n,'0');
    assert.equal((await pool.query('SELECT COUNT(*) AS n FROM player_results')).rows[0].n,'0');
  });
  it('rechaza NaN, fechas incoherentes, puntuación inválida y exceso de control',async () => {
    for(const change of [
      r => { r.durationMs=NaN; },
      r => { r.endedAtMs=r.startedAtMs-1; },
      r => { r.durationMs--; },
      r => { r.players[0].score++; },
      r => { r.players.forEach(p => { p.controlTimeMs=100000;p.score=100;p.aliveMs=150000; }); },
    ]) {
      const result=fixture();
      change(result);
      await assert.rejects(saveMatch(result),/INVALID_MATCH_RESULT/);
    }
  });
  it('fija source=live sin confiar en result.source',async () => {
    const result=fixture();
    result.source='seed';
    await saveMatch(result);
    assert.equal((await pool.query('SELECT source FROM matches')).rows[0].source,'live');
  });
  it('siembra 1000 partidas válidas con semilla cero e ignora lotes repetidos',async () => {
    const querySpy=vi.spyOn(pg.Client.prototype,'query');
    let first,queryCount;
    try {
      first=await processSeedBatch({ seed:0,matches:1000,batchId:'zero-batch' });
      queryCount=querySpy.mock.calls.length;
    } finally { querySpy.mockRestore(); }
    assert.deepEqual(first,{ batchId:'zero-batch',insertedMatches:1000,alreadyExists:false });
    assert.ok(queryCount<=25,'Too many SQL round trips for 1000 matches: ' + queryCount);
    console.log('SEED_1000_SQL_QUERIES=' + queryCount);
    assert.deepEqual(await processSeedBatch({ seed:42,matches:100,batchId:'zero-batch' }),
      { batchId:'zero-batch',insertedMatches:0,alreadyExists:true });
    const { rows }=await pool.query(
      'SELECT COUNT(*) AS bad FROM (SELECT m.id FROM matches m JOIN player_results p ON p.match_id=m.id GROUP BY m.id HAVING SUM(p.control_time_ms)>MAX(m.duration_ms) OR SUM(p.kills)<>SUM(p.deaths)) invalid',
    );
    assert.equal(rows[0].bad,'0');
    assert.equal((await pool.query('SELECT COUNT(*) AS n FROM player_results WHERE score<>FLOOR(control_time_ms/1000)')).rows[0].n,'0');
  },30000);
  it('acepta uint32 máximo y resuelve dos peticiones del mismo lote',async () => {
    const results=await Promise.all([0,1].map(() => processSeedBatch({ seed:0xffffffff,matches:100,batchId:'max-batch' })));
    assert.equal(results.reduce((sum,r) => sum+r.insertedMatches,0),100);
    assert.equal(results.filter(r => r.alreadyExists).length,1);
  },30000);
  it('reproduce estadísticas con la misma semilla y valida límites de entrada',async () => {
    await processSeedBatch({ seed:42,matches:100,batchId:'repeat-a' });
    const query='SELECT m.id,m.started_at_ms,p.player_id,p.score,p.control_time_ms,p.kills,p.deaths,p.alive_ms,p.won,p.draw FROM matches m JOIN player_results p ON p.match_id=m.id';
    const first=(await pool.query(query)).rows;
    const ids=new Set(first.map(r => r.id));
    await processSeedBatch({ seed:42,matches:100,batchId:'repeat-b' });
    const second=(await pool.query(query)).rows.filter(r => !ids.has(r.id));
    const normalize=rows => rows.map(({ id:_id,...r }) => JSON.stringify(r)).sort().join('\n');
    assert.equal(normalize(first),normalize(second));
    for(const input of [
      { seed:NaN,matches:100,batchId:'invalid' },
      { seed:42,matches:99,batchId:'invalid' },
      { seed:42,matches:1001,batchId:'invalid' },
      { seed:42,matches:100,batchId:'bad space' },
    ]) await assert.rejects(processSeedBatch(input),/INVALID_SEED_BATCH/);
  },30000);
  it('revierte usuarios y lote si falla la siembra',async () => {
    await pool.query('CREATE FUNCTION "' + schema + '".reject_seed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.source=\'seed\' THEN RAISE EXCEPTION \'INJECTED_SEED_FAILURE\'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_seed BEFORE INSERT ON matches FOR EACH ROW EXECUTE FUNCTION "' + schema + '".reject_seed()');
    try {
      await assert.rejects(processSeedBatch({ seed:42,matches:100,batchId:'failed-batch' }),/INJECTED_SEED_FAILURE/);
      assert.equal((await pool.query('SELECT COUNT(*) AS n FROM seed_batches')).rows[0].n,'0');
      assert.equal((await pool.query('SELECT COUNT(*) AS n FROM users')).rows[0].n,'2');
    } finally {
      await pool.query('DROP FUNCTION "' + schema + '".reject_seed() CASCADE');
    }
  });
  it('mezcla partidas existentes y nuevas sin duplicar participantes y valida antes de escribir',async () => {
    const existing=fixture(),fresh=fixture();
    await saveMatch(existing);
    assert.deepEqual(await saveMatches([existing,fresh,fresh]),{insertedMatches:1});
    assert.equal((await pool.query('SELECT COUNT(*) AS n FROM matches')).rows[0].n,'2');
    assert.equal((await pool.query('SELECT COUNT(*) AS n FROM player_results')).rows[0].n,'4');
    const invalid=fixture();invalid.durationMs=NaN;
    await assert.rejects(saveMatches([fixture(),invalid]),/INVALID_MATCH_RESULT/);
    assert.equal((await pool.query('SELECT COUNT(*) AS n FROM matches')).rows[0].n,'2');
  });
  it('revierte también bloques anteriores si falla una partida del segundo bloque',async () => {
    const threshold=1700000000000 + 250*180000;
    await pool.query('CREATE FUNCTION "' + schema + '".reject_later_seed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.source=\'seed\' AND NEW.started_at_ms>=' + threshold + ' THEN RAISE EXCEPTION \'INJECTED_LATE_FAILURE\'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_later_seed BEFORE INSERT ON matches FOR EACH ROW EXECUTE FUNCTION "' + schema + '".reject_later_seed()');
    try {
      await assert.rejects(processSeedBatch({seed:42,matches:1000,batchId:'late-fail'}),/INJECTED_LATE_FAILURE/);
      for (const table of ['seed_batches','matches','player_results']) {
        assert.equal((await pool.query('SELECT COUNT(*) AS n FROM ' + table)).rows[0].n,'0');
      }
      assert.equal((await pool.query('SELECT COUNT(*) AS n FROM users')).rows[0].n,'2');
    } finally { await pool.query('DROP FUNCTION "' + schema + '".reject_later_seed() CASCADE'); }
  },30000);
  it('devuelve ceros y lista vacía sin partidas',async () => {
    const result=await getTelemetry();
    assert.equal(result.matches,0);
    assert.equal(result.playerResults,0);
    assert.equal(result.players.length,0);
    assert.ok(Object.values(result.overall).every(n => n===0 && Number.isFinite(n)));
  });
  it('filtra fuentes, excluye abortadas y calcula supervivencia por tiempo',async () => {
    await saveMatch(fixture());
    await saveMatch(fixture(),{ source:'seed' });
    const aborted=fixture();
    Object.assign(aborted,{ status:'aborted',finishReason:'empty',winnerId:null });
    aborted.players.forEach(p => { p.won=false;p.forfeited=true; });
    await saveMatch(aborted);
    const live=await getTelemetry({ source:'live' });
    assert.equal(live.matches,1);
    assert.equal(live.playerResults,2);
    assert.equal(live.overall.winRate,50);
    assert.equal(live.overall.kdr,1);
    assert.equal(live.overall.averageAliveSeconds,75);
    assert.equal(live.overall.survivalRate,50);
    assert.equal(live.overall.averageControlSeconds,7.5);
    const player=live.players.find(p => p.playerId===a.id);
    assert.equal(player.winRate,100);
    assert.equal(player.kdr,2);
    assert.ok(Math.abs(player.survivalRate-100*100000/150000)<0.000001);
    assert.equal((await getTelemetry({ source:'seed' })).matches,1);
    assert.equal((await getTelemetry()).matches,2);
  });
});
