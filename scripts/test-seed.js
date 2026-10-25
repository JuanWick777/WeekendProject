import { createUser } from '../server/src/storage/users.js';
import { processSeedBatch } from '../server/src/storage/seedService.js';
import { pool } from '../server/src/storage/pool.js';
import crypto from 'node:crypto';

async function runSeedTest() {
  console.log('🧪 Probando servicio de siembra de partidas (seedService)...');

  const testSuffix = Date.now();
  const user = await createUser({
    username: `seed_user_${testSuffix}`,
    displayName: 'Seed Tester',
    passwordHash: 'hash'
  });

  const batchId = `batch_${crypto.randomUUID()}`;
  const seed = 999;

  // 1. Ejecución inicial del lote de siembra
  const res1 = await processSeedBatch({
    seed,
    matches: 100,
    batchId,
    defaultUserId: user.id
  });

  if (!res1.alreadyExists && res1.insertedMatches === 100) {
    console.log(`✅ Lote procesado exitosamente: ${res1.insertedMatches} partidas sintéticas guardadas.`);
  } else {
    throw new Error('❌ Falló la inserción del lote sintético.');
  }

  // 2. Probar idempotencia (repetir el mismo batchId)
  const res2 = await processSeedBatch({
    seed,
    matches: 100,
    batchId,
    defaultUserId: user.id
  });

  if (res2.alreadyExists && res2.insertedMatches === 0) {
    console.log('✅ Idempotencia de lote verificada: el batchId repetido fue ignorado.');
  } else {
    throw new Error('❌ Falló la verificación de idempotencia del lote.');
  }

  // Limpieza
  await pool.query('DELETE FROM player_results WHERE player_id = $1', [user.id]);
  await pool.query('DELETE FROM matches WHERE source = \'seed\' AND seed = $1', [seed]);
  await pool.query('DELETE FROM seed_batches WHERE batch_id = $1', [batchId]);
  await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
  await pool.end();

  console.log('🧹 Limpieza finalizada. Lote de siembra validado.');
}

runSeedTest().catch((err) => {
  console.error('❌ Error durante la prueba de siembra:', err);
  process.exit(1);
});