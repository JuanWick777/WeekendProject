# CyberGrid — Diseño acordado v4

Este documento sustituye la modalidad de extracción del diseño v1. B3 ya implementa estas reglas en la simulación de servidor; falta conectar el cliente jugable y PostgreSQL. El nombre CyberGrid: Breach & Sync se conserva; el modo se identifica como `rotating_control`. Ver [estado e integración B3](game-server.md).

## Objetivo y puntuación

Arena cenital para **2 a 4 jugadores, todos contra todos**, con disparos de energía. Cada ronda dura **150 segundos**. Hay cinco nodos en una misma arena y solo uno está activo a la vez.

| Tiempo desde el inicio | Nodo activo |
| --- | --- |
| 0–30 s | `center`: centro |
| 30–60 s | `north`: norte / sector A |
| 60–90 s | `east`: este / sector B |
| 90–120 s | `south`: sur / sector C |
| 120–150 s | `west`: oeste / sector D |

Durante los últimos **5 segundos** de cada intervalo se señala el siguiente nodo. En el último intervalo no hay siguiente nodo. Las posiciones y el orden permanecen fijos; se activa otra zona, sin regenerar el terreno. El reloj sigue avanzando con la zona vacía o disputada. No hay prórroga.

- Una sola persona viva dentro del nodo activo acumula tiempo de control.
- Dos o más personas vivas dentro lo disputan: nadie acumula tiempo.
- Sin ocupantes vivos, el nodo está vacío. Los otros cuatro nodos no puntúan.
- Para ocuparlo, el centro del jugador debe estar a distancia menor o igual a su radio. Radio inicial del nodo: **64 unidades**.
- Se puede mover y disparar mientras se controla. No existe canalización ni obligación de quedarse quieto.
- Cada segundo completo acumulado da un punto: `score = Math.floor(controlTimeMs / 1000)`. Se conservan las fracciones al salir, morir, disputar o cambiar de nodo: 600 ms + 400 ms = 1 punto.
- Morir conserva tiempo y puntos; reaparecer tarda **3 segundos**.

Gana quien tenga más puntos; desempate por más bajas y después menos muertes. Si persiste la igualdad, empate entre quienes compartan el mejor resultado. El tiempo fraccionario no es otro desempate. Quien abandona definitivamente no puede ganar; si solo queda un participante, gana por abandono. Una partida sin participantes queda abortada, sin ganador.

Ejemplo: controlas el centro durante 2,6 segundos. Entra un rival y la puntuación se detiene. Al salir él, acumulas otros 0,4 segundos: tienes 3 puntos. Cuando el objetivo cambia, hay que desplazarse al siguiente nodo.

## Combate e inventario

El arma es un bláster de **proyectiles de energía dirigidos**:

- Vida: 100; movimiento: 160 unidades/s; radio del jugador: 10.
- Intervalo de disparo: 350 ms; velocidad del proyectil: 480 unidades/s.
- Alcance: 320 unidades; radio del proyectil: 3.
- Daño: `Math.round(30 - 10 * distanciaRecorrida / 320)` dentro de [0, 320]. Fuera de alcance no impacta.
- El proyectil termina en la primera pared o rival alcanzado. No daña al dueño, no rebota ni atraviesa.
- La simulación comprueba el segmento recorrido para evitar atravesar paredes o jugadores entre ticks.
- Una muerte suma una baja al atacante y una muerte a la víctima. Los proyectiles ya disparados siguen su recorrido.

El inventario contiene **como máximo una carga de escudo**. Se recoge automáticamente al tocar una recogida disponible. Absorbe por completo el siguiente impacto de un proyectil enemigo y se consume junto con ese proyectil. No requiere otro botón, no da invulnerabilidad temporal y no se acumula si ya se lleva una carga. Al morir se pierde; se reaparece con 100 de vida y sin escudo. No se deja botín.

Hay cuatro recogidas iniciales que aparecen una vez (R1/R3/R10/R12). A los **15 segundos** aparece una recogida aleatoria en R2/R4/R5/R8/R9/R11; tras recogerla se esperan otros **15 segundos** para generar la siguiente. Solo hay un aleatorio disponible a la vez; los iniciales pendientes permanecen. B valida posiciones fuera de nodos y resuelve recogidas simultáneas de forma determinista. El servidor decide impactos, vida, inventario, recogidas y puntos.

## Arena y controles

**Una arena base**, de 160 columnas × 140 filas y casillas de 8 unidades: mundo de 1280 × 1120. A proporciona el diseño; B programa cliente y trazado fijo v4, con holgura para las coberturas. Las variaciones de obstáculos se posponen hasta terminar las pantallas; el prototipo procedural solo se activa explícitamente en código. La guía completa y el entregable de A están en [maps.md](maps.md).

Todos reciben el mismo mapa validado por el servidor. Se conserva durante toda la ronda. Jugadores colisionan con paredes/límites y no se bloquean entre sí. Las diagonales se normalizan.

PC: WASD/flechas, ratón y clic izquierdo mantenido. Móvil: joystick izquierdo y control derecho para apuntar y disparar, utilizables simultáneamente. El cliente presenta y envía intención; no decide posiciones válidas ni resultados.

## Ciclo de sala y reconexión

`lobby -> countdown (3 s) -> playing -> finished -> lobby` al pedir revancha.

Solo el anfitrión inicia, con 2–4 personas, todas listas y conectadas. Si sale del lobby, se transfiere el anfitrión. No se admiten participantes nuevos durante la ronda. Si durante countdown dejan de cumplirse las condiciones, se vuelve a lobby. La revancha crea otro matchId y semilla, limpia Listo y estadísticas. El trazado de referencia permanece fijo; la nueva semilla modifica el flujo de escudos.

Los inputs caducan a los 250 ms. El mismo usuario puede reconectar durante 15 segundos sin duplicar jugador. Mientras tanto permanece detenido y vulnerable; si está vivo sigue contando como ocupante de la zona. Al vencer el plazo se registra abandono, se retira del mundo y deja de ocuparla. La salida voluntaria durante playing equivale a abandono inmediato. Si solo queda un participante, se resuelve el fin por abandono; si no queda ninguno, se aborta. Estas decisiones se realizan una sola vez en el servidor.

## Presentación y alcance

Pantallas: autenticación, salas/lobby, cuenta regresiva, partida y resultados/revancha. HUD: vida, escudo 0/1, puntos, tiempo de ronda, clasificación, nodo activo, tiempo hasta rotación y estado vacío/controlado/disputado; preaviso del siguiente nodo. Mostrar respawn y reconexión. Diagnósticos plegables: conexión, RTT, FPS y coordenadas autoritativas.

El acabado de circuitos y energía debe permitir distinguir paredes, jugadores, balas, escudos y zonas. No depender únicamente del color. Una zona disputada debe entenderse sin abrir instrucciones.

No se implementarán transporte de fragmentos, entrega central, `carry`, `syncProgress` ni botín al morir. Quedan fuera del alcance inicial campaña, equipos, banderas, clases, tienda, múltiples armas, chat, bots y múltiples instancias del servidor. El objetivo es completar y pulir una ronda online, con persistencia y evaluación verificable.
