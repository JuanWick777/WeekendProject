# Mapa — adaptación industrial y variantes

A proporciona la dirección visual y B programa geometría, generador y renderizador. Una sola arena contiene cinco nodos y cuatro apariciones. Las referencias están en [visual-references](visual-references/README.md); la implementación visual se explica en [client-preview.md](client-preview.md).

## Dimensiones vigentes

Mundo **768 × 640**, cuadrícula **48 × 40**, casillas de **16**. Origen arriba a la izquierda, x derecha e y abajo. El radio del jugador sigue siendo 10 y el de cada nodo 64. Las láminas de 768 × 512/24 × 16 son históricas.

| Nodo | Centro x,y |
| --- | --- |
| center / núcleo | 384,320 |
| north / sector A | 384,128 |
| east / sector B | 640,320 |
| south / sector C | 384,512 |
| west / sector D | 128,320 |

Apariciones: NW 64,64; SE 704,576; NE 704,64; SW 64,576. Las primeras dos quedan en esquinas opuestas. Cada bahía tiene salida horizontal y vertical de 64 unidades. Al reaparecer, el servidor escoge un candidato libre alejado de rivales.

## Geometría y generación

La fuente ejecutable es `shared/src/maps/arena-template.js` (el servidor reexporta la misma fuente): `cardinal-sketch` versión 3, generador versión 1. Adapta el boceto a paredes rectangulares y coberturas escalonadas. A/B todavía deben probar equilibrio y ajustar el trazado con jugadores.

Hay 372 tiles fijos, incluido el borde: bahías con dos salidas, hombros de perímetro, pilares, L y codos grandes, barras dobles laterales y cuatro tramos escalonados alrededor del núcleo. Doce grupos modifican codos/pilares pequeños y cuatro coberturas opcionales junto a las bahías. Incluso la combinación más abierta conserva 388 tiles sólidos; la más cerrada 400 (397 en semilla 42). Los colores verde/rojo/amarillo del plano identifican categorías de diseño. La presentación del juego usa metal oscuro y luces cian/ámbar.

El PRNG mantiene geometría reproducible por semilla uint32. Se prueban hasta 16 combinaciones; si ninguna es válida, se usa la primera variante de cada grupo como fallback validado y se registra MAP_FALLBACK. La muestra automatizada de 64 semillas produce variación sin fallback. También se validan las combinaciones más abierta/cerrada y la unión de todas las variantes.

Las rutas protegidas conectan sectores centrales y periféricos. El validador comprueba cuadrícula, bordes, círculos libres, separación, al menos dos accesos cardinales por nodo, apariciones, escudos y conectividad con espacio para el jugador. Para puntos sobre límites de tile, se comprueba acceso desde un centro cercano alcanzable mediante un segmento libre con radio 10, evitando falsos bloqueos por el muestreo de la cuadrícula. Las paredes permanecen iguales durante los 150 s; cambiar el nodo no genera otro terreno.

## Escudos

Cuatro candidatos `spawnKind: initial`: R1 160,112; R3 608,112; R10 160,528; R12 608,528. Están disponibles al inicio y se consumen una vez.

Seis candidatos `spawnKind: random`: R2 384,208; R4 224,240; R5 544,240; R8 224,400; R9 544,400; R11 384,432. El servidor activa uno a los 15 s y espera 15 s tras recogerlo para activar otro. Los iniciales pendientes permanecen; solo un aleatorio está disponible a la vez. Ninguna recogida invade un nodo o pared.

## Revisión y versiones

A revisa la vista local y propone ajustes; B modifica la plantilla y aumenta templateVersion al cambiar geometría. Un cambio del algoritmo aumenta generatorVersion. Clientes online reciben el mapa resuelto y C guarda semilla/versiones, sin mantener otro generador.

Antes de cerrar el mapa: comprobar dos y cuatro personas, accesos sin atascos, rutas periféricas, ventajas de aparición y lectura móvil. La conectividad automática no demuestra balance. La siembra de telemetría crea resultados sintéticos, no ejecuta mil mapas o partidas online.
