# A — Diseño y revisión visual

A diseñó y programó el prototipo de Canvas/interfaz de PR #9. Ahora revisa y aplica A1 en feat/visual-integration; sus originales quedan conservados. Mantiene diseño y referencias en `docs/visual-references/`. B programa cliente, Canvas, controles, red y servidor; C mantiene datos, pruebas globales y despliegue. Ya existe una [vista interactiva de diseño](client-preview.md) para revisar el resultado.

## Entregas concretas

- Paleta de escenario y cuatro colores de personaje con contraste sobre el mapa.
- Siluetas de los cuatro drones y dirección del cañón; todos comparten atributos, hitbox y arma. Las diferencias son cosméticas.
- Diseño de menú, registro/login, salas/lobby, countdown y resultados/revancha.
- HUD común para PC/móvil: vida, escudo, puntos, tiempo, clasificación y nodo activo/próximo. Solo móvil muestra los controles táctiles.
- Referencias de recogida de escudo, disparo, impacto, muerte y respawn.
- Revisión del mapa adaptado: accesos, lectura de paredes, rutas periféricas y coberturas.

Puedes entregar imágenes y notas; B convierte esos diseños a código. Guarda referencias en maps, characters, ui y effects, señalando qué versión está vigente. Los cinco menús nuevos ya se analizaron, sin implementarlos todavía: ver [ui-notes.md](ui-notes.md). Completar autenticación y estados indicados allí.

## Reglas que debe reflejar el arte

FFA 2–4; 150 s; centro -> norte/A -> este/B -> sur/C -> oeste/D, 30 s cada uno y preaviso 5 s. Un único ocupante vivo puntúa; varios disputan. Todos los nodos tienen radio 64 y solo uno está activo.

Escudo equipado: una carga que absorbe un impacto y no vence por tiempo. Cuatro recogidas iniciales aparecen una vez; posteriormente hay un aleatorio a la vez con intervalo 15 s según [contrato](contracts.md). No representar habilidades ni atributos distintos por personaje.

Plano original 1448 × 1086 sin estirar. Mundo: 1448 × 1088, 181 × 136 casillas de 8, trazado fijo v5. El cliente dibuja las paredes reales del mapa recibido. Las imágenes con dimensiones anteriores son referencias históricas.

## Cómo revisar

Con B, abrir npm run dev y revisar el mapa completo y el seguimiento del dron. Usar cuadrícula y Colisiones; las rutas antiguas de Pasos revisados no corresponden al plano original. Estas capas sirven para señalar diferencias entre pared dibujada y espacio transitable. Comprobar el HUD a tamaño móvil, contraste de balas y personajes, nodo activo e inactivos y orientación del arma.

Los cuatro drones usan los 32 PNG originales de A, ocho orientaciones y atributos idénticos. Apuntado/disparo conservan dirección continua. La práctica de combate permite revisar recogida/bloqueo/daño/respawn. La vista actual es local y está identificada; el recorrido online, interpolación y controles definitivos los implementa B. A aporta observaciones y prueba el diseño con B/C cuando se conecte la partida real.
