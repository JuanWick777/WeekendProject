# Mapa de A — integración v5

La arena usa el trabajo de A de PR #9. La fuente original permanece en `client/prototypes/a-canvas/`. No se rediseñan sus segmentos, posiciones, suelo, luces ni plataformas.

## Coordenadas y física

Plano de autoría **1448 × 1086**, sin estirar. Mundo **1448 × 1088**, cuadrícula **181 × 136** de 8; las dos unidades inferiores solo completan la cuadrícula. Jugador: radio 10, velocidad 160. Nodos: radio funcional 64, aunque el marcador decorativo de A sea menor.

| Función | ID de A | Centro aproximado x,y |
| --- | --- | --- |
| center | N3 | 719.454, 536.815 |
| north / A | N1 | 730.158, 167.040 |
| east / B | N4 | 1138.850, 534.869 |
| south / C | N5 | 729.185, 891.020 |
| west / D | N2 | 295.192, 542.653 |

Apariciones conservadas exactamente. Orden de plazas: S1, S4, S2, S3, para que dos participantes comiencen en esquinas opuestas. El orden interno de nodos sigue centro → norte → este → sur → oeste, 30 s cada uno; no lo decide el dibujo.

La autoridad física para este mapa es `collisionModel: 'segments-v1'`: rectángulos orientados sobre los segmentos originales, metal de 22 unidades y extensión de 4 en sus extremos; borde de suelo de 18. Las sombras no bloquean. Las balas usan colisión continua con esos mismos rectángulos, y los cuerpos conservan el círculo de radio 10. El índice espacial solo acelera consultas; no aproxima los contornos.

`tiles` es una capa gruesa de ocupación para herramientas; no sustituye a las paredes vectoriales. Las arenas de calibración de pruebas usan explícitamente `collisionModel: 'tiles'`. La capa Colisiones dibuja los colliders reales. No se conserva la promesa anterior de todos los corredores de ancho 48/64: se comprueban rutas transitables con la hitbox real, sin mover el diseño de A. `protectedRoutes` queda vacío en esta plantilla; el control de Pasos revisados se oculta hasta contar con guías revisadas.

## Fuentes y mantenimiento

- `shared/src/maps/a-design.json`: nodos, spawns, escudos, contorno y tres variantes de A, sin estado del editor.
- `shared/src/maps/arena-template.js`: adapta nombres y reglas a los contratos del juego.
- `client/src/game/arena-art.js`: funciones originales de dibujo importadas sin cambios.
- `client/src/game/drone-sprites.js`: carga los 32 PNG originales de A, ocho orientaciones por apariencia. La dirección del disparo continúa siendo libre.
- `node scripts/import-a-design.js`: vuelve a importar JSON y dibujo después de un cambio intencional en el prototipo. Revisar diff y versiones antes de publicar.

Plantilla `a-industrial` v5, generador v4 y protocolo 5. Cliente y servidor usan el mismo paquete shared. No cambia la forma de MatchResult ni las firmas de C; se guardan los metadatos que devuelve generateMap, sin hardcodear versiones.

## Terreno y variantes

`generateMap(seed)` genera por defecto una combinación procedural de cobertura antes de comenzar la ronda. Conserva exactamente las **75 paredes fijas**, el suelo, contorno, nodos, apariciones y posiciones de escudos de A. El cliente dibuja los mismos segmentos resueltos que utiliza la física; no calcula otro mapa por su cuenta.

`coverage.js` divide las paredes variables en cinco grupos: exterior e interior norte, franja media y exterior e interior sur. Cada grupo elige de forma independiente una disposición dibujada por A en base/v2/v3; las opciones idénticas se deduplican. Los dos flancos comparten elección dentro de cada grupo. Así se combinan módulos, en lugar de seleccionar uno de tres mapas completos. No se inventan coordenadas, giros ni formas fuera de los originales.

Después se puede retirar como máximo uno de cinco grupos de paredes removibles: cuatro pilares exteriores, barras superiores o inferiores de los flancos con sus remates, dos barras centrales o dos barras ante los nodos norte/sur. También puede conservarse toda la cobertura removible. Las paredes modificables alternan únicamente entre disposiciones originales; no desaparecen por una eliminación aleatoria independiente.

Se reconstruye `tiles` desde la geometría final y se valida el mapa completo. Hay hasta 16 intentos deterministas; si todos fallan se devuelve la arena base validada y se registra MAP_FALLBACK. `generation` informa módulos elegidos, grupo retirado, intentos y fallback. La semilla uint32 y la versión del generador reproducen el resultado. El resultado SQL ya guarda semilla/versión; no requiere migración nueva.

`generateMap(seed, { layout: 'reference' })` conserva los 154 segmentos originales. La práctica DEV `/?practice=1` abre esa referencia y permite elegir **Mapa → Variaciones por semilla** y reiniciar con otra semilla. Las partidas online usan procedural; rotar nodos y recoger escudos nunca vuelve a generar paredes.

El lote local de 64 semillas consecutivas produjo 61 distribuciones distintas, entre 143 y 154 segmentos, todas válidas y sin fallback. Es una muestra, no una garantía de balance competitivo. Evidencia: [procedural-maps-local.json](evidence/procedural-maps-local.json). Prueba reproducible con Node 24: `npm test -- server/test/maps.test.js`.

Se verifican dimensiones, bordes, geometría finita, nodos libres y dos accesos, apariciones, distribución de escudos y conectividad. La búsqueda comprueba los tramos completos entre casillas; las pruebas caminan hasta cada objetivo con movePlayer. También se cubren diagonales, esquinas, balas rápidas e invalidación de caché al editar una prueba.

## Escudos y balance

Iniciales, una vez: R1 (360,180), R3 (1100,180), R10 (360,860), R12 (1100,860).
Aleatorios: R2 (460,380), R4 (720,320), R5 (1000,380), R8 (440,660), R9 (1020,660), R11 (720,720).

Primer aleatorio a los 15 s; siguiente 15 s después de recogerlo; solo un aleatorio en el suelo y sin repetir ubicación inmediatamente. Los iniciales pendientes permanecen. Una carga bloquea un impacto y no vence con el tiempo.

Antes de cerrar balance, jugar entre dos y cuatro personas y comprobar viajes, líneas de tiro y controles simultáneos en un móvil real. Las pruebas automáticas no prueban diversión ni igualdad de ventajas.
