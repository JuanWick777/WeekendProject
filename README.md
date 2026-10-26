# CyberGrid — Breach & Sync

Juego web multijugador de control de nodos rotatorios con disparos de energía. De 2 a 4 jugadores, todos contra todos: una ronda dura 150 segundos y activa cinco nodos, uno cada 30 segundos. Solo un ocupante vivo puntúa; una zona disputada detiene la puntuación.

## Estado de esta integración

A1 conserva el mapa industrial y los 32 PNG originales de A con geometría compartida. A2 añade HUD, efectos y presentación del juego online. A3 incorpora menú, registro/login, salas, lobby, ayuda y resultados con datos reales, más controles PC/móvil, interpolación, predicción y recuperación de la ronda.

El puente de servidor de B está implementado en la rama de integración: conecta los repositorios de C con autenticación y guardado, comprueba la base antes de escuchar y confirma al cliente cuándo se guardó una ronda. Para arrancar desde el repositorio aún se debe incorporar la rama de C con su helper de pruebas registrado y sus checks aprobados. Ver [puente PostgreSQL](docs/postgres-bridge.md).

La rama A+B pasa lint, 91 pruebas y build. La copia integrada con los módulos de C pasa 107 pruebas y tres recorridos E2E, incluidas sus 16 pruebas de almacenamiento; usa el helper pendiente de registrar por C. Se comprobó además que una sesión real sobrevive al reinicio del servidor. El usuario revisó el flujo en PC y teléfono por Wi-Fi local. Supabase por internet, despliegue y mediciones públicas siguen pendientes. Ver [integración A2/A3](docs/a23-integration.md).

## Arrancar después de integrar C

1. Usar Node 24 LTS e instalar desde la raíz: `npm ci`.
2. Copiar `.env.example` a `.env`. C configura `DATABASE_URL` y una `TEST_DATABASE_URL` diferente para pruebas. No subir credenciales.
3. Ejecutar `npm run db:init`, que pertenece a la rama de C, sobre la base de desarrollo.
4. Ejecutar `npm run dev`.
5. Abrir http://127.0.0.1:5173 en dos perfiles o navegadores con cuentas distintas. El servidor escucha en el puerto 3000.

Para producción: `npm run build`, configurar `NODE_ENV=production`, `APP_ORIGIN` con el origen público HTTPS y ejecutar `npm start`. Cliente, API y WebSocket usan el mismo origen. La URL pública y su proveedor siguen pendientes.

## Comandos

| Comando | Función |
| --- | --- |
| npm run dev | Cliente Vite y servidor con recarga |
| npm run dev:client | Cliente; permite revisar menú/ayuda y práctica DEV |
| npm run dev:server | Servidor |
| npm run build | Cliente de producción |
| npm start | Servidor y cliente construido |
| npm run verify | Lint, pruebas y build |
| npm run test:e2e | Tres recorridos reales; requiere C, puente B y base de pruebas |
| npm run verify:release | Verificación base y E2E |

La [práctica local](docs/client-preview.md) continúa en desarrollo en `/?practice=1`. La entrada normal es el cliente online. La práctica no se incluye en producción.

## Documentación

- [Reglas del juego](docs/game-design.md)
- [Mapas y referencias de A](docs/maps.md)
- [A1: mapa y personajes](docs/a1-integration.md)
- [A2: HUD y efectos](docs/a2-visuals.md)
- [A2/A3: pantallas, red e integración](docs/a23-integration.md)
- [Puente de autenticación y resultados con PostgreSQL](docs/postgres-bridge.md)
- [Contrato técnico](docs/contracts.md)
- [Servidor de juego](docs/game-server.md)
- [Autenticación](docs/auth-integration.md)
- [Salas y WebSocket](docs/lobbies-network.md)
- [Pruebas E2E](tests/e2e/README.md)
- [GitHub y ramas](docs/github-workflow.md)
- [Preparación de entrega](docs/evaluation.md)

## Pendiente de entrega

Integrar las ramas, verificar Supabase real, montar y comprobar los endpoints de siembra/telemetría de C, cerrar el requisito procedural y desplegar por HTTPS. Las tres variantes de paredes optativas no sustituyen por sí mismas la validación final de ese requisito. Medir latencia y endpoints en la URL pública; revisar balance y controles en teléfono físico.

Repositorio: https://github.com/JuanWick777/WeekendProject (privado; dar acceso al evaluador).
URL pública: PENDIENTE.
