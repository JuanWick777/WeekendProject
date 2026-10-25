# Tareas y orden de integración — protocolo 3

Entrega domingo 25/10/2026 23:59, Ciudad de México; objetivo antes de 21:30. A queda en diseño/revisión, B asume toda la programación del cliente además del servidor y C conserva datos, calidad y despliegue.

| Bloque | Responsable | Estado o siguiente resultado |
| --- | --- | --- |
| Bootstrap, contrato inicial, auth, salas, WS y simulación B3 | B | Integrados en main, PR #1–#4; PostgreSQL pendiente |
| Adaptación de arena y escudos | B | Implementados: 768 × 640, plantilla v2, protocolo 3 y cadencia 15 s |
| Vista industrial de diseño | B; A revisa | Canvas local, HUD, drones, teclado/táctil y capas de inspección |
| Arte y pantallas | A | Colores y referencias recibidos; faltan menú, auth, lobby y resultados |
| Repositorios C1a/C1b | C; B integra | users/sessions y saveMatch reales; dos cuentas y persistencia tras reinicio |
| Cliente online | B | Conectar auth/lobby, mapa/snapshots, interpolación y reconciliación |
| Controles y recorrido completo | B; A revisa | PC/móvil, resultados/revancha, errores y coordenadas autoritativas para E2E |
| B4 | B | Cerrar reconexión, abandono, limpieza y fallos de guardado con cliente/DB reales |
| C2 | C | Siembra 100/1000, métricas y rendimiento |
| C3 | C coordina | PostgreSQL aislado, interpolación de B y tres E2E reales por PR |
| C4 | C coordina | URL HTTPS, auditoría pública, evidencia y entrega |

## Orden inmediato

Revisar/publicar este bloque de mapa, escudos y vista de diseño. A revisa capturas mientras B conecta el cliente al servidor. C entrega users/sessions primero y después guardado; B coordina index.js para esa unión. No hace falta esperar a que A termine cada pantalla para comenzar sus funciones.

La vista de diseño está identificada como local y solo se incluye en desarrollo. No acredita multijugador, puntuación real ni guardado. El renderizador se reutilizará con el mapa/snapshots de servidor. Ver [client-preview.md](client-preview.md).

## Aceptación

72 pruebas actuales, lint y build aprobados. Hay cobertura de mapas, daño, inputs Zod, tiempo/objetivos, escudos, encuadre y HTTP/WebSocket. Pendientes interpolación, PostgreSQL, telemetría/siembra y tres E2E de navegador, incluidos controles reales y observación desde otro cliente. La inspección de tamaños móviles no sustituye una prueba física de dos dedos.

Conservar las firmas de repositorios de contracts.md. Protocolo 3 añade spawnKind al mapa y shieldSpawnIntervalMs a la configuración; MatchResult mantiene su forma. No consultar DB por tick ni introducir persistencia alternativa.

## Git y propiedad

Ramas por tarea y PR a main, checks y revisión. A mantiene referencias; B client, shared y auth/rooms/net/game; C storage/telemetry/scripts/E2E/CI/despliegue. Coordinar index.js, app.js y dependencias. Una instalación y lockfile en la raíz.

No ampliar a otra arena, equipos, clases o habilidades. El domingo a las 18:00 se congelan funciones para reservar pruebas públicas, móviles y entrega. Efectos y sonido se pulen después del recorrido login -> lobby -> ronda -> resultado -> persistencia.
