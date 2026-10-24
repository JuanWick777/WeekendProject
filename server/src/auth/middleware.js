import { AuthError } from './auth-error.js';
import { readSessionToken } from './session.js';

export function requireAuthReady(authService) {
  return (_request, _response, next) => {
    if (!authService) {
      throw new AuthError(503, 'AUTH_NOT_READY', 'La persistencia de autenticación aún no está conectada.');
    }
    next();
  };
}

export function requireAllowedOrigin(appOrigin) {
  return (request, _response, next) => {
    if (request.get('origin') !== appOrigin) {
      throw new AuthError(403, 'ORIGIN_FORBIDDEN', 'El origen de la solicitud no está permitido.');
    }
    next();
  };
}

export function requireSession(authService) {
  return async (request, _response, next) => {
    if (!authService) {
      throw new AuthError(503, 'AUTH_NOT_READY', 'La persistencia de autenticación aún no está conectada.');
    }
    const user = await authService.authenticateSession(readSessionToken(request.headers.cookie));
    if (!user) throw new AuthError(401, 'UNAUTHENTICATED', 'Inicia sesión para continuar.');
    request.user = user;
    next();
  };
}
