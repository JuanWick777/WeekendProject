import { createServer } from 'node:http';
import { createApp } from './app.js';
import { createRoomManager } from './rooms/room-manager.js';
import { attachSocketServer } from './net/socket-server.js';
import { createGameManager } from './game/game-manager.js';

export function createServerRuntime({
  authService = null, appOrigin = 'http://127.0.0.1:5173', nodeEnv = 'development',
  onStartMatch = null, onInput = null, onPlayerLeft = null,
  now = Date.now, roomOptions, socketOptions, clientDist,
  enableGame = true, saveMatch = null, gameOptions, databaseReady = false,
} = {}) {
  let games;
  const rooms = createRoomManager({
    ...roomOptions, now,
    onStartMatch: onStartMatch ?? (enableGame ? (context) => games.start(context) : null),
  });
  let sockets;
  const app = createApp({
    authService, appOrigin, nodeEnv, clientDist, roomManager: rooms,
    websocketReady: Boolean(authService),
    simulationReady: enableGame, databaseReady,
    onSessionInvalidated: (token) => sockets.closeSession(token),
  });
  const server = createServer(app);
  sockets = attachSocketServer(server, {
    ...socketOptions, authService, roomManager: rooms, appOrigin, now,
    onInput: onInput ?? ((input) => games?.acceptInput(input) ?? false),
    onConnected: (connection) => games?.reconnect(connection),
    onPlayerLeft: (event) => { games?.playerLeft(event); onPlayerLeft?.(event); },
  });
  games = enableGame ? createGameManager({ ...gameOptions, rooms, sockets, saveMatch }) : null;
  server.once('close', () => { rooms.dispose(); void games?.close(); });
  return Object.freeze({
    app, server, rooms, sockets, games,
    async close() {
      sockets.close();
      rooms.dispose();
      let stopped = Promise.resolve();
      if (server.listening) {
        stopped = new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        server.closeIdleConnections();
      }
      await Promise.all([games?.close(), stopped]);
    },
  });
}
