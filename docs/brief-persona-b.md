# B — Cliente, servidor e integración

B coordina el trabajo de A y C y mantiene client/shared, auth/rooms/net/game y el puente de arranque. Los commits y diseños originales de los compañeros se conservan.

## Implementado

- Cliente A1/A2/A3: mapa y PNG originales, HUD, efectos, menú, registro/login, salas, lobby, ayuda y resultados.
- Motor autoritativo: movimiento, colisiones, proyectiles, escudos de una bala, nodos, puntuación, muerte y respawn.
- Red: entradas a 20 Hz, snapshots a 15 Hz, interpolación, predicción y reconciliación local, recuperación de ronda y secuencias.
- Puente con PostgreSQL: repositorios reales de C para usuarios, sesiones y guardado; esquema comprobado antes de escuchar.
- Confirmación de guardado pending/saved/failed/unavailable y recuperación del estado al reconectar.
- CI con PostgreSQL, 107 pruebas, build y tres E2E con Chromium. PC y teléfono revisados por el usuario.

La arena permanece en 1448 × 1088, plantilla a-industrial v5, generador v3 y protocolo 5. El terreno base está fijo; las tres variantes opt-in no cierran por sí solas el requisito procedural.

## Siguiente trabajo

1. Montar los endpoints HTTP de evaluación sobre processSeedBatch y getTelemetry de C, con validación, límites y pruebas de respuestas reales.
2. Cerrar procedural manteniendo recorridos transitables y aspecto de A.
3. Coordinar Supabase, arranque de producción y despliegue HTTPS con C.
4. Comprobar persistencia tras reinicio y medir RTT/HTTP en la URL pública.
5. Actualizar evidencia y auditoría final con limitaciones verificadas.

Las pruebas locales y los E2E no sustituyen la verificación de Supabase ni de la red pública. El guardado fallido se comunica, pero todavía no tiene reintento automático.

## Referencias

[Puente PostgreSQL](postgres-bridge.md), [contrato](contracts.md), [E2E](../tests/e2e/README.md), [tareas actuales](tasks.md) y [evaluación](evaluation.md). Los archivos de los paquetes A1/A2/A3 conservan instrucciones históricas; README.md y tasks.md describen la aplicación integrada.
