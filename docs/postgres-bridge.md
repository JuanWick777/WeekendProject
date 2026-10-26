# Puente PostgreSQL de B

El puente enlaza el cliente A1/A2/A3 con los repositorios de C. Conserva el mapa, los PNG y las reglas compartidas. La integración incluye los módulos y el helper de C publicados en el PR #7.

## Arranque y base de datos

`server/src/postgres-services.js` importa `storage/pool.js`, comprueba las tablas users, sessions, matches, player_results y seed_batches y conecta autenticación, guardado y evaluación con los servicios de C. `index.js` espera esta preparación antes de escuchar. Una conexión, esquema o repositorio ausente termina con código 1 y un mensaje sin credenciales ni errores SQL privados.

La comprobación no crea tablas ni aplica migraciones. Ese paso corresponde a `npm run db:init` de C. El cierre del proceso espera al runtime y cierra después el pool, con un límite de cinco segundos. Los usuarios, las sesiones y los resultados viven en PostgreSQL; las salas y rondas activas permanecen en memoria.

`GET /api/health` informa `database: ready` tras la comprobación inicial. Es liveness con estado de arranque; no ejecuta una consulta SQL en cada petición y no garantiza disponibilidad continua de la base.

## Resultados y errores

El administrador publica `match:persistence` con `{ matchId, status }`:

- `pending`: el resultado terminó y el guardado sigue pendiente.
- `saved`: `saveMatch` terminó correctamente, incluido un guardado idempotente ya existente.
- `failed`: falló el repositorio; se comunica también `RESULT_NOT_SAVED`, sin detalles SQL.
- `unavailable`: el runtime inyectado de pruebas no tiene repositorio de resultados.

El arranque normal siempre exige los módulos reales de C. `saved` se emite únicamente después de resolver el guardado. Al reconectar a una sala terminada se envían el resultado y su estado actual de persistencia. La retención en memoria es de cinco minutos o hasta la siguiente ronda; no sustituye la base. Todavía no existe reintento automático de un guardado fallido.

El mensaje es aditivo al protocolo 5 y no cambia MatchResult. La cola de salida WebSocket admite 256 KiB para el mapa original de A; el límite de entrada del cliente permanece en 4096 bytes.

## Configuración

Usar Node 24. Conservar una base de desarrollo y otra distinta de pruebas; copiar `.env.example` a `.env` solo si aún no existe y completar sus valores localmente.

```powershell
npm.cmd ci
npm.cmd run db:init
npm.cmd run verify
$env:E2E_BROWSER_CHANNEL = 'msedge'
npm.cmd run test:e2e
Remove-Item Env:E2E_BROWSER_CHANNEL
npm.cmd run dev
```

El acceso de desarrollo es http://127.0.0.1:5173, con el servidor en el puerto 3000. Dos participantes necesitan cuentas y sesiones de navegador distintas. La práctica local continúa en `/?practice=1`.

Producción utiliza un mismo origen HTTPS para cliente, API y WebSocket, `NODE_ENV=production`, `APP_ORIGIN` público, `npm run build` y `npm start`. Un proceso mantiene las salas; escalar a varios procesos requiere coordinación adicional.

## Verificación de esta entrega

- Proyecto integrado A+B+C: lint, 107 pruebas en 17 archivos y build aprobados sobre PostgreSQL 18 local aislado. Las pruebas de red verifican pending/saved/failed/unavailable, guardado único y recuperación del estado después de reconectar.
- Prueba del proceso real: configuración o esquema ausente impide escuchar; registro sobre PostgreSQL, reinicio y recuperación de la misma sesión comprobados.
- Edge: tres E2E aprobados en 35.0 s sobre el proyecto integrado, con cuentas, HTTP, WebSocket y resultados PostgreSQL reales; incluyen dos pads simultáneos, recuperación de ronda, empate y revancha. El servidor E2E acorta únicamente sus rondas a 15 s.
- El usuario comprobó previamente el flujo completo en PC y teléfono real dentro de la red local.

El helper `server/test/helpers/pg-latency.js` está registrado desde el commit 80f33f7 de C. La base temporal de validación es distinta de la usada por las vistas de revisión. El workflow de CI inicializa PostgreSQL 16, ejecuta la suite, compila y corre los tres E2E con Chromium; conserva capturas y trazas si falla.

Siguientes bloques: montar los endpoints de siembra/telemetría, resolver el requisito procedural, verificar Supabase, desplegar por HTTPS y medir la URL pública. No forman parte de este puente.
