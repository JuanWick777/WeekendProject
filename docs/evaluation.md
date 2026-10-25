# Evaluación y entrega

Checklist de requisitos, no afirmación de cumplimiento. Ya hay arranque, health, constantes v2, esquemas, auth HTTP, salas/WebSocket y simulación de partida con autenticación/guardado inyectados. Hasta B3 hay 65 pruebas aprobadas, incluyendo mapas, daño y recorridos HTTP/WebSocket de dos cuentas. Faltan PostgreSQL, cliente, interpolación y E2E de navegador; no se declara cumplida la entrega por el total de casos.

## Obligatorio

- [ ] Server-authoritative: posiciones, colisiones, inventario, proyectiles, daño y puntos.
- [ ] WebSocket real, sesiones verificadas y RTT ping/pong <100 ms en evaluación.
- [ ] Canvas 2D, dt y objetivo 60 FPS; velocidad consistente entre tasas de refresco.
- [ ] PC: teclado + ratón; móvil: joystick izquierdo + acción/apuntado derecho.
- [ ] GET /api/test/telemetry con win rate, KDR y supervivencia, HTTP 200 <200 ms.
- [ ] POST /api/test/seed con lotes controlados de 100-1000 partidas; HTTP 200 y rendimiento verificado.
- [ ] Diez pruebas funcionales en Vitest/Jest para mapas, daño/escalado, Zod e interpolación.
- [ ] E2E autenticación: credenciales y acceso protegido.
- [ ] E2E lobbies: crear, entrar, Listo y conexión de sockets.
- [ ] E2E Canvas: controles reales y coordenadas autoritativas reflejadas en DOM.
- [ ] Actions en cada PR, incluyendo E2E; historial en verde.
- [ ] URL pública, HTTPS válido y endpoints activos.
- [ ] Entregar URL pública y URL del repositorio.

## Aceptación del modo elegido por el equipo

Estos puntos son decisiones de diseño para cumplir el proyecto; no son nuevas exigencias del profesor:

- [ ] Una arena base con variantes de cobertura por semilla; mapa reproducible y transitable, con fallback probado.
- [ ] Todos los clientes ven el mismo mapa; rotar el objetivo no cambia paredes.
- [ ] Cinco nodos, uno activo por 30 s, ronda de 150 s y aviso de 5 s.
- [ ] Único ocupante vivo puntúa; vacío/disputado no. Las fracciones se conservan y el control total no supera la duración.
- [ ] Proyectiles dirigidos, escudo 0/1, muerte y respawn autoritativos.
- [ ] Empate, abandono, reconexión y revancha sin duplicar jugador ni resultado.
- [ ] MatchResult guarda control y semilla/versiones; datos sintéticos respetan estas reglas.
- [ ] HUD y resultados representan los campos v2; se retiraron carga y sincronización de la modalidad anterior.

Fuentes internas: [reglas](game-design.md), [mapas](maps.md), [contrato](contracts.md). Los cinco nodos y el escudo son decisiones del equipo; no atribuir al PDF sus valores o mecánicas.

## Payload decidido por el equipo

~~~json
{ "seed": 42, "matches": 1000, "batchId": "evaluation-001" }
~~~

POST /api/test/seed con Content-Type: application/json. Repetir batchId no duplica datos. GET /api/test/telemetry por defecto incluye live y seed; source permite filtrarlos.

## Evidencia que debemos conservar

- Commit evaluado y las dos URL.
- Comandos de instalación y ejecución; versión Node.
- Cuentas de demostración disponibles, sin exponer contraseñas privadas del equipo.
- Reporte de los diez casos funcionales y los tres flujos, incluidos resultados de Actions.
- Capturas PC/móvil; prueba de dos clientes independientes en una partida.
- Método de medición de RTT/HTTP, número de muestras, región, dispositivo, hora y percentiles/máximo.
- Diferenciar tiempo HTTP completo, procesamiento del backend y arranque frío.
- Mostrar cualquier muestra fuera de los límites; no declarar aprobado por reportar solo el promedio.
- Verificar persistencia tras reinicio y que no se cuenten datos seed como partidas humanas.

## Riesgo de infraestructura pendiente

El servicio gratuito puede dormir tras inactividad. Comprobar primer acceso y servicio activo: el límite de 200 ms no está garantizado para arranque frío. Probar el hosting desde el primer bloque y revisar opciones con el equipo si impide cumplir. El despliegue no está realizado todavía.
