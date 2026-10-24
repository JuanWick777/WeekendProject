# Árbol y propiedad — v2

Se distingue **existente** de **previsto**. Las carpetas vacías con .gitkeep no contienen implementaciones. No hace falta crear a mano toda esta lista: cada persona crea los módulos de su tarea cuando los utiliza.

## Base existente

~~~text
GameWeekend/
  package.json, package-lock.json        Workspaces y comandos; un solo lockfile
  .gitignore, .gitattributes, .nvmrc
  .env.example                         Variables sin secretos
  eslint.config.js, vitest.config.js
  playwright.config.js                 C: flujos todavía pendientes
  README.md
  client/                              A
    package.json, index.html, vite.config.js
    public/audio/
    src/main.js, styles.css             Canvas provisional
    src/net/api.js                     Solo health
    src/game/, input/, ui/              Carpetas vacías
    test/                              Interpolación pendiente
  server/
    package.json
    src/app.js, index.js, config.js      B: HTTP/arranque
    src/net/socket-server.js            B: rechaza upgrades hasta tener sesión
    src/auth/                           B: servicio, rutas, sesiones, middleware y límite
    src/rooms/, game/                    B: vacías
    src/storage/, telemetry/            C: vacías
    test/app.test.js, auth.test.js      HTTP real; auth con repositorios de prueba
    test/helpers/auth-repositories.js   Solo tests, no persistencia de producción
  shared/                              B mantiene
    package.json
    src/constants.js                   Reglas v2 de nodos y escudo
    src/protocol.js                    Rutas/mensajes; protocolVersion 2
    src/schemas.js, index.js            Zod de entradas/exportaciones
    test/schemas.test.js                Contratos iniciales
    fixtures/                          Ejemplo JSON v2 de partida y resultado
  tests/e2e/README.md                   C: specs pendientes
  scripts/README.md                     C: scripts pendientes
  docs/
    game-design.md, maps.md, contracts.md, auth-integration.md
    brief-persona-a.md, brief-persona-b.md, brief-persona-c.md
    tasks.md, project-tree.md, github-workflow.md, evaluation.md
    visual-references/                  A: referencias, boceto y paleta
  .github/workflows/ci.yml              Lint/test/build; C agregará PostgreSQL/E2E
~~~

## Módulos previstos y responsables

Los nombres siguientes orientan el reparto; pueden ajustarse dentro de cada carpeta sin cambiar el contrato público.

~~~text
client/                                A
  src/net/                             API de auth/salas y conexión WebSocket
  src/game/                            loop, renderer, interpolation, effects
  src/input/                           keyboard-mouse y touch
  src/ui/                              auth, lobby, HUD, results, diagnostics
  test/                                Pruebas de interpolación
server/src/
  auth/                                B: routes, auth-service y middleware
  rooms/                               B: routes y room-manager
  net/                                 B: socket-server y validación/heartbeat
  game/                                B
    maps/                              Plantilla de A, PRNG, generador y validación
    match.js, loop.js                   Estado y tick de simulación
    movement.js, collision.js           Movimiento/colisiones
    objectives.js                       Nodos, ocupación, rotación y puntuación
    combat.js, pickups.js               Proyectiles, daño y escudo
    results.js                          Clasificación y MatchResult
  storage/                             C: schema.sql, pool, users, sessions, matches
  telemetry/                           C: routes, seed y metrics
server/test/                           B/C: integración y lógica de sus módulos
scripts/                               C: db-init.js, measure-performance.js
tests/e2e/                             C: auth.spec.js, lobby.spec.js, gameplay.spec.js
~~~

Los diseños de A viven en docs/visual-references. B conserva una única plantilla de geometría ejecutable en server/src/game/maps; el cliente recibe su mapa resuelto por WebSocket. C guarda semilla/versiones y no mantiene otra copia del generador.

No editar ni subir node_modules, dist ni .env. Instalar dependencias desde la raíz y coordinar package.json/package-lock.json. El repositorio ya está publicado y A/C tienen acceso; continuar con ramas por tarea según github-workflow.md.
