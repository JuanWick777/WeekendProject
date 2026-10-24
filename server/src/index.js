import { readConfig } from './config.js';
import { createServerRuntime } from './runtime.js';

const config = readConfig();
// B wires C's PostgreSQL repositories with createAuthService({ users, sessions }).
const runtime = createServerRuntime({ appOrigin: config.appOrigin, nodeEnv: config.nodeEnv });
const { server } = runtime;

server.on('error', (error) => {
  console.error('No se pudo iniciar el servidor: ' + error.message);
  process.exitCode = 1;
});

server.listen(config.port, config.host, () => {
  console.log('CyberGrid HTTP: http://' + config.host + ':' + config.port);
  console.log('Auth, salas y WebSockets preparados; PostgreSQL y simulación pendientes de integración.');
});

function shutdown() {
  runtime.close().then(() => process.exit(0), () => process.exit(1));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
