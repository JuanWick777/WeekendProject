# CyberGrid | Aporte visual y prototipo completo de control de nodos

Este directorio contiene el mapa final, sprites originales, diseños de interfaz, el editor de mapa y un **prototipo local jugable**. El prototipo **no está conectado al backend multijugador** y utiliza tres bots para las pruebas.

## Archivos

- `mapas/cybergrid_mapas.json`: mapa final del equipo de diseño, con variantes `base`, `v2`, `v3`, cinco nodos, cuatro spawns y puntos de escudo.
- `index.html`: demo autosuficiente. Abrir con doble clic en Chrome o Edge.
- `assets/drones/{rojo,amarillo,morado,verde}/`: ocho orientaciones por cada uno de los cuatro personajes.
- `referencias_ui/`: capturas y bocetos visuales de las pantallas. Son imágenes, no código.
- `herramientas/editor_mapa_manual.html`: editor de mapas anterior. Importar el JSON final antes de editar.

## Reglas implementadas en la demo local

- Modalidad única **control de nodos rotatorios**, cuatro participantes, todos contra todos. Tres bots luchan entre sí y contra el jugador, y persiguen objetivos.
- Partida de **150 segundos**. Un nodo activo entre N1–N5, rotación cada **30 segundos**, con **aviso del próximo nodo a falta de 5 segundos**.
- **+1 punto/segundo** cuando exactamente un dron vivo controla el nodo; con dos o más, el nodo queda disputado y nadie obtiene puntos. Eliminar rivales no suma puntos de control.
- HUD de tiempo, estado, nodo, rotación, clasificación, vida y escudos. Pantalla de resultados, nueva partida con rotación `base→v2→v3→base`, lobby simulado local.
- WASD para mover, clic/mantener clic para disparar, disparos del color del dron; bots FFA y disparos que colisionan con las paredes.
- 100 de vida, 20 de daño por bala, 50 de escudo, respawn de 3s (valores sujetos a balance). El escudo absorbe daño antes de la vida.
- Escudos visuales: cápsulas metálicas con luces cian y glifo de escudo, burbuja de radio 30 (antes 33); solamente al recoger escudo.
- Colisión de paredes `wallHalf = 4` como se aprobó. El personaje se asigna **aleatoriamente al inicio de la partida y no cambia al reaparecer**.

## Uso de prueba

Abre `http://127.0.0.1:5173/prototypes/a-canvas/index.html` después de ejecutar `npm.cmd run dev` desde la raíz del repositorio. También puedes abrir `index.html` directamente para probar la demo local. El botón **Ver resultados (prueba)** enseña la pantalla final inmediatamente para revisar el diseño. **Nueva partida** cambia al siguiente mapa. El selector de mapa y la selección de spawn son herramientas de desarrollo que reinician la prueba; no corresponden al flujo definitivo.

## Integración pendiente

El HTML se ejecuta solo en el navegador, sin red ni servidor, y el lobby es una demostración visual. Antes de lanzarlo como juego en línea, el equipo backend debe integrar salas y WebSockets y validar del lado del servidor posiciones, colisiones, daños, escudos, rotación y puntuaciones. **No reemplazar `index.html` ni otras rutas del juego en desarrollo con este prototipo entero.**

**Mapa final:** copia íntegra del archivo `cybergrid_mapas (1)(1).json` aprobado el 25 de octubre de 2026. Los datos JSON embebidos en el HTML son idénticos.

## Ubicación dentro del repositorio

Colocar todo este directorio dentro de `WeekendProject/client/prototypes/a-canvas/`. No reemplazar `WeekendProject/client/index.html`. Este contenido es una prueba local, no la integración final del servidor.
