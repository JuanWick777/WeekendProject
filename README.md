# CyberGrid — Breach & Sync

Videojuego web multijugador de **control de nodos rotatorios**, con disparos de energía. Arena de 2–4 jugadores, todos contra todos, y rondas de 150 segundos. Proyecto escolar de tres personas; entrega: domingo 25 de octubre de 2026, 23:59, Ciudad de México.

Cinco nodos se activan de uno en uno cada 30 segundos. Un único ocupante vivo acumula puntos; dos o más disputan la zona y detienen la puntuación. Una arena base diseñada por A tiene variantes de cobertura por semilla, generadas y validadas por B.

## Estado real de esta base

Hay workspaces npm, un cliente Vite con Canvas provisional, un servidor Express con GET /api/health, reglas compartidas, esquemas Zod, pruebas de contrato y configuración inicial de CI.

**B0.1, B1, B2 y B3 integrados en main mediante los PR #1–#4:** mapa por semilla, movimiento, nodos, combate, escudo, respawn, reconexión y resultados de servidor. Ver [simulación B3 y conexión de A/C](docs/game-server.md). Los cambios nuevos llegan a main mediante su PR.

**B asume también la programación del cliente; A diseña y revisa. Todavía falta conectar PostgreSQL y el cliente online.** La simulación ya funciona por HTTP/WebSocket en pruebas con dos cuentas y repositorios aislados. El runtime necesita authService y saveMatch de C: sin auth responde AUTH_NOT_READY y sin guardado comunica RESULT_NOT_SAVED al terminar. Ya hay una [vista industrial interactiva de diseño](docs/client-preview.md) solo en desarrollo: mapa 768 × 640, drones, HUD, teclado/táctil y diagnóstico. Está identificada como local; también faltan los endpoints de evaluación.

Repositorio privado del equipo: https://github.com/JuanWick777/WeekendProject. Todavía no se ha desplegado el juego. Un CI de bootstrap en verde no sustituye los tres E2E y la cobertura funcional de la entrega.

Verificación hasta B3 con Node 24.22.1: lint aprobado, 72 pruebas aprobadas y build aprobado. Ya se cubren mapas, daño y simulación sobre conexiones reales; faltan PostgreSQL, interpolación del cliente, E2E de navegador y mediciones públicas.

## Empezar

1. Usar Node 24 LTS; .nvmrc indica la versión mayor acordada.
2. Desde esta raíz, ejecutar npm ci; el lockfile ya está incluido.
3. Copiar .env.example a .env y configurar las credenciales con C cuando se integre la base de datos.
4. Ejecutar npm run dev.
5. Abrir http://127.0.0.1:5173. El servidor HTTP escucha en http://127.0.0.1:3000.

El bootstrap arranca sin base de datos. La aplicación completa necesitará PostgreSQL. No subir .env a Git ni poner credenciales en el cliente.

## Documentos que debe leer cada persona

- [A: diseño y revisión visual](docs/brief-persona-a.md)
- [Vista de diseño y adaptación de arena/escudos](docs/client-preview.md)
- [B: tu orden de trabajo y criterios de aceptación](docs/brief-persona-b.md)
- [C: datos, pruebas y despliegue](docs/brief-persona-c.md)
- [Reglas del juego](docs/game-design.md)
- [Mapas: una arena base, variantes y entregable de A](docs/maps.md)
- [Contrato técnico y funciones de persistencia](docs/contracts.md)
- [Autenticación implementada y conexión con C](docs/auth-integration.md)
- [Salas y WebSockets: conexión de A/C](docs/lobbies-network.md)
- [Simulación B3: mensajes, mapa y guardado para A/C](docs/game-server.md)
- [Tareas y dependencias](docs/tasks.md)
- [Árbol y propiedad de archivos](docs/project-tree.md)
- [GitHub: ramas, pull requests e integración](docs/github-workflow.md)
- [Preparación de la entrega](docs/evaluation.md)

## Comandos

| Comando | Función |
| --- | --- |
| npm run dev | Cliente Vite y servidor Node con recarga |
| npm run dev:client | Solo cliente |
| npm run dev:server | Solo servidor |
| npm test | Pruebas unitarias/integración existentes |
| npm run lint | Análisis estático |
| npm run build | Build de producción del cliente |
| npm start | Servidor HTTP que también sirve el cliente construido |
| npm run verify | Lint, pruebas existentes y build |
| npm run test:e2e | Playwright; C debe añadir los tres flujos antes de ejecutarlo |
| npm run verify:release | Verificación base y E2E; será obligatoria al cerrar C3 |

El comando db:init se agregará en C1, junto con el esquema PostgreSQL. No existe aún. verify:release no puede pasar hasta que existan los E2E; no se admite convertir una suite vacía en un resultado aprobado.

## Trabajo en equipo

- A diseña y mantiene referencias. B programa client/, shared/ y servidor de juego. C mantiene storage, telemetry, pruebas globales, scripts y despliegue.
- Se usa JavaScript ESM; no introducir otro motor ni otro transporte de red.
- Crear ramas cortas por tarea y PR hacia main. Siguientes ramas: feat/design-references, feat/client-online y feat/storage.
- Coordinar cambios en shared/ y en dependencias. Instalar desde la raíz: no generar lockfiles por paquete.
- Los archivos .gitkeep conservan las carpetas todavía vacías al clonar. Se pueden quitar al implementar cada carpeta.
- Diseños y datos de prueba son fixtures identificados; el multijugador final siempre usa el servidor real.

Siguiente integración: conectar users/sessions y matches.saveMatch de C al runtime y comprobar dos cuentas con PostgreSQL. B conecta el Canvas a match:start/state/event/match:end siguiendo [B3](docs/game-server.md); el [fixture v3](shared/fixtures/README.md) sigue disponible para presentación aislada.

## Entrega

- URL pública: PENDIENTE.
- Repositorio: https://github.com/JuanWick777/WeekendProject (privado; dar acceso al evaluador).
- Resultado de auditoría: ver docs/evaluation.md.
