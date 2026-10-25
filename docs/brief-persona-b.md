# B — Cliente, servidor y simulación

B asume ahora client y shared, además de auth/rooms/net/game. A diseña y revisa las referencias; C implementa storage/telemetry, pruebas globales, CI y despliegue. Coordinar index.js, app.js y dependencias con C.

## Implementado

Bootstrap, autenticación HTTP inyectable, salas, WebSocket autenticado y simulación B3 están integrados por los PR #1–#4. Las pruebas usan conexiones HTTP/WebSocket reales y repositorios aislados; falta unir PostgreSQL.

El bloque actual adapta la arena a 768 × 640, 48 × 40 tiles de 16; plantilla cardinal-sketch v2 y protocolo 3. Implementa cuatro recogidas iniciales y una aleatoria a la vez con cadencia 15 s. Conserva atributos, combate, nodos, resultado y firmas de persistencia. Ver [mapas](maps.md) y [contrato](contracts.md).

La [vista industrial de diseño](client-preview.md) incluye Canvas, drones, HUD, teclado/ratón, pads táctiles y cámara. Es local y solo se incluye en desarrollo; sirve para revisar presentación y física. No es el recorrido online y no otorga puntos ni guarda resultados.

## Siguiente trabajo del cliente

1. API y pantallas funcionales de registro/login, crear/entrar sala, Listo y countdown. Incorporar el acabado de A cuando lo entregue.
2. Consumir match:start/state/event/match:end; renderizar el mapa recibido y deduplicar eventos.
3. Interpolar rivales/proyectiles y reconciliar al jugador local con lastProcessedSeq. Inputs a 20 Hz; no calcular autoridad en el cliente.
4. Integrar HUD, muerte/respawn, resultados, revancha y errores. Mantener el mismo HUD PC/móvil y ocultar pads en PC.
5. Exponer las coordenadas de snapshots en player-state para E2E; las coordenadas de preview/predicción permanecen separadas.
6. Comprobar entrada simultánea con dos dedos, cancelación, cambio de foco, escala y orientación en móvil real.

## Integración con C y cierre B4

Conectar users/sessions con createAuthService y matches.saveMatch con createServerRuntime según [game-server.md](game-server.md). Comprobar dos cuentas con PostgreSQL, resultado idempotente y persistencia tras reinicio. No crear otra persistencia de producción ni consultar la base por tick.

Cerrar reconexión de 15 s, secuencias, expiración de sesión, abandono, limpieza y fallo de guardado sobre el cliente real. El servidor comunica RESULT_NOT_SAVED y conserva temporalmente el último resultado; todavía falta reintento automático de guardado.

## Verificación

72 pruebas actuales más lint/build aprobados. Hay casos de mapas, daño, autoridad, nodos/tiempos, escudos, sesiones, salas/red y encuadre. Faltan las pruebas de interpolación y los tres E2E de navegador con PostgreSQL/Canvas reales, coordinados con C. Diez casos es el mínimo de la rúbrica, no el objetivo final de cobertura.

Trabajar en ramas por tarea desde main actualizado, con PR y checks. No mezclar cambios ajenos. El objetivo inmediato es login -> lobby -> ronda -> resultado -> persistencia; efectos y sonido se pulen después.
