# Mapa — arena fija de referencia v4

A proporciona la dirección visual y B programa geometría, generador y renderizador. Una arena contiene cinco nodos y cuatro apariciones. Las [referencias](visual-references/README.md) orientan el diseño; prevalecen las reglas acordadas. Ver también la [práctica local](client-preview.md).

## Dimensiones vigentes

Mundo **1280 × 1120**, cuadrícula **160 × 140**, casillas de **8**. Origen arriba a la izquierda, x derecha e y abajo. El jugador conserva radio 10, velocidad 160 y los mismos atributos; cada nodo conserva radio 64. El área adicional permite reproducir las coberturas de A dejando pasos útiles. Las dimensiones anteriores de las láminas y del prototipo v3 son históricas.

| Nodo | Centro x,y |
| --- | --- |
| center / núcleo | 640,560 |
| north / sector A | 640,180 |
| east / sector B | 1060,560 |
| south / sector C | 640,940 |
| west / sector D | 220,560 |

Apariciones: NW 100,150; SE 1180,970; NE 1180,150; SW 100,970. Las primeras dos quedan en esquinas opuestas. Cada bahía tiene salida horizontal y vertical comprobadas con al menos 64 unidades de ancho libre. Al reaparecer, el servidor escoge un candidato libre alejado de rivales.

## Trazado y apariencia

La fuente ejecutable es `shared/src/maps/arena-template.js`: `cardinal-sketch` versión 4, generador versión 2 y protocolo 4. El servidor reexporta esa fuente. El trazado recupera bahías, hombros diagonales y escalones del perímetro, pilares, L, codos grandes, barras laterales y cuatro arcos separados alrededor del núcleo.

Se dibuja sobre un plano de autoría de 1024 × 896, escalado por 1,25 al mundo vigente. Los trazos de paredes generan las casillas sólidas y sus guías visuales. La cuadrícula resuelta es la autoridad física. `client/src/game/arena-art.js` compone placas de suelo, rejillas, bahías y paredes metálicas con luces cian/ámbar; caras y luces se recortan contra casillas sólidas. El exterior es vacío sólido, sin suelo invisible. Las imágenes de A no se cargan como fondo plano.

Las ranuras acotadas de una o dos casillas (hasta 16 unidades, menores que el cuerpo de 20) se cierran para no sugerir pasos impracticables. No se promete ancho 48 en cada hueco ornamental: se comprueban específicamente los corredores principales y la conectividad de todos los objetivos.

## Validación y variación

`generateMap(seed)` usa **layout: reference** por defecto en cliente y servidor. Distintas semillas conservan exactamente las paredes; la semilla sigue determinando el flujo de escudos. Rotar el nodo no cambia el terreno. La variación procedural final se pospone hasta terminar las pantallas, como acordó el equipo.

Permanece un prototipo explícito `generateMap(seed, { layout: 'procedural' })`, con cuatro grupos de pequeños remates de codos; no está habilitado en la práctica ni en las rondas normales. Prueba hasta 16 combinaciones; si ninguna vale, usa la primera variante validada y registra MAP_FALLBACK. Esto todavía no representa todas las variantes rojas/amarillas de la lámina.

Hay **19 rutas protegidas**, con radio de holgura 24 (ancho completo 48), por bahías, sectores norte/sur, codos, periferia y cruce este/oeste del núcleo. El validador rechaza paredes que invadan estos recorridos incluso si existe otra ruta. Las pruebas recorren sus segmentos con el movimiento real del jugador y comprueban las dos salidas de cada bahía con radio 32.

También se comprueban dimensiones, bordes, círculos de nodos libres, separación, dos accesos cardinales por nodo, apariciones, escudos y conectividad con radio 10. Los puntos sobre límites de casilla deben conectar mediante un segmento libre a un centro alcanzable. La muestra de 64 semillas procedurales conserva rutas, produce variación y no necesita fallback.

## Escudos

| Tipo | Ubicaciones x,y |
| --- | --- |
| Inicial, una vez | R1 280,230; R3 1000,230; R10 280,890; R12 1000,890 |
| Aleatorio | R2 640,370; R4 330,480; R5 950,480; R8 330,640; R9 950,640; R11 640,750 |

El servidor activa el primer aleatorio a los 15 s y espera 15 s tras recogerlo para activar otro. Los iniciales pendientes permanecen; solo un aleatorio está disponible a la vez. Ninguna recogida invade un nodo o pared. El escudo equipado absorbe un impacto y no vence por tiempo.

## Revisión y versiones

A revisa mapa completo, seguimiento 2× y capas de cuadrícula/colisiones/Pasos revisados. B aumenta templateVersion al cambiar geometría y generatorVersion al cambiar el algoritmo. El cliente online recibirá el mapa resuelto; C guarda semilla/versiones sin mantener otro generador. MatchResult conserva su forma.

Antes de cerrar el balance: jugar con dos y cuatro personas, revisar tiempos de viaje del mundo ampliado, ventajas de aparición, líneas de tiro y entrada simultánea en móvil real. La validación automática y la práctica individual no demuestran equilibrio multijugador. La siembra de telemetría produce resultados sintéticos, no partidas online.
