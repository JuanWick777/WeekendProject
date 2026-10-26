import { createAuthService } from './auth/auth-service.js';

// C owns these modules. No in-memory authentication or synthetic live results.
export async function loadPostgresServices() {
  const { pool } = await import('./storage/pool.js');
  try {
    const { rows } = await pool.query("SELECT to_regclass('users') AS users,to_regclass('sessions') AS sessions,to_regclass('matches') AS matches,to_regclass('player_results') AS results,to_regclass('seed_batches') AS batches");
    if (!rows[0] || Object.values(rows[0]).some((value) => value === null)) throw new Error('SCHEMA_NOT_INITIALIZED');
    const [users,sessions,{saveMatch},{processSeedBatch},{getTelemetry}] = await Promise.all([
      import('./storage/users.js'),import('./storage/sessions.js'),import('./storage/matches.js'),
      import('./storage/seedService.js'),import('./telemetry/telemetryService.js'),
    ]);
    return {
      authService:createAuthService({users,sessions}),saveMatch,databaseReady:true,
      evaluationService:{processSeedBatch,getTelemetry},close:()=>pool.end(),
    };
  } catch (error) {
    await pool.end();
    throw new Error('No se pudo preparar PostgreSQL. Revisa la conexión y ejecuta db:init con el entorno correcto.',{cause:error});
  }
}
