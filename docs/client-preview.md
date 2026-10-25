# Arena industrial — primera implementación visual

B programa ahora cliente y servidor; A entrega diseño y revisa las capturas. C mantiene PostgreSQL, telemetría, E2E, CI y despliegue. Las imágenes de [visual-references](visual-references/README.md) son referencias: las reglas acordadas prevalecen sobre sus anotaciones.

## Abrir y revisar

Con Node 24, ejecutar `npm ci` si faltan dependencias y `npm run dev`. Abrir http://127.0.0.1:5173. En desarrollo aparece una **vista de diseño local**, rotulada de manera permanente. El build de producción no incluye el módulo interactivo de esta vista: el cliente online sigue pendiente.

- WASD/flechas: mover el dron seleccionado. Ratón: apuntar. Clic mantenido: proyectiles visuales.
- Seleccionar otro dron desde el panel izquierdo. Los cuatro comparten atributos e hitbox.
- En móvil se muestran los dos controles; en PC se ocultan. Las herramientas permiten forzar cualquiera de los modos para inspección.
- Encuadre completo o cámara que sigue al dron a 2×, útil para revisar legibilidad móvil.
- Herramientas de diseño: cuadrícula, colisiones, nodo activo y restablecer posiciones.

Los tiempos, vida y puntos son los de un fixture, no resultados online. El nodo se elige manualmente para revisar sus estados visuales. Los disparos de esta escena terminan en paredes/alcance pero no dañan jugadores. No se guardan cuentas ni resultados, y no existe autenticación ficticia. Las coordenadas locales usan `preview-player-state`, separado del futuro `player-state` autoritativo de los E2E.

## Dimensiones y apariencia

Mundo 768 × 640, cuadrícula 48 × 40 de 16 unidades. Plantilla `cardinal-sketch` v2 y generador v1. Cinco círculos de radio 64; jugador radio 10, velocidad 160 y demás reglas de combate conservadas.

Se implementan suelo metálico, paredes con biseles/luces, nodos activos/inactivos, pedestales de escudo y cuatro siluetas de dron. Fondo y paredes se dibujan en una capa reutilizada; las entidades se dibujan encima. Paleta del escenario tomada de ColorsCG.jpeg. Personajes rojo, amarillo, violeta y verde según CharactersCG.jpeg; todos cosméticos, sin habilidades.

La geometría es una adaptación a tiles del diseño, pendiente de prueba de balance con personas. Las curvas/diagonales del dibujo se simplificaron a coberturas escalonadas. B mantiene una única física compartida: el servidor la usa para autoridad y la vista local para revisar movimiento/colisiones.

## Escudos del servidor — protocolo 3

Cuatro recogidas iniciales, R1/R3/R10/R12, disponibles al inicio y sin reaparición. A los 15 s aparece un escudo en una de las seis posiciones aleatorias R2/R4/R5/R8/R9/R11. Tras recogerlo, comienza otra espera de 15 s. Solo hay un aleatorio disponible a la vez y no se repite inmediatamente su ubicación. Las recogidas iniciales pendientes permanecen disponibles.

Una carga equipada absorbe el siguiente impacto, sin vencimiento. Inventario lleno no consume una recogida. La selección aleatoria se hace en servidor con un flujo reproducible por semilla, independiente del generador de terreno. Snapshot muestra solo recogidas disponibles; el mapa declara `spawnKind: initial | random` en sus candidatos.

El protocolo pasa a 3; la configuración pública sustituye `pickupRespawnMs` por `shieldSpawnIntervalMs: 15000`. MatchResult y las interfaces de persistencia conservan sus firmas; C guarda las versiones de mapa recibidas y evita fijar dimensiones en SQL.

## Verificación y siguiente bloque

Lint, 72 pruebas y build aprobados con Node 24. La cobertura incluye movimiento/colisiones, 64 semillas válidas, escudos iniciales/aleatorios, fórmulas de daño, reloj/nodos, HTTP/WebSocket y conversión de coordenadas/encuadre. La inspección de navegador cubrió 1280 × 800, 844 × 390 y 390 × 844; se verificaron teclado, joystick, liberación, cámara, cambio de nodo y capa de colisiones. Esto no sustituye una prueba física con dos dedos ni los E2E finales con PostgreSQL.

Siguiente trabajo de B: conectar login/lobby y snapshots al renderizador, interpolación/reconciliación, resultados/revancha y manejo de reconexión/guardado. A revisa geometría, colores y HUD; C conecta repositorios. Menús y pantallas pendientes de diseño pueden empezar funcionales y recibir el acabado de A después.
