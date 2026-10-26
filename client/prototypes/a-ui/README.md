# CyberGrid · Prototipo de interfaces finales (A)

## Qué contiene

Esta carpeta contiene un **prototipo navegable** construido sobre las **cinco imágenes finales aprobadas** por diseño:

- `assets/ui/menu.png`: menú principal.
- `assets/ui/salas.png`: crear o unirse a una sala.
- `assets/ui/lobby.png`: lobby y estado Listo.
- `assets/ui/como-jugar.png`: reglas y controles.
- `assets/ui/resultados.png`: clasificación de cierre de partida.
- `index.html`, `styles.css`, `app.js`: zonas clicables, navegación y comportamientos de demostración.

Se entrega **separado de la aplicación oficial**, dentro de `client/prototypes/a-ui/`. **No** reemplazar `client/index.html`.

## Cómo probarlo en WeekendProject

1. Copiar el contenido respetando la ruta `client/prototypes/a-ui/`.
2. Desde la raíz del repositorio ejecutar `npm.cmd run dev` en Windows.
3. Abrir `http://127.0.0.1:5173/prototypes/a-ui/index.html`.
4. Navegar con los botones de las propias imágenes o con las pestañas del encabezado.
5. Presionar `H` o **Ver zonas clicables** para comprobar dónde están las áreas interactivas.
6. El botón **Abrir partida** lleva al prototipo jugable de `../a-canvas/index.html` (si está instalado).

También abre `index.html` directamente con doble clic, sin instalar dependencias. Para copiar al portapapeles conviene abrirlo con Vite/localhost.

## Flujo de interfaz de demostración

- **Menú:** Jugar → Salas; Cómo jugar → Instrucciones; Salir → aviso.
- **Salas:** Crear sala → Lobby simulado; Unirse → introducir el código de ejemplo `K7P4`; Volver al menú.
- **Lobby:** copiar código de ejemplo; alternar Listo/No listo; salir de sala.
- **Resultados:** Nueva partida → Lobby; Volver al lobby → Lobby.
- **Pestañas superiores:** acceso directo a las cinco pantallas para revisión visual.

## Límites e integración pendiente para Codex

- ⚠️ **No hay multijugador real**: el código `K7P4`, las personas en la sala, el estado de Listo y los resultados son **valores visuales simulados**, no creados ni validados por el servidor.
- Las cinco pantallas usan imágenes fijas como referencia exacta y **zonas HTML superpuestas**. Por eso los nombres, puntuaciones y estados pintados dentro de las imágenes no son datos dinámicos. Para la entrega final, reconstruir contenido y controles como componentes HTML/CSS accesibles.
- El prototipo adapta la imagen al tamaño de pantalla, pero **las maquetas son horizontales y todavía requieren una versión móvil real**, con texto legible y controles táctiles propios.
- Conectar a autenticación, creación/unión de salas, WebSocket de lobby, mensajes Listo, comienzo de partida, resultados y reintentos. No alterar el servidor a partir de datos ficticios.
- Coordinar con el equipo qué parte se integrará en una rama `feat/ui-screens` **una vez que revisen/acepten `feat/canvas-art`**, para evitar duplicación/conflictos de Git. Alternativamente, mantener todo aislado en `client/prototypes/a-ui/` hasta esa revisión.
- Los diseños de pantallas incluyen texto e iconos que se deben contrastar con los estados reales del backend. Por ejemplo, en la referencia de lobby hay un código `K7P4` y 3/4 participantes precargados; en resultados hay puntuaciones fijas.

## Archivos de diseño

Las cinco imágenes originales se incorporaron tal como fueron proporcionadas, sin alteraciones.
