import { createUser } from '../server/src/storage/users.js';
import { saveMatch } from '../server/src/storage/matches.js';
import { getTelemetry } from '../server/src/telemetry/telemetryService.js';
import { pool } from '../server/src/storage/pool.js';
import crypto from 'node:crypto';

async function runTelemetryTest() {
  console.log('🧪 Probando servicio de telemetría (telemetryService)...');

  // 1. Probar división por cero en un filtro sin datos
  const emptyTelemetry = await getTelemetry({ source: 'live', userId: crypto.randomUUID() });
  if (
    emptyTelemetry.winRate === 0 &&
    emptyTelemetry.kdr === 0 &&
    emptyTelemetry.survivalRate === 0 &&
    emptyTelemetry.averageAliveSeconds === 0 &&
    emptyTelemetry.averageControlSeconds === 0
  ) {
    console.log('✅ Control de división por cero verificado (retorna 0 sin NaN o Infinity).');
  } else {
    throw new Error('❌ Falló la prevención de división por cero.');
  }

  // 2. Crear datos de prueba para verificar cálculos
  const testSuffix = Date.now();
  const user = await createUser({
    username: `telem_user_${testSuffix}`,
    displayName: 'Telemetry Tester',
    passwordHash: 'hash'
  });

  const matchId1 = crypto.randomUUID();
  const matchId2 = crypto.randomUUID();

  // Partida 1: Live (Victoria, 4 kills, 1 muerte, 10s control, 20s alive, 30s duracion)
  await saveMatch({
    id: matchId1,
    seed: 101,
    status: 'completed',
    startedAtMs: 1729830000000,
    endedAtMs: 1729830030000,
    durationMs: 30000,
    winnerId: user.id,
    source: 'live',
    players: [
      {
        userId: user.id,
        displayName: user.displayName,
        score: 1000,
        controlTimeMs: 10000,
        kills: 4,
        deaths: 1,
        aliveMs: 20000,
        participatedMs: 30000,
        won: true,
        draw: false,
        forfeited: false
      }
    ]
  });

  // Partida 2: Seed (Derrota, 2 kills, 2 muertes, 5s control, 10s alive, 30s duracion)
  await saveMatch({
    id: matchId2,
    seed: 102,
    status: 'completed',
    startedAtMs: 1729830040000,
    endedAtMs: 1729830070000,
    durationMs: 30000,
    winnerId: null,
    source: 'seed',
    players: [
      {
        userId: user.id,
        displayName: user.displayName,
        score: 400,
        controlTimeMs: 5000,
        kills: 2,
        deaths: 2,
        aliveMs: 10000,
        participatedMs: 30000,
        won: false,
        draw: false,
        forfeited: false
      }
    ]
  });

  // 3. Probar métricas agregadas globales para el usuario
  const userTelemetry = await getTelemetry({ userId: user.id });

  if (
    userTelemetry.winRate === 0.5 &&
    userTelemetry.kdr === 2 &&
    userTelemetry.averageAliveSeconds === 15 &&
    userTelemetry.averageControlSeconds === 7.5
  ) {
    console.log('✅ Cálculos agregados SQL de telemetría verificados correctamente.');
  } else {
    console.error('Resultado obtenido:', userTelemetry);
    throw new Error('❌ Fallaron las métricas de telemetría calculadas.');
  }

  // Limpieza
  await pool.query('DELETE FROM player_results WHERE player_id = $1', [user.id]);
  await pool.query('DELETE FROM matches WHERE id IN ($1, $2)', [matchId1, matchId2]);
  await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
  await pool.end();

  console.log('🧹 Limpieza finalizada. Fase 3 (Telemetría) validada.');
}

runTelemetryTest().catch((err) => {
  console.error('❌ Error durante la prueba de telemetría:', err);
  process.exit(1);
});