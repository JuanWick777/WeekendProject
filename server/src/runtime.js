import { createServer } from 'node:http';
import { createApp } from './app.js';
import { createRoomManager } from './rooms/room-manager.js';
import { attachSocketServer } from './net/socket-server.js';

export function createServerRuntime({
  authService = null, appOrigin = 'http://127.0.0.1:5173', nodeEnv = 'development',
  onStartMatch = null, onInput = null, onPlayerLeft = null,
  now = Date.now, roomOptions, socketOptions, clientDist,
} = {}) {
  const rooms = createRoomManager({ ...roomOptions, now, onStartMatch });
  let sockets;
  const app = createApp({
    authService, appOrigin, nodeEnv, clientDist, roomManager: rooms,
    websocketReady: Boolean(authService),
    onSessionInvalidated: (token) => sockets.closeSession(token),
  });
  const server = createServer(app);
  sockets = attachSocketServer(server, {
    ...socketOptions, authService, roomManager: rooms, appOrigin, now, onInput, onPlayerLeft,
  });
  server.once('close', () => rooms.dispose());
  return Object.freeze({
    app, server, rooms, sockets,
    async close() {
      sockets.close();
      rooms.dispose();
      if (server.listening) {
        const stopped = new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        server.closeIdleConnections();
        await stopped;
      }
    },
  });
}
