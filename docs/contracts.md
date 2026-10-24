# Contrato técnico v1

Referencia común para A, B y C. Coordinar cambios antes de integrar. Las firmas de esta guía son acuerdos de implementación; solamente constants.js, protocol.js y los esquemas de entrada están implementados en el bootstrap.

## Lenguaje, unidades y responsabilidades

- JavaScript ESM. Variables camelCase, constantes UPPER_SNAKE_CASE y archivos kebab-case.js.
- Código/protocolo en inglés; UI en español.
- Coordenadas de centros en unidades del mundo; eje x hacia la derecha, eje y hacia abajo.
- Tiempos del protocolo en ms; delta interno de simulación en segundos con nombre dtSeconds.
- Servidor a 30 ticks/s, input a 20/s, snapshots a 15/s y render objetivo 60 FPS.
- shared/ contiene reglas importables; importar una regla en cliente no concede autoridad.
- Servidor decide posición, paredes, proyectiles, inventario, daño y puntuación.
- Un proceso para salas/partidas en memoria; PostgreSQL para cuentas, sesiones y resultados.

## HTTP

Desarrollo: cliente http://127.0.0.1:5173 y API http://127.0.0.1:3000. Vite hace proxy de /api y /ws; el cliente usa rutas relativas. En producción, un origen HTTPS sirve cliente, API y sockets.

Éxito: { ok: true, data: ... }. Error: { ok: false, error: { code, message } }. Todas las operaciones exitosas de la tabla responden 200; errores usan 400, 401, 403, 404, 409, 413 o 429 según corresponda.

| Método | Ruta | Entrada o función |
| --- | --- | --- |
| GET | /api/health | Liveness; en bootstrap declara servicios pendientes |
| POST | /api/auth/register | { username, displayName, password }; crea usuario y sesión |
| POST | /api/auth/login | { username, password }; crea sesión |
| POST | /api/auth/logout | Invalida cookie/sesión; { loggedOut: true } |
| GET | /api/auth/me | { user, roomCode }; 401 sin sesión |
| POST | /api/rooms | { name }; devuelve vista de sala |
| GET | /api/rooms/:code | Vista de sala; requiere pertenencia |
| POST | /api/rooms/:code/join | Entrada a sala; devuelve vista de sala |
| POST | /api/rooms/:code/leave | Salida; { left: true } |
| PATCH | /api/rooms/:code/ready | { ready: boolean }; devuelve vista de sala |
| POST | /api/rooms/:code/start | Solo host; devuelve vista countdown |
| POST | /api/rooms/:code/rematch | Solo host; devuelve nuevo lobby |
| GET | /api/test/telemetry | Agregados; filtro source=all, live o seed |
| POST | /api/test/seed | { seed, matches, batchId } |

Usuario público: { id, username, displayName }. username se normaliza a minúsculas; displayName conserva presentación. No devolver passwordHash, tokenHash ni token de sesión en JSON.

Vista de sala: { code, name, hostId, status, countdownEndsAtMs, players: [{ id, displayName, ready, connected }] }. countdownEndsAtMs es null fuera de countdown. La sesión decide el jugador: no aceptar userId o playerId del cliente para actuar por otra persona.

## Sesiones

Cookie cg_session: HttpOnly, SameSite=Lax, Path=/, Secure en producción. Token aleatorio con hash persistido; plazo inicial 24 horas. Comprobar Origin en upgrade WebSocket y operaciones que cambian estado. APP_ORIGIN coincide con la URL de navegador; configuración de secretos solo en servidor.

## WebSocket

Ruta /ws. El usuario ya autenticado recibe sus cambios de sala; no puede suscribirse a otra sala mediante un playerId o roomId arbitrario. Validar mensajes con shared/schemas y limitar payload a 4096 bytes.

Input:

~~~json
{
  "type": "input",
  "payload": {
    "seq": 42,
    "moveX": 1,
    "moveY": 0,
    "aimX": 0,
    "aimY": -1,
    "attack": true
  }
}
~~~

Cada componente es finito y está entre -1 y 1. El servidor normaliza movimiento diagonal y dirección de apuntado; disparar requiere dirección distinta de cero. Sin input reciente: movimiento cero y attack false. No confiar en dt, posición, inventario, vida ni daño del cliente.

seq es entero creciente por conexión. Tras reconectar, welcome proporciona nextInputSeq y se ignoran mensajes del socket sustituido.

Ping: { type: 'ping', payload: { id, sentAtMs } }. Pong devuelve esos dos campos; RTT se calcula en el mismo reloj del cliente al recibir la respuesta. Es una medición de ida y vuelta, no latencia de una sola dirección.

| Tipo servidor | Payload |
| --- | --- |
| welcome | { protocolVersion, user, roomCode, nextInputSeq } |
| lobby | Vista de sala |
| match:start | { matchId, map, endsAtMs, config, state } |
| state | Snapshot definido abajo |
| event | { eventId, tick, kind, actorId, targetId?, x, y } |
| match:end | MatchResult definido abajo |
| pong | { id, sentAtMs } |
| error | { code, message } |

Map: { seed, columns, rows, tileSize, tiles, node }. tiles es un array por filas: 0 libre, 1 pared. node: { x, y, radius }. El servidor conserva el mapa y lo reenvía en una reconexión a partida en curso.

Snapshot:

~~~text
{
  matchId, tick, serverTimeMs, remainingMs,
  players: [{
    id, displayName, x, y, aimX, aimY, hp, carry, score, kills, deaths,
    alive, connected, respawnRemainingMs, syncProgress, lastProcessedSeq
  }],
  pickups: [{ id, x, y, value }],
  projectiles: [{ id, ownerId, x, y, dirX, dirY }]
}
~~~

syncProgress está entre 0 y 1. A interpola rivales/proyectiles y corrige la predicción local con el servidor. Los eventos son efectos visuales deduplicados por eventId: shot, hit, death, sync y respawn. Nunca suman daño o puntos en cliente.

El HUD/diagnóstico refleja x/y recibidos en atributos data-player-x y data-player-y de un elemento con data-testid="player-state". Estas coordenadas representan el estado autoritativo, no la predicción visual. Los E2E envían controles y esperan esos cambios reales.

MatchResult:

~~~text
{
  matchId, roomCode, seed, startedAtMs, endedAtMs, durationMs,
  status: 'completed' | 'aborted',
  finishReason: 'time' | 'forfeit' | 'empty',
  winnerId: string | null,
  drawPlayerIds: string[],
  players: [{
    playerId, displayName, score, kills, deaths, aliveMs,
    participatedMs, won, draw, forfeited
  }]
}
~~~

En empate winnerId es null, drawPlayerIds contiene los empatados y no se atribuye victoria individual. No incluir sockets, mapas completos, tokens o funciones en el objeto persistido.

## Persistencia: primeras interfaces que C entrega a B

Todas son asíncronas. La forma exacta debe mantenerse común o revisarse con el equipo:

~~~text
users.createUser({ username, displayName, passwordHash }) -> User público
users.findUserByUsername(username) -> User con passwordHash, o null
users.findUserById(id) -> User público, o null
sessions.createSession({ userId, tokenHash, expiresAtMs }) -> void
sessions.findSessionByTokenHash(tokenHash) -> { user, expiresAtMs }, o null
sessions.deleteSessionByTokenHash(tokenHash) -> void
matches.saveMatch(matchResult) -> void
~~~

username único normalizado; tokenHash único; matches.match_id único. saveMatch debe guardar cabecera/resultados de manera atómica e idempotente. No repetir la partida ante reconexión o retransmisión del evento final.

Los repositorios convierten los valores numéricos de PostgreSQL a números JavaScript finitos y las fechas a ms antes de devolverlos al resto de la aplicación. No enviar importes/tasas como strings ni fechas Date implícitas donde el contrato espera ms.

## Telemetría y semilla

POST seed: seed entero uint32, matches entero de 100 a 1000, batchId de 3-64 caracteres alfanuméricos, guion o guion bajo. Respuesta: { batchId, insertedMatches, alreadyExists }. Repetir lote devuelve insertedMatches: 0 y alreadyExists: true, HTTP 200.

Los dos endpoints test estarán habilitados en el entorno de evaluación. No requieren sesión; aplicar validación, límites y control de frecuencia. La siembra únicamente agrega fixtures con source=seed y no modifica usuarios ni partidas live.

Telemetry devuelve:

~~~text
{
  source, matches, playerResults,
  overall: { wins, kills, deaths, winRate, kdr, averageAliveSeconds, survivalRate },
  players: [{
    playerId, displayName, matches, wins, kills, deaths,
    winRate, kdr, averageAliveSeconds, survivalRate
  }]
}
~~~

- source por defecto all; permitir live y seed.
- Solo partidas completed entran a estas tasas. overall.matches es el número de partidas; winRate global usa las participaciones de jugador como denominador, no el número de partidas.
- winRate = 100 * wins / participaciones completadas.
- kdr = kills / max(1, deaths).
- averageAliveSeconds = totalAliveMs / participaciones completadas / 1000.
- survivalRate = 100 * totalAliveMs / totalParticipatedMs.
- Denominador cero: devolver 0, nunca NaN o Infinity.
- Las filas sintéticas usan participantes identificables de prueba, no se atribuyen a cuentas reales ni permiten suplantarlas.

Medir respuesta HTTP completa y RTT en URL pública, incluyendo condiciones y muestras. No confundir responseTime de backend con el tiempo completo de red. Los objetivos del PDF son <100 ms para ping/pong y <200 ms para endpoints; una medición local no prueba el despliegue.
