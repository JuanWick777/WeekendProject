# C — Guía completa de datos, calidad y despliegue

Tu responsabilidad es storage, telemetry, scripts, E2E, CI y despliegue. B mantiene autenticación, salas, red, simulación y shared; A cliente y arte. Usa JavaScript ESM, PostgreSQL y pg. No necesitas esperar a que la partida esté terminada.

Lee [contracts.md](contracts.md), [game-design.md](game-design.md), [tasks.md](tasks.md) y [evaluation.md](evaluation.md). El código ya incorpora constantes v2, auth HTTP, salas/WebSocket y simulación B3 con autenticación/guardado inyectados. Entrega users/sessions y matches.saveMatch a B para conectarlos al runtime según [auth-integration.md](auth-integration.md) y [game-server.md](game-server.md). El cliente y PostgreSQL todavía no están conectados al recorrido final. La entrega termina el domingo 25/10/2026 a las 23:59, Ciudad de México.

## Qué cambió y qué guardar

El modo es `rotating_control`: FFA 2–4, ronda de 150 s, cinco nodos de 30 s, único ocupante suma tiempo y dos o más disputan. No hay transporte de fragmentos ni sincronización. Una sola arena tiene variantes de cobertura por semilla, generadas y validadas por B. No implementes un generador propio.

Conserva las estadísticas requeridas de victorias, bajas/muertes y supervivencia. Añade controlTimeMs, mode, templateId, templateVersion y generatorVersion según MatchResult. La puntuación es floor(controlTimeMs/1000); los puntos se conservan al morir. La semilla y las versiones permiten reproducir la geometría con la versión correspondiente del código.

## Persistencia completa

- Preparar base de desarrollo y base de pruebas aislada. Pool pequeño con pg y consultas parametrizadas. Nunca ejecutar limpieza de tests en la base pública.
- Crear server/src/storage/schema.sql y pool.js; entidades users, sessions, matches, player_results y seed_batches. Si los participantes seed se modelan aparte, conservar su identidad estable sin crear sesiones/cuentas utilizables.
- Crear users.js y sessions.js con las firmas de contracts.md. Esta es tu **primera entrega a B**; B se encarga del hash de contraseña, token y cookie.
- Username normalizado único, tokenHash único, claves foráneas e índices para sesión/telemetría. Duplicado de username devuelve el código acordado USERNAME_TAKEN a B.
- matches.saveMatch guarda cabecera y resultados en una transacción, idempotente por matchId. Una retransmisión del resultado no inserta otra partida.
- Persistir fechas/duración/estado/motivo, winnerId/empate, modo y versión de mapa; por participante: score, controlTimeMs, kills, deaths, aliveMs, participatedMs, won, draw y forfeited.
- Convertir números y fechas PostgreSQL a los tipos JS del contrato. Conservar hasta tres decimales de ms, admitir duración 0 y mantener las desigualdades del contrato; no almacenar todos los ticks ni inventario/transitorios en la base.
- Añadir scripts/db-init.js y npm run db:init, repetible sin borrar datos. Documentar configuración y migraciones que se necesiten.

Las posiciones, proyectiles, ocupación y escudos se calculan en memoria por B. No consultar PostgreSQL por tick. Reportar fallos de escritura al servidor; el fin de una partida no debe fingir que se guardó correctamente.

## Siembra reproducible

POST /api/test/seed recibe seed uint32, matches entero 100–1000 y batchId; respuesta e idempotencia están en contracts.md. Insertar en lote y transacción con source=seed. No borrar ni sobrescribir partidas live ni atribuir resultados sintéticos a cuentas humanas.

Genera resultados válidos: control <= vida <= participación <= duración, suma del control de todos <= duración, score consistente y ganadores según puntos/bajas/muertes. Para fixtures sin muertes ambientales, las bajas totales deben corresponder a las muertes. Incluye datos útiles para comprobar denominadores cero y empates. No basta con asignar números independientes.

La misma semilla y configuración generan el mismo contenido sintético; batchId identifica el lote y repetirlo no duplica. Cambiar parámetros con el mismo batchId tampoco reemplaza el primer lote. La siembra de evaluación crea registros; **no simula 1000 rondas en tiempo real**. Tampoco es el generador procedural de mapas.

## Telemetría completa

GET /api/test/telemetry responde con agregados globales y por jugador. Filtro source=all/live/seed, por defecto all; solo completed entra a contadores/tasas. Las fórmulas y campos exactos están en contracts.md:

- Win rate: victorias / participaciones completadas, porcentaje; empate no cuenta como victoria.
- KDR: bajas / max(1, muertes).
- Supervivencia: segundos de vida promedio y porcentaje de vida sobre tiempo participado.
- Control: segundos de control promedio por participación.

Calcular el global desde sumas, sin promediar tasas de jugadores. Sin datos: ceros y players vacío, nunca NaN/Infinity. Conservar source para distinguir prueba y juego humano. Ambos endpoints de evaluación responden sin sesión; validación y límites no deben impedir los lotes acordados.

## Pruebas y Actions

Coordina al menos diez casos funcionales: B aporta dos de mapas, dos de daño y uno de autoridad; A dos de interpolación; tú dos de payload Zod y uno de métricas/siembra. B3 ya aporta casos de mapas, daño, autoridad, ocupación, disputa, fracciones, rotación, escudo y fin: el total es 65 pruebas, incluidas conexiones HTTP/WebSocket reales. Faltan PostgreSQL, interpolación, métricas/siembra y E2E de navegador; no detenerse en diez si faltan reglas esenciales.

Implementa los tres E2E con servidor y PostgreSQL reales, sin mocks como sustituto del recorrido final:

1. Auth: credencial incorrecta, correcta y acceso protegido sin sesión, incluido upgrade WS.
2. Lobby: dos contextos/cuentas, crear, entrar, Listo, inicio y sockets reales.
3. Gameplay Canvas: controles de movimiento/disparo, cambio autoritativo de x/y reflejado en DOM y observado en el segundo cliente. Variante táctil para mover/apuntar simultáneamente; comprobar también la presentación del objetivo.

No mover el DOM ni llamar funciones de simulación desde la página para aparentar input. Acuerda selectores estables con A. Las coordenadas del test salen de snapshots, separadas de la predicción visual.

Playwright ya está configurado con desktop y mobile-landscape, pero faltan los spec. Añade PostgreSQL aislado a Actions, instalación de Chromium y npm run verify:release en cada PR. Usa TEST_DATABASE_URL y fija variables necesarias. Suite vacía, skipped o prueba que solo encuentra un Canvas no acredita los flujos. Publica evidencia de fallos y aprobación; no ocultes checks para integrar.

## Despliegue y rendimiento

Plan acordado: **Render con un servicio Node y PostgreSQL**, misma región y conexión interna. Crea las cuentas necesarias y verifica las condiciones vigentes antes de crear recursos: [servicios gratuitos](https://render.com/docs/free), [PostgreSQL](https://render.com/docs/postgresql-creating-connecting). El presupuesto preferido es gratuito o créditos de prueba; si no alcanza, comunicar el límite concreto al equipo antes de contratar.

Build: npm ci y npm run build. Start: npm start. Variables de servidor: NODE_ENV=production, HOST=0.0.0.0, APP_ORIGIN con origen HTTPS real y DATABASE_URL; secretos fuera del repo y cliente. El servicio sirve frontend, API y WebSocket desde un origen. No usar almacenamiento local efímero para persistir resultados.

Comprobar URL pública, TLS, upgrade seguro, cookies, persistencia tras reinicio, acceso desde dos dispositivos y que el commit desplegado coincide con el entregable. Revisar límites de inactividad y caducidad de la base gratuita. No se ha hecho un despliegue todavía.

Implementa mediciones con 100 y 1000 partidas, HTTP completo y RTT de aplicación. Guardar muestras, región, dispositivo, fecha, percentiles y máximo. Separar arranque frío y servicio activo; reportar muestras fuera de <200 ms HTTP y <100 ms RTT. Tiempo de backend o prueba local no demuestra rendimiento público. Un servicio dormido puede impedir cumplir: probarlo pronto y llevar el dato al equipo.

## Entrega y coordinación

Completar README con URL pública, repositorio, instalación, variables sin secretos, payload de seed, fórmulas, cuentas demo y comandos de pruebas. Conservar evidencia de Actions, PC/móvil, dos clientes y rendimiento. El repositorio es privado; el evaluador debe tener acceso.

Trabaja en feat/storage, luego ramas cortas para telemetría/CI/despliegue con PR a main. B conecta routers en app.js en un cambio coordinado; avisa antes de cambiar dependencias, lockfile o interfaces compartidas. Mantén [github-workflow.md](github-workflow.md).

Tu trabajo termina cuando cuentas/sesiones/resultados persisten, siembra y métricas son correctas y reproducibles, los tres E2E se ejecutan en cada PR y la URL pública permite demostrar una ronda completa con evidencia de los criterios. Primero entrega users/sessions a B y una URL mínima; no acumules toda la integración para el domingo.
