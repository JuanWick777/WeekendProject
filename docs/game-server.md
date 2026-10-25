# B3 — Simulación y conexión del equipo

B3 implementa la simulación de servidor sobre la base que integra los PR #1, #2 y #3. Esta guía describe código disponible, no funcionalidades pendientes de crear. El cliente sigue siendo responsabilidad de A y la conexión PostgreSQL sigue siendo responsabilidad de C/B.

## Qué está funcionando

- Generación determinista por semilla, validación de accesos/conectividad y fallback acotado.
- Movimiento autoritativo, colisiones, inputs a 20 Hz y simulación a 30 Hz; snapshots a 15 Hz.
- Cinco nodos rotatorios, ocupación, disputa, fracciones de control y fin a 150 segundos.
- Proyectiles de energía, primer impacto por segmento, caída de daño, escudo y respawn.
- Reconexión conservando mapa, cuerpo y estadísticas; abandono, ganador/empate y revancha.
- Un único resultado por ronda y una llamada asíncrona al guardado inyectado.

Las reglas públicas continúan en [contracts.md](contracts.md). El generador no usa el fixture compartido para una ronda real. No se añadieron dependencias ni un almacén alternativo de producción.

## A: conectar el cliente

1. Completar auth y lobby siguiendo [lobbies-network.md](lobbies-network.md). El arranque normal necesita los repositorios PostgreSQL de C para autenticar.
2. Al recibir `match:start`, construir el terreno desde `payload.map`, leer `payload.config` y aplicar `payload.state`. El mismo mensaje recupera la ronda al reconectar; reemplazar la escena anterior sin duplicar bucles/listeners.
3. Enviar inputs a 20 Hz; aplicar los snapshots `state` y deduplicar los efectos `event` por `eventId`. El servidor calcula posiciones, daño, recogidas y puntuación.
4. En `welcome`, descartar inputs antiguos y adoptar `nextInputSeq`. `lastProcessedSeq` vale -1 hasta procesar el primer input de esa conexión; después permite reconciliar los inputs pendientes.
5. Renderizar `objective` y sus plazos: no sumar control desde el render. A los 150 segundos llega `match:end`; mostrar sus estadísticas y la revancha del anfitrión.
6. Manejar `RESULT_NOT_SAVED` como fallo de guardado de una ronda terminada. Recibir `match:end` por sí solo no confirma persistencia.

La plantilla actual `cardinal-sketch`, versión 1, es **provisional** y traduce la disposición cardinal del boceto, con coberturas simplificadas. A debe revisar geometría y balance con B. El Canvas de bootstrap todavía no implementa estas pantallas ni controles.

## C/B: conectar PostgreSQL

El punto de unión es `server/src/index.js`. Una vez que C construya sus repositorios, la configuración será:

~~~js
import { createAuthService } from './auth/auth-service.js';
import { createServerRuntime } from './runtime.js';

// users, sessions y matches proceden del pool PostgreSQL inicializado por C.
const authService = createAuthService({ users, sessions });
const runtime = createServerRuntime({
  authService,
  saveMatch: (result) => matches.saveMatch(result),
  appOrigin: config.appOrigin,
  nodeEnv: config.nodeEnv,
});
// Arrancar runtime.server con la configuración existente.
// Al apagar: await runtime.close(); después cerrar el pool.
~~~

Este fragmento muestra la unión; no presupone módulos de storage ya creados. Coordinar index.js con B. El runtime activa la simulación por defecto y no consulta la base por tick. Sin authService, auth/upgrades responden `AUTH_NOT_READY`; sin saveMatch, una ronda terminada comunica `RESULT_NOT_SAVED`.

`MatchResult` conserva el contrato v2. Los acumuladores internos usan microsegundos enteros; los tiempos públicos en ms pueden tener hasta tres decimales. Conservarlos en PostgreSQL, por ejemplo con NUMERIC de escala 3, y convertirlos a números JS al leer. No redondear cada campo a enteros: debe mantenerse `controlTimeMs <= aliveMs <= participatedMs <= durationMs`. Una salida antes del primer tick puede producir duración 0; la telemetría debe tratar denominadores cero según contrato.

`saveMatch` se llama una vez por ronda y debe ser transaccional/idempotente por matchId. Si rechaza, la partida permanece terminada y el servidor comunica el fallo sin detalles SQL. El administrador distingue `pending`, `saved`, `failed` y `unavailable`; **todavía no hay reintento automático**. Conserva el resultado de la última ronda por sala hasta cinco minutos o hasta el siguiente inicio. Ese caché es temporal: no reemplaza la base y se pierde al reiniciar.

## Archivos y comprobaciones

- `server/src/game/match.js`: estado, tick, inputs, recogidas, respawn y snapshots.
- `server/src/game/game-manager.js`: ciclo de salas, difusión, reconexión, fin y guardado.
- `server/src/game/maps/`: plantilla, generador y validador.
- `server/src/game/movement.js` y `collision.js`: movimiento y geometría.
- `server/src/game/combat.js`, `objectives.js` y `results.js`: combate, nodos y clasificación.

Con Node 24, `npm run verify` pasa lint, **65 pruebas** y build. Se comprueban 64 semillas, fallback, velocidad con inputs a 20 Hz, paredes, daño, escudo, muerte/respawn, disputa, rotación, límites de tiempo, resultados y cuatro recorridos HTTP/WebSocket con dos cuentas. En pruebas se usan repositorios aislados y rondas acortadas; producción conserva 150/30/5 segundos.

Siguen pendientes: repositorios y guardado PostgreSQL reales, cliente jugable de A, revisión del mapa, pruebas de interpolación, tres E2E de navegador, telemetría/siembra y mediciones en URL pública. B4 cierra la integración y los fallos de conexión/guardado sobre ese recorrido completo.
