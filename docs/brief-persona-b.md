# B — Cliente, servidor e integración

B coordina el trabajo de A y C y mantiene client/shared, auth/rooms/net/game y el puente de arranque. Los commits y diseños originales de los compañeros se conservan.

## Implementado

- Cliente A1/A2/A3: mapa y PNG originales, HUD, efectos, menú, registro/login, salas, lobby, ayuda y resultados.
- Motor autoritativo: movimiento, colisiones, proyectiles, escudos de una bala, nodos, puntuación, muerte y respawn.
- Red: entradas a 20 Hz, snapshots a 15 Hz, interpolación, predicción y reconciliación local, recuperación de ronda y secuencias.
- Puente con PostgreSQL: repositorios reales de C para usuarios, sesiones y guardado; esquema comprobado antes de escuchar.
- Confirmación de guardado pending/saved/failed/unavailable y recuperación del estado al reconectar.
- API pública de evaluación con validación, límites y funciones PostgreSQL de C.
- CI con PostgreSQL, 121 pruebas, build y tres E2E con Chromium. PC y teléfono revisados por el usuario.

La arena permanece en 1448 × 1088, plantilla a-industrial v5, generador v4 y protocolo 5. Las rondas combinan cinco módulos originales de A por semilla y conservan las 75 paredes fijas, con validación de rutas y fallback; la referencia original sigue en práctica DEV.

## Siguiente trabajo

1. Cerrar la integración de los endpoints de evaluación, ya implementados sobre processSeedBatch y getTelemetry de C; medir su rendimiento público tras desplegar.
2. Revisar balance y aspecto de distintas semillas con el equipo.
3. Coordinar Supabase, arranque de producción y despliegue HTTPS con C.
4. Comprobar persistencia tras reinicio y medir RTT/HTTP en la URL pública.
5. Actualizar evidencia y auditoría final con limitaciones verificadas.

Las pruebas locales y los E2E no sustituyen la verificación de Supabase ni de la red pública. El guardado fallido se comunica, pero todavía no tiene reintento automático.

## Referencias

[Puente PostgreSQL](postgres-bridge.md), [contrato](contracts.md), [E2E](../tests/e2e/README.md), [tareas actuales](tasks.md) y [evaluación](evaluation.md). Los archivos de los paquetes A1/A2/A3 conservan instrucciones históricas; README.md y tasks.md describen la aplicación integrada.
