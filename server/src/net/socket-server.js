/**
 * B reemplazará este cierre explícito por el upgrade autenticado de ws.
 * La base no acepta conexiones de juego sin una sesión validada.
 */
export function attachSocketServer(server) {
  server.on('upgrade', (_request, socket) => {
    socket.end(
      'HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n',
    );
  });
}
