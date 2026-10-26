# B3 — Simulación y conexión del equipo

B3 implementa la simulación de servidor sobre la base que integra los PR #1, #2 y #3. Esta guía describe código disponible, no funcionalidades pendientes de crear. B asume también la programación del cliente; A diseña y revisa. La integración del cliente online sigue pendiente y la conexión PostgreSQL sigue siendo responsabilidad de C/B.

## Qué está funcionando

- Generación determinista: trazado de referencia fijo por defecto, procedural opt-in, validación de pasillos/accesos/conectividad y fallback acotado.
- Movimiento autoritativo, colisiones, inputs a 20 Hz y simulación a 30 Hz; snapshots a 15 Hz.
- Cinco nodos rotatorios, ocupación, disputa, fracciones de control y fin a 150 segundos.
- Proyectiles de energía, primer impacto por segmento, caída de daño, escudo y respawn.
- Reconexión conservando mapa, cuerpo y estadísticas; abandono, ganador/empate y revancha.
- Un único resultado por ronda y una llamada asíncrona al guardado inyectado.

Las reglas públicas continúan en [contracts.md](contracts.md). El generador no usa el fixture compartido para una ronda real. No se añadieron dependencias ni un almacén alternativo de producción.

## B: conectar el cliente; A revisa diseño

1. Completar auth y lobby siguiendo [lobbies-network.md](lobbies-network.md). El arranque normal necesita los repositorios PostgreSQL de C para autenticar.
2. Al recibir `match:start`, construir el terreno desde `payload.map`, leer `payload.config` y aplicar `payload.state`. El mismo mensaje recupera la ronda al reconectar; reemplazar la escena anterior sin duplicar bucles/listeners.
3. Enviar inputs a 20 Hz; aplicar los snapshots `state` y deduplicar los efectos `event` por `eventId`. El servidor calcula posiciones, daño, recogidas y puntuación.
4. En `welcome`, descartar inputs antiguos y adoptar `nextInputSeq`. `lastProcessedSeq` vale -1 hasta procesar el primer input de esa conexión; después permite reconciliar los inputs pendientes.
5. Renderizar `objective` y sus plazos: no sumar control desde el render. A los 150 segundos llega `match:end`; mostrar sus estadísticas y la revancha del anfitrión.
6. Manejar `RESULT_NOT_SAVED` como fallo de guardado de una ronda terminada. Recibir `match:end` por sí solo no confirma persistencia.

La plantilla a-industrial v5, generador 3 y protocolo 5, integra las coordenadas originales de A en mundo 1448 × 1088. Las caras metálicas tienen colisión continua; los recorridos se verifican con radio real 10, sin prometer el antiguo ancho 48. Ver maps.md y a1-integration.md. El recorrido de navegador online sigue pendiente.

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
- `shared/src/maps/`: plantilla, generador y validador canónicos; server/src/game/maps reexporta para conservar imports.
- `shared/src/game/`: simulación pura usada por servidor y práctica local DEV; server/src/game conserva reexportaciones y game-manager/red siguen siendo exclusivos del servidor.
- `server/src/game/movement.js` y `collision.js`: movimiento y geometría.
- `server/src/game/combat.js`, `objectives.js` y `results.js`: combate, nodos y clasificación.

Con Node 24, `npm run verify` pasa lint, **78 pruebas** y build. Se comprueban 64 semillas, fallback, velocidad con inputs a 20 Hz, paredes, daño, escudo, muerte/respawn, disputa, rotación, límites de tiempo, resultados y cuatro recorridos HTTP/WebSocket con dos cuentas. En pruebas se usan repositorios aislados y rondas acortadas; producción conserva 150/30/5 segundos.

Siguen pendientes: repositorios y guardado PostgreSQL reales, cliente online de B, revisión del mapa, pruebas de interpolación, tres E2E de navegador, telemetría/siembra y mediciones en URL pública. B4 cierra la integración y los fallos de conexión/guardado sobre ese recorrido completo.


## Puente PostgreSQL y cliente A3

server/src/postgres-services.js conecta los repositorios reales de C con authService y saveMatch. index.js comprueba la base y cuatro tablas antes de escuchar, y cierra runtime y pool al apagar. No introduce una base alternativa. /api/health añade database=ready tras la comprobación inicial (no consulta SQL por petición).

El administrador emite match:persistence para que resultados distinga guardado confirmado y fallido; ver contracts.md. La cola WebSocket saliente admite 256 KiB para el mapa de A1, conservando los límites de entrada.

En la integración aislada de A1+A2+A3, puente B y correcciones C pasaron 107 pruebas, build, lint y tres E2E con PostgreSQL real. La rama A+B pasa 91 pruebas; las otras 16 corresponden a almacenamiento y necesitan los módulos y el helper de C. El texto anterior describe el estado previo a esta integración; el cliente online e interpolación ya están implementados. Ver [puente PostgreSQL](postgres-bridge.md). Siguen pendientes la verificación de Supabase remota, endpoints de evaluación, despliegue y mediciones públicas.
