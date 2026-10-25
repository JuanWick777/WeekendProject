# B2 — Salas y WebSockets con autenticación inyectada

Integrado en main mediante el PR #3: administrador de salas en memoria, rutas protegidas, conexiones WebSocket autenticadas, difusión de lobby, ping/pong, heartbeat, límites y reconexión. B2 se verificó con 41 pruebas; B3 eleva el total a 72, con lint y build aprobados. Las pruebas usan HTTP/WebSocket reales y repositorios de usuarios/sesiones aislados; **no acreditan PostgreSQL ni el cliente jugable**. Ver [simulación B3](game-server.md).

## Integración con C

C entrega los mismos users/sessions de contracts.md. No hay una dependencia nueva de base de datos para las salas. B conecta estos repositorios en index.js mediante el runtime común:

~~~js
import { createAuthService } from './auth/auth-service.js';
import { createServerRuntime } from './runtime.js';

const authService = createAuthService({ users, sessions });
const runtime = createServerRuntime({
  authService,
  saveMatch: (result) => matches.saveMatch(result),
  appOrigin: config.appOrigin,
  nodeEnv: config.nodeEnv,
});
const { server } = runtime;
// Arrancar server.listen según la configuración existente.
// Al apagar: await runtime.close(); después cerrar el pool de C.
~~~

Los repositorios users/sessions/matches y su inicialización siguen pendientes de C. El arranque normal aún devuelve AUTH_NOT_READY sin ellos y rechaza upgrades con 503. No se habilita un repositorio de memoria como fallback de producción. Las salas activas son transitorias por diseño; las cuentas, sesiones y resultados finales necesitan persistencia.

## Recorrido que B debe conectar; A revisa diseño

1. Registrar/iniciar sesión por HTTP con rutas relativas. El navegador guarda cg_session.
2. Abrir un solo socket por usuario después del login; esperar welcome. El navegador adjunta la cookie y Origin automáticamente.
3. Crear sala o entrar con su código por HTTP; leer las vistas de lobby transmitidas. GET me ahora incluye roomCode.
4. Marcar Listo usando PATCH. Hace falta conexión WebSocket vigente para estar listo y todos deben estar conectados/listos antes de iniciar.
5. Solo el anfitrión solicita start. El runtime ya conecta B3: se muestra countdown y después llega match:start; perder un participante/conexión o quitar Listo cancela countdown.
6. Salir por HTTP limpia la pertenencia. El socket del que sale recibe lobby con payload null; los demás reciben la vista actualizada y, si corresponde, otro anfitrión.

~~~js
const url = new URL('/ws', window.location.href);
url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(url);

socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  // welcome: identidad, roomCode y nextInputSeq.
  // lobby: vista completa de sala o null para limpiar la vista.
  // pong: eco de id/sentAtMs; medir RTT en el reloj del cliente.
  // error: code/message para mostrar el estado adecuado.
});
~~~

POST join/leave/start/rematch acepta ausencia de body o un objeto vacío; rechaza campos adicionales. Identidad y pertenencia se resuelven en servidor. Todos los POST/PATCH exigen Origin permitido, igual que auth. Las vistas nunca contienen hashes ni tokens.

## Estado de la simulación

**B3 está conectado por defecto en createServerRuntime.** Countdown inicia la simulación con mapa generado y validado; state/event/match:end salen del servidor real. Si se desactiva explícitamente la simulación (`enableGame: false`) y no se aporta un manejador, start conserva el lobby y responde 503 GAME_NOT_READY.

Estos puntos del runtime ya están conectados por B3; no hace falta que A/C implementen manejadores alternativos:

- `onStartMatch({ matchId, seed, roomCode, startedAtMs, players })`: manejador síncrono que crea la simulación, el mapa validado y el primer mensaje de partida. Se llama una vez al terminar countdown; un fallo devuelve a lobby, limpia Listo y notifica MATCH_START_FAILED.
- `onInput({ userId, roomCode, input, receivedAtMs })`: recibe únicamente payloads Zod válidos, con secuencia creciente del socket vigente y en playing. No consulta la base por input. Es un manejador síncrono de intención para la simulación.
- `onPlayerLeft({ roomCode, userId, wasPlaying })`: avisa de salida voluntaria o expiración de gracia; B3 resuelve abandono, ganador y guardado final.
- `runtime.sockets.broadcast(roomCode, type, payload)`: enviar mapa/snapshots/eventos/resultados a miembros de esa sala.
- `runtime.rooms.markFinished(roomCode)`: pasar de playing a finished cuando la simulación realmente termine.
- Rematch, solo del host y en finished, vuelve a lobby y limpia Listo. El siguiente inicio genera otro matchId y semilla.

B3 detiene el input del desconectado mediante las actualizaciones de sala y aplica caducidad de 250 ms. Al reconectar recupera mapa y estado físico sin reiniciar estadísticas. En welcome el cliente limpia inputs pendientes y adopta nextInputSeq; lastProcessedSeq comienza en -1 para esa conexión. El resultado y la llamada de guardado están implementados; falta conectar matches.saveMatch de PostgreSQL. Detalle en [game-server.md](game-server.md).

## Reconexión, sesión y límites

- Una conexión vigente por usuario. Una nueva sustituye la anterior con código 4001; su cierre no desconecta al jugador nuevo. A debe evitar que dos pestañas entren en un ciclo de reconexión que se reemplace mutuamente.
- Al desconectarse se quita Listo y se conserva la pertenencia hasta 15 s. Reconectar recupera el mismo miembro; al vencer se retira y transfiere host si hace falta. Una sala sin miembros se elimina. Crear/entrar sin abrir socket también tiene ese plazo.
- Logout o rotación de la cookie cierra inmediatamente el socket de esa sesión con 4401. A debe volver a autenticar antes de reintentar; otras sesiones independientes no se invalidan globalmente.
- Se comprueba la fecha de expiración antes de procesar mensajes. Heartbeat ping/pong del transporte cada 15 s detecta conexiones muertas y revalida la sesión; evita consultas de base por input.
- Mensaje máximo 4096 bytes, 60 mensajes/s por conexión, cierre tras tres payloads inválidos, y límite global de 200 conexiones/upgrades pendientes. Los excesos no alteran estado de juego.
- 1008 indica incumplimiento del protocolo/límite; 1009, mensaje demasiado grande; 1013, autenticación temporalmente indisponible. Un 1006 puede ser pérdida de red: reintentar con espera creciente dentro del plazo de gracia.
- Se limita el buffer de salida y se fuerzan cierres que no completan el handshake. runtime.close limpia sockets y timers antes de cerrar HTTP.

El patrón de upgrade autenticado y heartbeat usa las APIs de [ws](https://github.com/websockets/ws#client-authentication). RTT de aplicación se mide aparte con los mensajes ping/pong del contrato; todavía falta medirlo en la URL pública.

## Pruebas y pendientes

server/test/rooms.test.js cubre permisos/capacidad, fases, countdown, fallos de inicio, reconexión, abandono, revancha y limpieza. server/test/network.test.js comprueba dos cuentas, rutas HTTP, cookies/sockets, lobby, mensajes, Origin, expiración, logout, heartbeat e inputs en fase válida usando conexiones reales. Los tests previos de auth siguen pasando.

B3 añade pruebas de mapas, daño, simulación y partida sobre HTTP/WebSocket real. Siguen pendientes integración PostgreSQL, cliente online de B, interpolación y los tres E2E de navegador de C. El número total de pruebas no sustituye esas áreas de la rúbrica.
