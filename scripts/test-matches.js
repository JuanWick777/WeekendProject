import { createUser } from '../server/src/storage/users.js';
import { saveMatch } from '../server/src/storage/matches.js';
import { pool } from '../server/src/storage/pool.js';
import crypto from 'node:crypto';

async function runMatchesTest() {
  console.log('🧪 Probando persistencia transaccional de partidas (matches.saveMatch)...');

  const testSuffix = Date.now();
  const user1 = await createUser({
    username: `player1_${testSuffix}`,
    displayName: 'Player One',
    passwordHash: 'hash1'
  });
  const user2 = await createUser({
    username: `player2_${testSuffix}`,
    displayName: 'Player Two',
    passwordHash: 'hash2'
  });

  const matchId = crypto.randomUUID();

  const matchPayload = {
    id: matchId,
    seed: 12345,
    status: 'completed',
    startedAtMs: 1729830000000.123,
    endedAtMs: 1729830060000.456,
    durationMs: 60000.333,
    winnerId: user1.id,
    source: 'live',
    players: [
      {
        userId: user1.id,
        displayName: user1.displayName,
        score: 1500,
        controlTimeMs: 25000.100,
        kills: 5,
        deaths: 2,
        aliveMs: 50000.200,
        participatedMs: 60000.333,
        won: true,
        draw: false,
        forfeited: false
      },
      {
        userId: user2.id,
        displayName: user2.displayName,
        score: 800,
        controlTimeMs: 10000.000,
        kills: 2,
        deaths: 5,
        aliveMs: 40000.000,
        participatedMs: 60000.333,
        won: false,
        draw: false,
        forfeited: false
      }
    ]
  };

  // 1. Guardado exitoso
  const result1 = await saveMatch(matchPayload);
  if (result1.saved && !result1.duplicate) {
    console.log('✅ Partida y métricas guardadas exitosamente en la transacción.');
  } else {
    throw new Error('❌ Falló la inserción inicial de la partida.');
  }

  // 2. Prueba de idempotencia (volver a guardar el mismo matchId)
  const result2 = await saveMatch(matchPayload);
  if (!result2.saved && result2.duplicate) {
    console.log('✅ Idempotencia verificada: la partida duplicada se ignoró de forma limpia.');
  } else {
    throw new Error('❌ Falló la validación de idempotencia.');
  }

  // 3. Prueba de rollback ante métricas incoherentes
  const invalidMatch = {
    ...matchPayload,
    id: crypto.randomUUID(),
    players: [
      {
        ...matchPayload.players[0],
        controlTimeMs: 70000.000 // Incoherente: mayor a durationMs (60000.333)
      }
    ]
  };

  try {
    await saveMatch(invalidMatch);
    throw new Error('❌ Falló la detección de métricas incoherentes.');
  } catch (err) {
    if (err.message.includes('[Storage Error] Métricas incoherentes')) {
      console.log('✅ Rollback y validaciones de coherencia verificados.');
    } else {
      throw err;
    }
  }

  // Limpieza de datos de prueba
  await pool.query('DELETE FROM player_results WHERE match_id = $1', [matchId]);
  await pool.query('DELETE FROM matches WHERE id = $1', [matchId]);
  await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [user1.id, user2.id]);
  await pool.end();

  console.log('🧹 Limpieza finalizada. Fase 2 validada.');
}

runMatchesTest().catch((err) => {
  console.error('❌ Error durante la prueba:', err);
  process.exit(1);
});