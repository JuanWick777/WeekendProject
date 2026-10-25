# Tareas y orden de integración — protocolo 4

Entrega lunes 26/10/2026 16:00, Ciudad de México; objetivo de entrega 15:30. A queda en diseño/revisión, B asume toda la programación del cliente además del servidor y C conserva datos, calidad y despliegue.

| Bloque | Responsable | Estado o siguiente resultado |
| --- | --- | --- |
| Bootstrap, contrato inicial, auth, salas, WS y simulación B3 | B | Integrados en main, PR #1–#4; PostgreSQL pendiente |
| Adaptación de arena y escudos | B | Implementados: arena fija 1280 × 1120, plantilla v4, protocolo 4, rutas protegidas y escudos 15 s |
| Vista industrial de diseño | B; A revisa | Canvas local, cuatro diseños detallados, combate/escudos/respawn canónicos, HUD y controles |
| Arte y pantallas | A | Menú, crear/unirse, lobby, ayuda y resultados recibidos y solo analizados; falta autenticación/estados |
| Repositorios C1a/C1b | C; B integra | PR #7 abierto: corregir contrato de sesión/expiración, aislamiento de DB, duplicados y tiempos; después saveMatch e integración |
| Cliente online | B | Conectar auth/lobby, mapa/snapshots, interpolación y reconciliación |
| Controles y recorrido completo | B; A revisa | PC/móvil, resultados/revancha, errores y coordenadas autoritativas para E2E |
| B4 | B | Cerrar reconexión, abandono, limpieza y fallos de guardado con cliente/DB reales |
| C2 | C | Siembra 100/1000, métricas y rendimiento |
| C3 | C coordina | PostgreSQL aislado, interpolación de B y tres E2E reales por PR |
| C4 | C coordina | URL HTTPS, auditoría pública, evidencia y entrega |

## Orden inmediato

Revisar/publicar la arena fija v4 y sus pasos. Las nuevas referencias de menús solo se analizan en [ui-notes.md](ui-notes.md); no se implementan en este bloque. A revisa capturas mientras B conecta el cliente al servidor. C entrega users/sessions primero y después guardado; B coordina index.js para esa unión. No hace falta esperar a que A termine cada pantalla para comenzar sus funciones.

La vista de diseño está identificada como local y solo se incluye en desarrollo. Calcula puntos/resultados locales con el motor compartido; no acredita multijugador ni guardado. El renderizador se reutilizará con el mapa/snapshots de servidor. Ver [client-preview.md](client-preview.md).

## Aceptación

78 pruebas actuales, lint y build aprobados. Hay cobertura de mapas, daño, inputs Zod, tiempo/objetivos, escudos, encuadre y HTTP/WebSocket. Pendientes interpolación, PostgreSQL, telemetría/siembra y tres E2E de navegador, incluidos controles reales y observación desde otro cliente. La inspección de tamaños móviles no sustituye una prueba física de dos dedos.

Conservar las firmas de repositorios de contracts.md. Protocolo 4 amplía el mundo y añade layout/guías visuales/rutas al mapa. Mantiene spawnKind, shieldSpawnIntervalMs y la forma de MatchResult. No consultar DB por tick ni introducir persistencia alternativa.

## Git y propiedad

Ramas por tarea y PR a main, checks y revisión. A mantiene referencias; B client, shared y auth/rooms/net/game; C storage/telemetry/scripts/E2E/CI/despliegue. Coordinar index.js, app.js y dependencias. Una instalación y lockfile en la raíz.

No ampliar a otra arena, equipos, clases o habilidades. Priorizar el domingo la ronda online completa y el despliegue; reservar el lunes por la mañana para pruebas públicas, móviles y entrega. La extensión del plazo no amplía el alcance. Efectos y sonido se pulen después del recorrido login -> lobby -> ronda -> resultado -> persistencia.
