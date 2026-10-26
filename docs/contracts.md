# Contrato técnico v5 — Rotating control

Acuerdo para A, B y C. v5 integra el mapa y PNG originales de A, dimensiones y colisión continua; mantiene reglas y firmas de MatchResult/repositorios. Cliente y servidor deben usar protocolo 5. La unión de PostgreSQL y cliente online sigue pendiente; la práctica de desarrollo no guarda resultados.

## Convenciones y autoridad

- JavaScript ESM; código/protocolo en inglés, UI en español. camelCase para variables y kebab-case.js para archivos.
- Centros en unidades de mundo, x derecha e y abajo; tiempos externos en milisegundos. Delta interno `dtSeconds`.
- Mundo 181 × 136, tileSize 8 (1448 × 1088; autoría 1448 × 1086 sin estirar); jugador radio 10 y velocidad 160 unidades/s.
- Tick 30 Hz, input 20 Hz, snapshot 15 Hz; render objetivo 60 FPS. Inputs caducan a los 250 ms; ping cada 2 s; máximo mensaje de cliente a servidor 4096 bytes.
- Servidor decide posición, colisiones, proyectiles, inventario, ocupación y puntos. Cliente interpola y corrige predicción local con snapshots.
- Un proceso mantiene salas y simulación en memoria. PostgreSQL guarda usuarios, sesiones y resultados; no se consulta por cada tick.
- `serverTimeMs` y fechas `*AtMs` usan el reloj epoch del servidor. La simulación usa elapsed monotónico; no usa la hora ni el dt del cliente para puntuar.

## HTTP y sesión

Desarrollo: navegador `http://127.0.0.1:5173`, servidor `http://127.0.0.1:3000`; Vite hace proxy de `/api` y `/ws`. Cliente usa rutas relativas. Producción: un origen HTTPS para cliente, API y socket.

Éxito: `{ ok: true, data: ... }`; error: `{ ok: false, error: { code, message } }`. Éxitos de esta tabla responden 200; errores usan 400, 401, 403, 404, 409, 413 o 429 según el caso.

| Método | Ruta | Entrada o salida data |
| --- | --- | --- |
| GET | /api/health | Liveness y estado real de servicios |
| POST | /api/auth/register | `{ username, displayName, password }` -> `{ user }` y cookie |
| POST | /api/auth/login | `{ username, password }` -> `{ user }` y cookie |
| POST | /api/auth/logout | Invalida sesión -> `{ loggedOut: true }` |
| GET | /api/auth/me | `{ user, roomCode }`; 401 sin sesión |
| POST | /api/rooms | `{ name }` -> vista de sala |
| GET | /api/rooms/:code | Vista de sala; requiere pertenencia |
| POST | /api/rooms/:code/join | Sin body -> vista de sala |
| POST | /api/rooms/:code/leave | Sin body -> `{ left: true }` |
| PATCH | /api/rooms/:code/ready | `{ ready: boolean }` -> vista de sala |
| POST | /api/rooms/:code/start | Solo host -> vista countdown |
| POST | /api/rooms/:code/rematch | Solo host -> nuevo lobby |
| GET | /api/test/telemetry | Agregados; `source=all`, `live` o `seed` |
| POST | /api/test/seed | `{ seed, matches, batchId }` |

Usuario público: `{ id, username, displayName }`. username se normaliza a minúsculas. Nunca devolver hashes ni token de sesión. Usuario pertenece a una sola sala; la sesión determina identidad, sin aceptar un userId del cliente para actuar como otro jugador.

Vista de sala: `{ code, name, hostId, status, countdownEndsAtMs, players: [{ id, displayName, ready, connected }] }`. Código: seis caracteres A–Z/0–9. `countdownEndsAtMs` es null fuera de countdown; `roomCode` es null sin sala.

Cookie `cg_session`: HttpOnly, SameSite=Lax, Path=/, Secure en producción, duración inicial 24 h. Token aleatorio; solo su hash se persiste. Comprobar Origin en upgrades y operaciones que cambian estado. `APP_ORIGIN` coincide con el origen del navegador. Comprobar sesión y pertenencia también en backend.

## WebSocket

Ruta `/ws`, sesión válida antes de aceptar. Un socket activo por usuario; una reconexión sustituye de forma controlada al anterior. Validar entradas con Zod, tamaño y frecuencia. El límite de 4096 bytes corresponde a entradas del cliente; match:start puede ser mayor porque incluye la cuadrícula resuelta. Los nombres de mensajes y los inputs v1 se conservan; `PROTOCOL_VERSION` ya vale 4; las emisiones de partida están implementadas en B3.

~~~json
{
  "type": "input",
  "payload": { "seq": 42, "moveX": 1, "moveY": 0, "aimX": 0, "aimY": -1, "attack": true }
}
~~~

Ejes finitos en [-1, 1]; movimiento y apuntado independientes, normalizados en servidor. Disparar exige dirección no nula. No aceptar dt, posición, daño, puntos ni escudo del cliente. `seq` crece por conexión; `welcome.nextInputSeq` establece su inicio después de reconectar. Inputs antiguos, de socket sustituido o fuera de playing no alteran el juego. Al caducar: movimiento cero y attack false.

Ping: `{ type: 'ping', payload: { id, sentAtMs } }`. Pong devuelve los mismos campos; el cliente calcula RTT con su propio reloj. Un heartbeat de transporte detecta sockets muertos, además de este ping de aplicación.

| Tipo servidor | Payload |
| --- | --- |
| welcome | `{ protocolVersion, user, roomCode, nextInputSeq }` |
| lobby | Vista de sala; null para quien acaba de salir |
| match:start | `{ matchId, map, endsAtMs, config, state }` |
| state | Snapshot de esta guía |
| event | `{ eventId, tick, kind, actorId, targetId, x, y }` |
| match:end | MatchResult de esta guía |
| pong | `{ id, sentAtMs }` |
| error | `{ code, message }` |

`targetId` es null cuando no aplica. Los eventos solo crean efectos, se deduplican por eventId y nunca sustituyen el snapshot. Tipos previstos: `shot`, `hit`, `death`, `respawn`, `shield:pickup`, `shield:block`. El cambio de nodo se lee del estado objetivo; no depende de recibir un evento.

## Mapa transmitido

~~~text
{
  seed, layout: 'reference', templateId: 'a-industrial', templateVersion: 5, generatorVersion: 3,
  variantId: 'base', collisionModel: 'segments-v1',
  columns: 181, rows: 136, tileSize: 8, designWidth: 1448, designHeight: 1086,
  tiles: [[0, 1, ...], ...],
  nodes: [{ id, authorId, x, y, radius: 64 }],
  spawnPoints: [{ id, authorId, x, y }],
  pickupSpawns: [{ id, type: 'shield', x, y, radius: 10, spawnKind: 'initial' | 'random' }],
  wallPaths: [{ id, category, points: [[x, y], ...], thickness: 22, endPadding: 4 }],
  outline: [[x, y], ...], outlineThickness: 18,
  protectedRoutes: []
}
~~~

El servidor envía el mapa resuelto. seed es uint32; versiones enteras positivas. En segments-v1, wallPaths y el borde de outline son la autoridad física; tiles es ocupación auxiliar, no colisión. Las sombras no bloquean. El cliente usa la misma geometría compartida y no reconstruye física desde una imagen. Los originales conservan sus coordenadas y etiquetas authorId. El orden de activación es el orden canónico de nodes, no el número de la etiqueta decorativa. Las rondas normales usan procedural con generador v4: cinco módulos independientes de cobertura de A y eliminación acotada de un grupo removible. generation registra attempts y fallback, más modules y removedGroup en las combinaciones procedurales; el fallback y la referencia conservan variantId=base. Solo cambia al comenzar una nueva ronda. Ver [maps.md](maps.md).

El servidor reenvía `match:start` con mapa y snapshot actual al reconectar a una ronda. No regenera terreno por una rotación ni al entrar otro socket.

El runtime conecta la simulación por defecto: al terminar countdown envía match:start con mapa real y estado. Al reconectar conserva el mismo cuerpo y mapa; welcome reinicia la secuencia con nextInputSeq y el cliente descarta su cola anterior. GAME_NOT_READY se conserva para un runtime con la simulación desactivada y sin manejador de inicio.

`config` contiene únicamente reglas públicas de la ronda, sin secretos:

~~~text
{
  mode: 'rotating_control', durationMs: 150000, respawnMs: 3000,
  nodeDurationMs: 30000, nodePreviewMs: 5000,
  scorePerSecond: 1, maxShieldCharges: 1, shieldSpawnIntervalMs: 15000
}
~~~

## Snapshot y ocupación

~~~text
{
  matchId, tick, serverTimeMs, remainingMs,
  objective: {
    activeNodeId, rotationIndex, status, controllerId,
    changesAtMs, nextNodeId
  },
  players: [{
    id, displayName, x, y, aimX, aimY, hp, shieldCharges,
    controlTimeMs, score, kills, deaths, alive, connected,
    forfeited, respawnRemainingMs, lastProcessedSeq
  }],
  pickups: [{ id, type: 'shield', x, y, radius: 10 }],
  projectiles: [{ id, ownerId, x, y, dirX, dirY }]
}
~~~

- `rotationIndex`: 0–4. `status`: `empty`, `controlled` o `contested`.
- `controllerId`: único ocupante vivo válido si controlled; null en los otros estados.
- `changesAtMs`: fin del intervalo activo; para el último, fin de ronda.
- `nextNodeId`: siguiente nodo solo durante sus 5000 ms de preaviso; null el resto y durante todo el último intervalo.
- Ocupación: centro del jugador dentro del círculo, vivo y no abandonado. Un desconectado dentro del plazo de gracia permanece vivo/vulnerable y cuenta como ocupante.
- `controlTimeMs` es acumulado de la ronda, admite fracciones de ms; `score` es su parte entera en segundos. No redondear cada tick ni reiniciar fracciones al disputar/salir.
- Resolver movimiento, proyectiles/muertes y luego ocupación en cada paso. Recortar el tiempo atribuido a límites de rotación y fin; no sumar dos veces un intervalo ni exceder 150000 ms de control total entre jugadores.
- Cuatro candidatos initial aparecen al inicio y se consumen una vez. Un random aparece a los 15000 ms; después de recogerlo se esperan otros 15000 ms, sin acumular más de uno. Los iniciales pendientes permanecen disponibles.
- `shieldCharges`: entero 0/1. `pickups` solo contiene recogidas actualmente disponibles; su reaparición la controla B. No desaparecer una recogida al tocarla con inventario lleno. Adquirir exige distancia entre centros <= suma de radios; empates de recogida se resuelven por playerId ordenado.
- `lastProcessedSeq` vale -1 antes del primer input procesado y al recuperar una conexión; luego identifica el último input aplicado de esa conexión.
- `respawnRemainingMs` vale 0 estando vivo. Los abandonados no vuelven a ocupar ni disparar. HP, puntos y tiempos provienen del servidor.

El cliente refleja las x/y recibidas en `data-player-x` y `data-player-y` de un elemento `data-testid="player-state"`. Es estado autoritativo, separado de la predicción visual. C prueba movimiento real y espera esos cambios; no edita los atributos para hacer pasar E2E.

## Resultado y persistencia

~~~text
{
  matchId, roomCode, mode: 'rotating_control',
  seed, templateId, templateVersion, generatorVersion,
  startedAtMs, endedAtMs, durationMs,
  status: 'completed' | 'aborted',
  finishReason: 'time' | 'forfeit' | 'empty',
  winnerId: string | null, drawPlayerIds: string[],
  players: [{
    playerId, displayName, score, controlTimeMs, kills, deaths,
    aliveMs, participatedMs, won, draw, forfeited
  }]
}
~~~

`durationMs` es tiempo simulado real de la ronda, hasta 150000; puede ser menor al terminar por abandono. Por jugador: `0 <= controlTimeMs <= aliveMs <= participatedMs <= durationMs`. La suma de control de todos no supera durationMs. La vida acumulada suma los intervalos vivo, no los tiempos de respawn. Los tiempos pueden tener hasta tres decimales de ms y deben guardarse sin redondearlos a enteros para conservar estas relaciones. La duración puede ser 0 si se abandona antes del primer tick.

Clasificar candidatos no abandonados por score descendente, kills descendente y deaths ascendente. Si se mantiene igualdad en el primer puesto: winnerId null, drawPlayerIds con esos IDs, draw true y won false para ellos. En fin por abandono gana el único restante. En abortada no hay ganador ni empatados. El resultado se construye una sola vez; no incluye sockets, funciones, mapa completo ni secretos.

Todas estas interfaces de C son asíncronas:

~~~text
users.createUser({ username, displayName, passwordHash }) -> User público
users.findUserByUsername(username) -> User con passwordHash, o null
users.findUserById(id) -> User público, o null
sessions.createSession({ userId, tokenHash, expiresAtMs }) -> void
sessions.findSessionByTokenHash(tokenHash) -> { user, expiresAtMs }, o null
sessions.deleteSessionByTokenHash(tokenHash) -> void
matches.saveMatch(matchResult) -> void
~~~

username único normalizado, tokenHash único y match_id único. Duplicar username se comunica a B como error con `code: 'USERNAME_TAKEN'` para responder 409; no exponer errores SQL. La búsqueda de sesión puede devolver null si expiró; B comprueba expiresAtMs antes de autenticar en cualquier caso.

`saveMatch` guarda cabecera y resultados en una transacción idempotente por matchId. C asigna source=live desde la ruta interna de guardado; no lo acepta del jugador. Los repositorios convierten números PostgreSQL a números JS finitos y fechas a ms, sin strings numéricos ni Date implícitas. B coordina el manejo de fallos de guardado fuera del tick; no se declara persistido un resultado que falló.

## Siembra y telemetría

POST seed admite `{ seed, matches, batchId }`: seed uint32, matches entero 100–1000, batchId 3–64 caracteres alfanuméricos, guion o guion bajo. Respuesta data: `{ batchId, insertedMatches, alreadyExists }`. Repetir batchId responde 200 con insertedMatches 0 y alreadyExists true; el primer lote queda intacto incluso si se envían otros parámetros.

Datos de prueba reproducibles, con source=seed y participantes sintéticos identificables, separados de cuentas humanas. Lote y resultados se guardan atómicamente. No borrar ni sobrescribir datos live. Generar resultados coherentes con duración, control, score, bajas/muertes y desempates. Este endpoint crea registros sintéticos; no ejecuta 1000 simulaciones online.

Ambos endpoints test estarán habilitados en evaluación sin sesión, con validación, tamaño y frecuencia acotados. No exigir un secreto desconocido por el evaluador.

Implementación: [API de evaluación](evaluation-api.md). JSON máximo 2 KB, seis siembras y sesenta consultas por minuto e IP, con límites independientes. Como máximo dos siembras activas por proceso; sobrecarga responde 503 SEED_BUSY y cuotas agotadas 429 EVALUATION_RATE_LIMITED, ambos con Retry-After. Las respuestas exitosas no se cachean y Server-Timing mide backend, separado del tiempo HTTP completo.

Telemetry data:

~~~text
{
  source, matches, playerResults,
  overall: {
    wins, kills, deaths, winRate, kdr,
    averageAliveSeconds, survivalRate, averageControlSeconds
  },
  players: [{
    playerId, displayName, matches, wins, kills, deaths,
    winRate, kdr, averageAliveSeconds, survivalRate,
    averageControlSeconds
  }]
}
~~~

`source=all` por defecto; aceptar live/seed. Solo partidas completed entran a estos contadores y tasas; abortadas se excluyen. `matches` raíz cuenta partidas, `playerResults` participaciones; `players[].matches` cuenta participaciones de ese jugador.

- winRate = 100 * wins / participaciones completadas. Empates no suman victorias.
- kdr = kills / max(1, deaths).
- averageAliveSeconds = totalAliveMs / participaciones completadas / 1000.
- survivalRate = 100 * totalAliveMs / totalParticipatedMs.
- averageControlSeconds = totalControlTimeMs / participaciones completadas / 1000.
- overall se calcula desde sumas globales, no promediando porcentajes de filas. Denominador cero devuelve 0, nunca NaN/Infinity. Base vacía devuelve contadores 0 y players vacío.

Medir HTTP completo y RTT en la URL pública con muestras y condiciones. Tiempo de backend y prueba local no acreditan la red pública. Objetivos de evaluación: ping/pong <100 ms y endpoints <200 ms, con HTTP 200; registrar también arranque frío.


## Confirmación de persistencia — integración A3/B

Mensaje opcional de servidor: `match:persistence`, payload `{ matchId, status }`. Estados: pending, saved, failed o unavailable. El cliente relaciona el estado por matchId y solo anuncia guardado después de saved, que se emite al resolver saveMatch. Recuperar una ronda terminada envía match:end y el último estado de persistencia. No cambia los campos de MatchResult ni los tiempos/reglas; protocolo 5 conserva compatibilidad aditiva.
