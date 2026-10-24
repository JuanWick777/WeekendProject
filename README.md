# CyberGrid — Breach & Sync

Videojuego web multijugador de **control de nodos rotatorios**, con disparos de energía. Arena de 2–4 jugadores, todos contra todos, y rondas de 150 segundos. Proyecto escolar de tres personas; entrega: domingo 25 de octubre de 2026, 23:59, Ciudad de México.

Cinco nodos se activan de uno en uno cada 30 segundos. Un único ocupante vivo acumula puntos; dos o más disputan la zona y detienen la puntuación. Una arena base diseñada por A tiene variantes de cobertura por semilla, generadas y validadas por B.

## Estado real de esta base

Hay workspaces npm, un cliente Vite con Canvas provisional, un servidor Express con GET /api/health, reglas compartidas, esquemas Zod, pruebas de contrato y configuración inicial de CI.

**B0.1 implementado en la rama de trabajo:** constantes y protocolVersion ya son v2. B1 incorpora servicio, rutas y middleware de autenticación con repositorios inyectados. El arranque normal responde AUTH_NOT_READY hasta conectar users/sessions PostgreSQL de C; ver [integración de autenticación](docs/auth-integration.md).

**Todavía no hay autenticación conectada a PostgreSQL, salas, conexiones WebSocket aceptadas ni partida jugable.** Las pruebas de auth usan HTTP real y repositorios de prueba aislados. Los upgrades WebSocket siguen rechazados hasta B2; endpoints de evaluación pendientes.

Repositorio privado del equipo: https://github.com/JuanWick777/WeekendProject. Todavía no se ha desplegado el juego. Un CI de bootstrap en verde no sustituye los tres E2E y la cobertura funcional de la entrega.

Verificación de B0.1/B1 con Node 24.22.1: lint aprobado, 20 pruebas aprobadas y build aprobado. Las pruebas de auth usan HTTP real con repositorios de prueba; todavía no acreditan PostgreSQL, una partida online ni las mediciones públicas. Las áreas funcionales de mapas, daño e interpolación siguen pendientes aunque el total de casos supere diez.

## Empezar

1. Usar Node 24 LTS; .nvmrc indica la versión mayor acordada.
2. Desde esta raíz, ejecutar npm ci; el lockfile ya está incluido.
3. Copiar .env.example a .env y configurar las credenciales con C cuando se integre la base de datos.
4. Ejecutar npm run dev.
5. Abrir http://127.0.0.1:5173. El servidor HTTP escucha en http://127.0.0.1:3000.

El bootstrap arranca sin base de datos. La aplicación completa necesitará PostgreSQL. No subir .env a Git ni poner credenciales en el cliente.

## Documentos que debe leer cada persona

- [A: guía completa de cliente, arte y mapas](docs/brief-persona-a.md)
- [B: tu orden de trabajo y criterios de aceptación](docs/brief-persona-b.md)
- [C: datos, pruebas y despliegue](docs/brief-persona-c.md)
- [Reglas del juego](docs/game-design.md)
- [Mapas: una arena base, variantes y entregable de A](docs/maps.md)
- [Contrato técnico y funciones de persistencia](docs/contracts.md)
- [Autenticación implementada y conexión con C](docs/auth-integration.md)
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

- A es responsable de client/. B es responsable de shared/ y servidor de juego. C es responsable de storage, telemetry, pruebas globales, scripts y despliegue.
- Se usa JavaScript ESM; no introducir otro motor ni otro transporte de red.
- Crear ramas cortas por tarea y PR hacia main. Primeras ramas: feat/client-shell, feat/auth y feat/storage.
- Coordinar cambios en shared/ y en dependencias. Instalar desde la raíz: no generar lockfiles por paquete.
- Los archivos .gitkeep conservan las carpetas todavía vacías al clonar. Se pueden quitar al implementar cada carpeta.
- Diseños y datos de prueba son fixtures identificados; el multijugador final siempre usa el servidor real.

Siguiente integración: conectar users/sessions de C con createAuthService y createApp, comprobar dos cuentas con PostgreSQL y continuar con salas/WebSocket (B2). A puede consumir el [fixture v2](shared/fixtures/README.md) mientras implementa su cliente.

## Entrega

- URL pública: PENDIENTE.
- Repositorio: https://github.com/JuanWick777/WeekendProject (privado; dar acceso al evaluador).
- Resultado de auditoría: ver docs/evaluation.md.
