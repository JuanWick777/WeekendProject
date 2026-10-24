export const PROTOCOL_VERSION = 1;

export const ROOM_STATES = Object.freeze({
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  FINISHED: 'finished',
});

export const CLIENT_MESSAGES = Object.freeze({
  INPUT: 'input',
  PING: 'ping',
});

export const SERVER_MESSAGES = Object.freeze({
  WELCOME: 'welcome',
  LOBBY: 'lobby',
  MATCH_START: 'match:start',
  STATE: 'state',
  EVENT: 'event',
  MATCH_END: 'match:end',
  PONG: 'pong',
  ERROR: 'error',
});

export const API_ROUTES = Object.freeze({
  HEALTH: '/api/health',
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  ROOMS: '/api/rooms',
  TELEMETRY: '/api/test/telemetry',
  SEED: '/api/test/seed',
});

export function roomPath(code, action = '') {
  const base = API_ROUTES.ROOMS + '/' + encodeURIComponent(code);
  return action ? base + '/' + encodeURIComponent(action) : base;
}
