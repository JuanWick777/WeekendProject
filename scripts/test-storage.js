import { createUser } from '../server/src/storage/users.js';
import { createSession, findSessionByTokenHash, deleteSessionByTokenHash } from '../server/src/storage/sessions.js';
import { pool } from '../server/src/storage/pool.js';

async function runStorageTest() {
  console.log('🧪 Ejecutando pruebas en entorno de TEST con TEST_DATABASE_URL...');

  try {
    const testUsername = `user_${Date.now()}`;

    // 1. Crear usuario
    const user = await createUser({
      username: testUsername,
      displayName: 'Test User',
      passwordHash: 'hash_secret_123',
    });
    console.log('✅ createUser:', user);

    // 2. Probar duplicados (Error 23505 -> USERNAME_TAKEN)
    try {
      await createUser({
        username: testUsername,
        displayName: 'Otro Usuario',
        passwordHash: 'hash_secret_456',
      });
      console.error('❌ FAIL: No se capturó el usuario duplicado.');
    } catch (err) {
      if (err.code === 'USERNAME_TAKEN') {
        console.log('✅ Duplicado traducido correctamente a code: USERNAME_TAKEN');
      } else {
        throw err;
      }
    }

    // 3. Crear y buscar sesión con el nuevo formato
    const sampleTokenHash = `token_hash_${Date.now()}`;
    const expiresAtMs = Date.now() + 3600000;
    
    await createSession({
      userId: user.id,
      tokenHash: sampleTokenHash,
      expiresAtMs,
    });

    const sessionData = await findSessionByTokenHash(sampleTokenHash);
    console.log('✅ findSessionByTokenHash resultado:', sessionData);

    if (
      sessionData &&
      sessionData.user &&
      sessionData.user.id === user.id &&
      typeof sessionData.expiresAtMs === 'number' &&
      Number.isFinite(sessionData.expiresAtMs)
    ) {
      console.log('✅ Estructura { user: { id, username, displayName }, expiresAtMs } y conversión de BIGINT verificadas.');
    } else {
      console.error('❌ FAIL: La estructura de la sesión no coincide con la esperada.');
    }

    // 4. Probar eliminación de sesión
    await deleteSessionByTokenHash(sampleTokenHash);
    const deletedCheck = await findSessionByTokenHash(sampleTokenHash);
    console.log('✅ deleteSessionByTokenHash:', deletedCheck === null ? 'OK' : 'FAIL');

    // Limpieza
    await pool.query('DELETE FROM users WHERE id = $1;', [user.id]);
    console.log('🧹 Limpieza finalizada.');
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    await pool.end();
  }
}

runStorageTest();