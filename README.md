# CyberGrid — Breach & Sync

Juego web multijugador de control de nodos rotatorios con disparos de energía. De 2 a 4 jugadores, todos contra todos: una ronda dura 150 segundos y activa cinco nodos, uno cada 30 segundos. Solo un ocupante vivo puntúa; una zona disputada detiene la puntuación.

## Estado de esta integración

A1 conserva el mapa industrial y los 32 PNG originales de A con geometría compartida. A2 añade HUD, efectos y presentación del juego online. A3 incorpora menú, registro/login, salas, lobby, ayuda y resultados con datos reales, más controles PC/móvil, interpolación, predicción y recuperación de la ronda.

El paquete de entrega separa estos cambios del puente de servidor de B. El juego online completo requiere también los módulos PostgreSQL y las correcciones de C. El servidor integrado comprueba la conexión y el esquema al arrancar; no sustituye una base ausente con usuarios o resultados de demostración.

Validado en una copia aislada con Node 24.22.1, PostgreSQL 18 local y Edge: lint, 105 pruebas, build y tres recorridos E2E. La cifra incluye las 16 pruebas del paquete corregido de C. No acredita todavía Supabase por internet, despliegue público o un teléfono físico. Ver [integración A2/A3](docs/a23-integration.md).

## Arrancar después de integrar C y el puente de B

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
