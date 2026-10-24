# C — Persistencia, telemetría, calidad y despliegue

Tu trabajo comienza en paralelo con A y B. No tienes que esperar a que exista la partida completa. Lee contracts.md, tasks.md y evaluation.md.

## C1: datos y primer despliegue

1. Preparar PostgreSQL para desarrollo y otra base aislada para pruebas. Usaremos pg con un pool pequeño y consultas parametrizadas. No implementar SQLite y PostgreSQL a la vez.
2. Crear server/src/storage/schema.sql y pool.js.
3. Entidades iniciales: users, sessions, matches, player_results y seed_batches. IDs y restricciones deben impedir resultados y lotes duplicados.
4. Implementar users.js y sessions.js con las firmas de contracts.md. Entregarlas a B primero.
5. Implementar matches.js y guardado transaccional de una partida con sus resultados.
6. Crear scripts/db-init.js y el comando raíz db:init. Debe poder ejecutarse otra vez sin borrar usuarios/resultados.
7. Crear cuenta de Render y comprobar un primer despliegue del bootstrap. Conectar servicio Node y Postgres en la misma región mediante su URL interna.

El plan base es Render + PostgreSQL gratuito. Railway puede reconsiderarse si se habilitan nuevas cuentas, pero no se debe detener el trabajo esperándolo. Consultar estado y condiciones antes de crear recursos:

- https://status.railway.com/
- https://render.com/docs/free
- https://render.com/docs/postgresql-creating-connecting

En Render: construir con npm ci y npm run build; arrancar con npm start; NODE_ENV=production y HOST=0.0.0.0. Configurar APP_ORIGIN con la URL HTTPS real. DATABASE_URL y secretos son variables de servidor. La base actual solo expone health; no afirma que DB/WebSocket estén listos.

El disco local del servicio gratuito no conserva SQLite; Postgres gratuito expira a los 30 días. El servicio web puede dormirse después de inactividad. Registrar el tiempo de arranque frío y medir los endpoints también una vez activos: un primer acceso de alrededor de un minuto incumpliría el criterio de 200 ms. No declarar el requisito cumplido hasta comprobarlo.

Terminado C1: B puede registrar/iniciar sesión con persistencia y el equipo tiene una URL real. No cambiar la arquitectura por un fallo de cuenta sin avisar.

## C2: datos y métricas

- POST /api/test/seed acepta seed, matches (100-1000) y batchId.
- Generar resultados coherentes: ganadores consistentes con puntos/desempates, vida acumulada entre cero y la duración, bajas y muertes coherentes.
- Marcar origen seed; no borrar ni sobrescribir partidas live ni cuentas reales.
- Insertar por lotes en transacción. Repetir batchId devuelve 200 sin duplicar.
- GET /api/test/telemetry devuelve agregados y por jugador. Permitir source=all|live|seed; por defecto all.
- Aplicar las fórmulas de contracts.md, incluida la convención de KDR con cero muertes.
- Exponer estos dos endpoints en evaluación sin exigir una credencial que el evaluador desconozca. Limitar tamaños y frecuencia sin impedir los lotes de evaluación.
- Medir con 100 y 1000 partidas y conservar resultados reproducibles.

## C3: pruebas y CI

- Crea dos pruebas funcionales de payload Zod y una de telemetría/siembra. Coordina con B sus cinco y con A sus dos de interpolación.
- Las pruebas iniciales del bootstrap son apoyo, no la cobertura funcional de mapas/combate/interpolación.
- E2E auth: credencial incorrecta, correcta y rechazo de acceso sin sesión, también al socket.
- E2E lobby: dos contextos de navegador, dos cuentas, creación, entrada, listo y conexión WebSocket real.
- E2E gameplay: controles reales, input de movimiento y disparo, cambio de coordenadas autoritativas reflejado en DOM y observación desde el segundo cliente. Cubrir variante táctil.
- No simular el servidor, mover el DOM directamente ni usar fixtures como sustituto del multijugador en los E2E finales.
- Agregar servicio PostgreSQL aislado a Actions, instalar Chromium y ejecutar npm run verify:release en cada PR.
- Un test vacío, skipped o una suite sin casos no acredita un requisito.

La configuración de Playwright existe, pero los tres spec y el paso E2E del workflow están pendientes. tests/e2e/README.md explica el punto de partida. Usar TEST_DATABASE_URL y evitar que un test escriba en la base pública.

## C4: entrega y evidencia

- Completar README con URL pública y URL del repositorio.
- Escribir instrucciones del payload de seed, fórmulas, acceso demo y ejecución de tests.
- Añadir script de medición HTTP/RTT con muestras, región y condiciones. Separar procesamiento de backend y tiempo HTTP completo.
- Guardar evidencia de pipeline verde y de controles móviles, y registros de medición.
- Comprobar que los resultados sobreviven a un reinicio y que el frontend servido corresponde al commit entregado.

Primera prioridad de hoy: usuarios/sesiones para B y acceso público mínimo. La telemetría y los E2E avanzan conforme existan los contratos y módulos; no se acumulan todos para el final.
