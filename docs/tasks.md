# Tareas y orden de integración — v2

Entrega: domingo 25/10/2026 23:59, Ciudad de México; objetivo de envío antes de 21:30. A, B y C son las tres personas del equipo. El bootstrap, B0.1, auth HTTP de B1 y salas/red B2 están integrados en main mediante los PR #1–#3. B3 ya implementa simulación y combate; falta la revisión del mapa con A y conectar PostgreSQL de C. Las pruebas usan repositorios aislados sin reemplazar la persistencia de producción.

## Trabajo y dependencias

| ID | Responsable | Resultado comprobable | Depende de |
| --- | --- | --- | --- |
| B0 | B | Bootstrap publicado; 7 pruebas iniciales, lint y build comprobados | Completado |
| D2 | B coordina | Reglas, mapas, contratos y briefs de nodos rotatorios | Integrado en main, PR #1 |
| B0.1 | B | Constantes/protocolVersion v2 y fixture para A/C | Integrado en main, PR #2 |
| A1 | A | Una arena base con capas, variantes autorizadas y dirección visual | maps.md y brief A; sin esperar backend |
| C1a | C | Bases dev/test, esquema y users/sessions con firmas acordadas | contracts.md; sin esperar partida |
| B1 | B | Implementado: auth HTTP y middleware; pendiente comprobar con PostgreSQL | C1a; ver auth-integration.md |
| A2 | A | Canvas adaptable, HUD de nodos e inputs independientes | B0.1 y diseño A1 |
| C1b | C | saveMatch v2 transaccional e idempotente; primer despliegue público | MatchResult y cuenta/base de hosting |
| B2 | B | Implementado: salas, Listo, countdown con hook y sockets entre dos cuentas | Auth inyectada; integración PostgreSQL pendiente con C1a |
| A3 | A | Auth/lobby online, snapshots e interpolación; coordenadas DOM | B2 y contratos v2 |
| B3a | B | Implementado: mapa por semilla, movimiento, nodos y fin | Revisar plantilla provisional con A e integrar su cliente |
| B3b | B | Implementado: bláster, escudo, muerte/respawn y callback de resultado | Falta guardado PostgreSQL real mediante C1b |
| C2 | C | Seed 100/1000, métricas coherentes y mediciones | C1b y contrato v2 |
| B4 | B | Reconexión, abandono, secuencias, límites y limpieza verificados | Se desarrolla desde B2; cierre tras B3 |
| A4 | A | Controles móviles reales, resultados/revancha y acabado | A3 + B3 |
| C3 | C coordina | Cobertura funcional y 3 E2E reales en Actions por PR | Cada caso avanza con su módulo |
| C4 | C coordina | Auditoría pública, URL/repo, evidencia y entrega | Recorrido completo |

## Próximo trabajo de B

Publicar/revisar B3 y cerrar B4 con el cliente de A: nodos, combate, reconexión y revancha. Conectar users/sessions y matches.saveMatch de C cuando estén listos; comprobar guardado real y fallos sin bloquear el tick. Ver [game-server.md](game-server.md). No crear una persistencia alternativa a la de C.

## Puntos de encuentro

- A entrega el boceto completo de una arena y sus capas; B valida que pueda convertirse a plantilla y variantes.
- C entrega users/sessions primero y B comprueba registro/login con la base real.
- Primer recorrido de gameplay: dos clientes entran al nodo, uno suma, dos disputan, vuelve a sumar el único restante y la rotación desactiva la zona anterior.
- Después se integran disparos, escudo, muerte, resultado guardado y revancha. Efectos/sonido van detrás de ese recorrido.

Integrar cambios pequeños cada 1–2 horas. Las firmas de almacenamiento, campos de snapshot y selectores E2E se comunican al cambiar, no al final del fin de semana.

## Pruebas y aceptación

- B: 2 mapas + 2 daño/escalado + 1 autoridad; sumar casos de objetivo y límites de tiempo, escudo/respawn y sesiones.
- A: 2 interpolación y apoyo de controles/DOM para E2E.
- C: 2 payloads Zod + 1 telemetría/semilla; coordina auth, lobby y Canvas reales en Playwright, incluida variante móvil.
- Las 7 pruebas del bootstrap no sustituyen los casos funcionales de simulación añadidos en B3. Diez es el mínimo funcional, no un límite para dejar reglas esenciales sin comprobar.

Cada cambio debe instalar/arrancar desde una base limpia, tener comprobación útil del comportamiento y pasar npm run verify. Hasta B3 hay 65 casos aprobados, incluyendo mapas/daño y cuatro recorridos HTTP/WebSocket de partida. Siguen pendientes PostgreSQL, interpolación y E2E de navegador. C3 añade verify:release a cada PR. No se admiten mocks ocultos como sustituto de juego/persistencia reales ni suites vacías aprobadas.

## Git, propiedad y alcance

Ramas por tarea, PR a main, checks y una revisión de otra persona. A mantiene client, B shared/servidor de juego, C storage/telemetry/scripts/E2E/CI. Coordinar app.js y el lockfile; una instalación desde la raíz. Detalle en [github-workflow.md](github-workflow.md).

No crear otra arena ni añadir equipos/banderas mientras falte login -> lobby -> ronda -> resultado -> persistencia. Si el recorrido no funciona el sábado por la noche, recortar acabado opcional. El domingo a las 18:00 se congelan funciones y se reserva el resto para pruebas públicas, móviles y entrega.
