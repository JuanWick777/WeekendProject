import { readConfig } from './config.js';
import { createServerRuntime } from './runtime.js';
import { loadPostgresServices } from './postgres-services.js';

const config = readConfig();
let services; let runtime; let closing = false;
async function shutdown(code = 0) {
  if (closing) return; closing = true;
  const timeout = setTimeout(() => process.exit(1),5000); timeout.unref();
  try { await runtime?.close(); await services?.close(); clearTimeout(timeout); process.exitCode = code; }
  catch { process.exitCode = 1; }
}
try {
  services = await loadPostgresServices();
  runtime = createServerRuntime({appOrigin:config.appOrigin,nodeEnv:config.nodeEnv,...services});
  runtime.server.on('error',()=>{console.error('No se pudo abrir el puerto del servidor.');void shutdown(1);});
  runtime.server.listen(config.port,config.host,()=>console.log('CyberGrid disponible en http://'+config.host+':'+config.port));
  process.once('SIGINT',()=>void shutdown());
  process.once('SIGTERM',()=>void shutdown());
} catch {
  console.error('No se pudo iniciar CyberGrid: comprueba DATABASE_URL (o TEST_DATABASE_URL en pruebas), el esquema y los módulos de C.');
  await shutdown(1);
}
