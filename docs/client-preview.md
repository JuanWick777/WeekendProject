# Arena y práctica local

B programa cliente y servidor; A diseña/revisa; C mantiene PostgreSQL, telemetría, E2E, CI y despliegue. Las imágenes de [visual-references](visual-references/README.md) son referencias: prevalecen las reglas acordadas.

## Abrir y jugar

Con Node 24, ejecutar `npm ci` si faltan dependencias y `npm run dev`. Abrir http://127.0.0.1:5173. En desarrollo aparece **SIMULACIÓN LOCAL · SIN MULTIJUGADOR**. El build de producción excluye este módulo; el cliente online sigue pendiente. No se crean cuentas ni se guardan o envían resultados.

- WASD/flechas: mover. Ratón: apuntar. Clic mantenido: disparar.
- Seleccionar P1–P4 en el panel. Solo controlas uno a la vez; los otros quedan quietos, sin IA. Cambiar dron detiene la entrada anterior.
- Herramientas: mapa completo/cámara 2×, controles PC/táctiles, semilla uint32 de escudos, cuadrícula/colisiones/Pasos revisados, pausa y reiniciar ronda.
- **Ronda normal:** cuatro esquinas, reloj de 150 s, nodos cada 30 s, captura/disputa y resultado local al terminar.
- **Práctica de combate:** coloca P1 en R1 (280,230), P2 en (344,230), P3 en (936,890) y P4 en R12 (1000,890). P1/P4 recogen su escudo en el primer tick. Elegir P2 y disparar hacia P1 permite probar bloqueo, daño, muerte y respawn sin atravesar toda la arena. El mapa online conserva sus apariciones de esquina.
- Cambiar de ventana pausa la práctica. Pulsar Continuar al volver. Reiniciar aplica la semilla escrita y restablece ronda, escudos y estadísticas.

El HUD muestra vida, escudo, puntos, bajas/muertes, reaparición, tiempo y objetivo reales de la simulación local. En móvil aparecen dos pads; PC los oculta. Se mantiene `preview-player-state` para diagnóstico local, separado de las futuras coordenadas autoritativas online de `player-state`.

## Un solo motor de reglas

`shared/src/game/` contiene createMatch, combate, objetivos, escudos y resultados puros, sin red ni persistencia. `shared/src/maps/` contiene plantilla/generador/validación; física y PRNG también están compartidos. El servidor conserva sus rutas de importación mediante reexportaciones, para no romper a C. El servidor online mantiene la autoridad; el adaptador de práctica nunca sustituye auth, WebSocket o PostgreSQL.

La práctica alimenta inputs a 20 Hz y usa el tick de 30 Hz del mismo motor que ejecuta el servidor. Render, colores y efectos no calculan daño ni puntos. Hay efectos de recogida, bloqueo, impacto, muerte y respawn procedentes de eventos del motor. La cadencia de render no cambia el resultado del combate.

## Mapa y personajes

Mundo 1280 × 1120, 160 × 140 tiles de 8. Plantilla cardinal-sketch v4, generador v2, protocolo 4. Trazado fijo por defecto: perímetro con bahías/hombros diagonales, pilares, L y codos grandes, barras dobles laterales y cuatro arcos alrededor del núcleo. Cambiar semilla afecta los escudos, sin mover paredes. La variación procedural final se pospone hasta terminar las pantallas. Ver [maps.md](maps.md).

El arte estático se compone una vez en arena-art.js: placas metálicas, rejillas, remaches, bahías y luces cian/ámbar. Las caras de pared se recortan contra la geometría sólida. Pasos revisados muestra 19 recorridos de ancho 48; las dos salidas de cada bahía se prueban además con ancho 64. Los huecos de hasta 16 unidades se cierran para no dibujar pasos menores que el cuerpo.

Los cuatro drones se recrean en Canvas desde RedCG, YellowCG, PurpleCG y GreenCG: placas hexagonales y propulsores rojos; blindaje octagonal con franjas amarillas; anillos/pods violetas; marco romboidal y flechas verdes. Los sprites se dibujan una vez en caché y rotan hacia la mira. Las láminas JPEG con texto/fondo no se cargan como sprites. Se conservan originales sin edición.

Todos tienen 100 HP, velocidad 160, hitbox circular de radio 10 y la misma arma; sin clases ni habilidades. Cañón y adornos son visuales. El HUD y el indicador de colisión permiten comprobar el mismo radio en las cuatro apariencias.

## Escudos

R1/R3/R10/R12 aparecen una vez al inicio y permanecen hasta recogerse. A los 15 s aparece un escudo entre R2/R4/R5/R8/R9/R11. Tras recogerlo hay otra espera de 15 s; solo un aleatorio está disponible a la vez y no repite inmediatamente su ubicación. Los iniciales pendientes pueden coexistir con él.

Inventario máximo una carga. Inventario lleno no consume una recogida. El escudo absorbe una bala completa y después desaparece; no vence con el tiempo y se pierde al morir. Semilla del flujo de escudos independiente de la geometría. Las reglas y firmas de MatchResult/repositorios no cambian.

## Verificación y siguiente bloque

Node 24: lint, 78 pruebas y build aprobados. Incluye diseño fijo entre semillas, 64 semillas procedurales opt-in sin fallback, recorridos con la física real y detección de pasillos estrechos, daño, red HTTP/WebSocket, escudos y un ciclo local completo de bloqueo/daño/muerte/respawn; también igualdad del combate entre frames cortos y largos, cambio de dron, rotación y fin de ronda.

Inspección del mapa v4 en navegador: escritorio, 844 × 390 y 390 × 844; salida de bahía, recogida de R1, encuadre completo/2×, capa de rutas y movimiento/liberación de pad sin errores de consola. Se conserva la comprobación de combate de la etapa anterior: primer impacto bloqueado, siguiente impacto deja 72 HP y muerte/respawn. Esto no sustituye una prueba física simultánea con dos dedos ni los E2E con PostgreSQL.

Siguiente B: auth/lobby online, mapa/snapshots, interpolación/reconciliación, resultados/revancha y reconexión/guardado. C conecta repositorios. A revisa trazado/contraste y completa autenticación/estados de pantallas. Los cinco menús nuevos solo se analizaron: ver [ui-notes.md](ui-notes.md). El balance se confirma jugando entre dos y cuatro personas.
