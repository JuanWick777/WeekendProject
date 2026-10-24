# Árbol de arranque y propiedad

Los archivos de código que no aparecen aquí se crearán al implementar cada tarea. Las carpetas vacías se conservan con .gitkeep; no contienen funciones de juego ocultas.

~~~text
GameWeekend/
  package.json, package-lock.json        Workspaces y comandos; lock generado por npm
  .gitignore, .gitattributes,
  .nvmrc, .env.example                 B: configuración inicial
  eslint.config.js, vitest.config.js    C: comprobaciones de base
  playwright.config.js                 C: preparado, flujos pendientes
  README.md
  client/                              A
    package.json, index.html, vite.config.js
    public/audio/
    src/
      main.js, styles.css              Presentación provisional
      net/api.js                       Solo health por ahora
      game/                            loop, renderer, interpolation y effects por crear
      input/                           keyboard y touch por crear
      ui/                              auth, lobby, HUD, results y diagnostics por crear
    test/                              Interpolación pendiente
  server/
    package.json
    src/
      app.js, index.js, config.js       B: arranque HTTP
      auth/                            B: routes y auth-service por crear
      rooms/                           B: routes y room-manager por crear
      net/socket-server.js             B: rechaza upgrade hasta existir sesión
      game/                            B: loop, match, mapa, combate, pickups, sync
      storage/                         C: pool, esquema y repositorios
      telemetry/                       C: routes, seed y metrics
    test/app.test.js                   Frontera HTTP inicial
  shared/                              B mantiene
    package.json
    src/constants.js                   Reglas de mundo y disparos
    src/protocol.js                    Nombres/rutas/estados
    src/schemas.js                     Entradas Zod
    src/index.js                       Exportaciones
    test/schemas.test.js               Casos iniciales de contrato
  tests/e2e/README.md                   C: auth/lobby/gameplay pendientes
  scripts/README.md                     C: db-init y medición pendientes
  docs/                                Briefs, reglas, contrato, tareas, GitHub y evaluación
    visual-references/                 A: moodboard y propuestas
  .github/workflows/ci.yml             Bootstrap; C agregará E2E y PostgreSQL
~~~

No editar node_modules ni dist. No subir esos directorios ni .env. Las dependencias se instalan desde la raíz. Cada paquete tiene su package.json, pero el lockfile es único.

Al crear GitHub, primero publicar esta base y después trabajar en ramas por tarea. A no necesita esperar a la publicación para sus bocetos visuales; sí debe partir del mismo contrato al escribir el cliente.
