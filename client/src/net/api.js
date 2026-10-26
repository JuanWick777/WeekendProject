import { API_ROUTES, roomPath } from '@cybergrid/shared/protocol';

export class ApiError extends Error {
  constructor(code, message, status = 0) { super(message); this.name = 'ApiError'; this.code = code; this.status = status; }
}
export function createApi({ fetchImpl = (...args) => fetch(...args), timeoutMs = 10000 } = {}) {
  async function request(path, method = 'GET', body) {
    const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), timeoutMs);
    try {
      const response = await fetchImpl(path, { method, credentials: 'same-origin', cache: 'no-store', signal: abort.signal,
        ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
      let data;
      try { data = await response.json(); } catch { throw new ApiError('INVALID_RESPONSE','El servidor devolvió una respuesta inesperada.',response.status); }
      if (!response.ok || data.ok !== true) throw new ApiError(data.error?.code ?? 'HTTP_ERROR',data.error?.message ?? 'No se pudo completar la solicitud.',response.status);
      return data.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('NETWORK_ERROR',abort.signal.aborted ? 'La solicitud tardó demasiado. Revisa tu conexión.' : 'No se pudo conectar con el servidor.');
    } finally { clearTimeout(timer); }
  }
  return {
    health: () => request(API_ROUTES.HEALTH), me: () => request(API_ROUTES.ME),
    login: (data) => request(API_ROUTES.LOGIN,'POST',data), register: (data) => request(API_ROUTES.REGISTER,'POST',data),
    logout: () => request(API_ROUTES.LOGOUT,'POST'),
    createRoom: (name) => request(API_ROUTES.ROOMS,'POST',{name}),
    getRoom: (code) => request(roomPath(code)),
    joinRoom: (code) => request(roomPath(code,'join'),'POST'),
    leaveRoom: (code) => request(roomPath(code,'leave'),'POST'),
    ready: (code,ready) => request(roomPath(code,'ready'),'PATCH',{ready}),
    start: (code) => request(roomPath(code,'start'),'POST'),
    rematch: (code) => request(roomPath(code,'rematch'),'POST'),
  };
}
export async function getHealth() { return { ok:true,data:await createApi().health() }; }
