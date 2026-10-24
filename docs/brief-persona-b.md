# B — Servidor, salas y simulación

Este rol lo toma el coordinador de este chat. B0 está publicado en main. La rama de implementación incorpora B0.1 y la lógica HTTP de B1; falta conectar PostgreSQL de C y comprobar persistencia real. Mantienes shared y `server/src/auth`, rooms, net y game; coordinas app.js, index.js y config.js. C mantiene storage/telemetry y A client.

Referencias: [reglas v2](game-design.md), [contrato v2](contracts.md), [mapas](maps.md) y [tareas](tasks.md). Este documento es un plan, no una lista de funciones ya disponibles.

## B0.1 — Migración compartida implementada

Actualizar constants.js al modo rotating_control: duración 150000, cinco intervalos de 30000, preaviso 5000, radio 64, escudo máximo 1, reaparición 3000 y recogidas cada 8000 ms. Retirar syncDurationMs, syncRadius, maxCarry y droppedPickupLifetimeMs. Mantener reglas de movimiento, bláster y red.

Elevar PROTOCOL_VERSION a 2, mantener nombres de mensajes/rutas e inputs compatibles y dar a A/C fixtures documentados de mapa, snapshot y MatchResult v2. Comprobar que health publica la versión correcta. Este cambio es la primera tarea de código después de la documentación.

## B1 — HTTP implementado; integración PostgreSQL pendiente

1. Consumir las interfaces users/sessions de C mediante inyección; no crear otra persistencia de producción. Se puede avanzar con repositorios de prueba mientras C entrega PostgreSQL.
2. Registro con username normalizado, displayName y hash scrypt asíncrono de node:crypto; no guardar contraseña. Duplicado -> 409, credenciales incorrectas -> 401.
3. Login, logout y me; sesiones aleatorias con hash persistido, cookie HttpOnly/SameSite/Secure según contrato y duración 24 h.
4. Middleware para salas y validación de Origin en operaciones mutables/upgrade. Ningún cliente escoge su identidad.
5. Integrar repositorios reales y probar dos cuentas. Las respuestas públicas no incluyen hashes ni tokens.

Terminado: registro/login crean sesión; me reconoce sesión válida, rechaza ausente/expirada; logout la invalida. Probar rutas con cookies reales y repositorios aislados, sin esperar al Canvas.

## B2 — Salas y conexión autenticada

- Código de seis caracteres; crear, entrar, salir, Listo, transferir host y permisos de inicio/revancha.
- Estados lobby/countdown/playing/finished; iniciar solo con 2–4 conectados y listos. Cancelar countdown si dejan de cumplirse las condiciones; no admitir nuevos participantes en playing.
- Upgrade /ws con sesión y Origin válido; un socket vigente por usuario y pertenencia verificada.
- welcome/lobby, ping/pong RTT y heartbeat; no duplicar jugadores al reconectar.
- Validar Zod, tamaño, frecuencia y fase desde el principio; no posponer la autoridad hasta el cierre.

Terminado: dos cuentas en navegadores distintos comparten sala, Listo y cuenta regresiva reales. Usuario sin sesión no accede a HTTP protegido ni a WebSocket.

## B3a — Primera partida integrada

1. Convertir el boceto de A en plantilla y generar/validar variantes por semilla con fallback según maps.md.
2. Tick fijo 30 Hz y movimiento normalizado con colisiones; reloj del servidor.
3. Objetivo rotatorio, puntuación fraccionaria y estados empty/controlled/contested.
4. Snapshots 15 Hz con lastProcessedSeq, objective y campos v2.
5. Fin a 150 s y resultado coherente con puntos/desempates.

Primer encuentro con A: dos jugadores llegan al nodo, uno puntúa, con dos se detiene, al salir uno continúa y al rotar deja de puntuar la zona anterior. Este es el primer recorrido a integrar, antes del acabado visual.

## B3b — Combate, inventario y resultados

- Bláster: intervalo 350 ms, velocidad 480, alcance 320, radio 3 y daño 30→20. Detectar primer impacto por segmento completo.
- Una carga de escudo, recogida automática, absorción de un impacto, reaparición de recogida a 8 s.
- Muerte, bajas, pérdida del escudo y respawn a 3 s sin perder puntos/control.
- Resolver ticks en orden documentado; conservar invariantes de control, vida y duración.
- Construir MatchResult una sola vez; llamar saveMatch de C fuera del tick. Mostrar y registrar fallos de guardado, sin fingir persistencia.

Terminado: ronda completa online entre dos o más cuentas, con resultado guardado de manera idempotente y repetible en una revancha.

## B4 — Desconexión y cierre

Input caducado a 250 ms, secuencias antiguas ignoradas y socket sustituido inactivo. Reconexión del mismo jugador por 15 s, detenido/vulnerable y sin reiniciar puntaje. Plazo vencido o salida voluntaria -> abandono; resolver ganador restante o abortada. Cancelar timers, limpiar sockets/salas y no duplicar resultados. Estas reglas se incorporan con B2/B3; B4 comprueba el recorrido completo.

## Pruebas y entregables

Cinco casos funcionales base: dos de mapas (determinismo y transitabilidad/validez), dos de daño (fórmula y límites) y uno de autoridad (input no atraviesa paredes ni excede velocidad). Añadir casos de nodo vacío/único/disputado, fracciones, rotación y fin sin exceso de tiempo; escudo/respawn y sesiones deben tener verificaciones útiles. Las siete pruebas iniciales no sustituyen esta cobertura.

Entregar a A login/lobby reales y ejemplos v2; a C interfaces estables y resultado definitivo; a ambos fallos de protocolo explícitos. Trabajar por ramas pequeñas con PR y revisión, comenzando por B0.1 y después retomando feat/auth desde main actualizado. No mezclar cambios ajenos ni otro motor/transporte.
