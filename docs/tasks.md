# Tareas y orden de integración — protocolo 5

Entrega lunes 26/10/2026 a las 16:00, Ciudad de México; objetivo de entrega 15:30.

| Bloque | Responsable | Estado |
| --- | --- | --- |
| Diseño original, mapa y personajes | A; B adapta | A1 integrado, geometría y 32 PNG originales conservados |
| HUD, efectos y pantallas | A; B conecta | A2/A3 integrados, datos reales de servidor |
| Cliente online, salas y simulación | B | Implementados, PC y móvil revisados por el usuario |
| Usuarios, sesiones, resultados y métricas SQL | C | PR #7 integrado con su helper y checks aprobados |
| Puente PostgreSQL | B | Arranque, autenticación, guardado y confirmación de persistencia integrados |
| Pruebas y CI | B/C | 118 pruebas y tres E2E reales; workflow incluye PostgreSQL y Chromium |
| Siembra y telemetría por HTTP | B/C | Rutas implementadas y probadas con PostgreSQL real; latencia pública pendiente |
| Procedural | B; A revisa | Arena base y tres variantes opt-in; falta cerrar el requisito de evaluación |
| Supabase y despliegue HTTPS | C coordina | Verificación remota y URL pública pendientes |
| Evidencia final y entrega | Equipo | Mediciones públicas, auditoría y dos URL pendientes |

## Orden inmediato

1. Cerrar la integración de la API de evaluación con sus checks completos; el PR #10 de A+B+C está fusionado.
2. Resolver el requisito procedural conservando el diseño de A y comprobar que todos reciben el mismo mapa.
3. Verificar Supabase, desplegar por HTTPS y probar dos usuarios desde redes diferentes.
4. Medir RTT/HTTP en la URL pública, actualizar evaluation.md y entregar URL y repositorio.

## Verificación

La suite integrada contiene 118 pruebas en 18 archivos. El archivo de almacenamiento incluye 20 casos, cuatro de ellos HTTP con datos reales. Los tres E2E cubren autenticación, lobby, entrada real por teclado y pads simultáneos, reconexión, abandono, fin natural y revancha. El usuario revisó además el flujo en PC y teléfono real por Wi-Fi local. Estas verificaciones no acreditan todavía latencia pública ni Supabase.

El protocolo 5 utiliza la arena 1448 × 1088, plantilla a-industrial v5 y generador v3. El servidor decide movimiento, colisiones, daño, puntos y recogidas. El cliente presenta snapshots y predicción; la base no se consulta por tick.

## Git y propiedad

Los commits originales de A y C se conservan mediante merges. B mantiene cliente/shared y servidor de juego; C mantiene storage/telemetry, pruebas globales y despliegue. Coordinar cambios en app.js, index.js, dependencias y CI.

Los documentos a1-integration.md y a23-integration.md describen los paquetes de adaptación originales; este archivo y README.md reflejan el estado actual. La práctica DEV /?practice=1 sigue disponible, con panel de diseño y sin guardado.

El alcance sigue siendo una arena, 2–4 jugadores todos contra todos y cinco nodos rotatorios. Los detalles visuales menores se revisan después de cerrar requisitos, despliegue y evidencia.
