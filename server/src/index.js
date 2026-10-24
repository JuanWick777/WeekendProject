import { createServer } from 'node:http';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { attachSocketServer } from './net/socket-server.js';

const config = readConfig();
// B wires C's PostgreSQL repositories with createAuthService({ users, sessions }).
const server = createServer(createApp({ appOrigin: config.appOrigin, nodeEnv: config.nodeEnv }));
attachSocketServer(server);

server.on('error', (error) => {
  console.error('No se pudo iniciar el servidor: ' + error.message);
  process.exitCode = 1;
});

server.listen(config.port, config.host, () => {
  console.log('CyberGrid HTTP: http://' + config.host + ':' + config.port);
  console.log('Auth HTTP preparado; persistencia, salas y simulación pendientes de integración.');
});

function shutdown() {
  server.close(() => process.exit(0));
  server.closeIdleConnections();
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
