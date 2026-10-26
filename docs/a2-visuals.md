# A2 — HUD y efectos del juego

Aplicar después de A1. Se reutilizan la geometría, el suelo, las luces y los PNG originales sin modificar sus archivos. Los drones tienen los mismos atributos y la misma colisión; su aspecto no otorga habilidades.

El HUD muestra reloj, nodo activo/siguiente, puntuaciones, vida, escudo, bajas, muertes, estado de conexión y RTT recibidos del juego online. Las barras no calculan daño ni puntos. La lista muestra únicamente participantes reales, con sus nombres escapados.

El render añade fogonazo, estela del disparo, impacto, bloqueo de escudo, muerte y reaparición. Los escudos del escenario utilizan la cápsula visual de A y las posiciones canónicas. El evento solo dibuja el efecto: el servidor decide recogida, daño y muerte. Un escudo bloquea un impacto y no caduca.

PC conserva WASD/flechas, ratón y clic mantenido. Móvil dispone de dos pads simultáneos; la cámara sigue al jugador con aumento 2× y conserva la proporción del mapa. El menú detiene el envío de acciones del jugador mientras el servidor continúa la ronda.

La predicción local utiliza el movimiento compartido y las entradas pendientes; el último snapshot autoritativo reconcilia posición y secuencia. Los demás jugadores se interpolan con 100 ms de margen. No se interpola una muerte, reaparición ni salto de posición.

Este bloque prepara módulos que A3 conecta a la aplicación. A2 por separado puede compilar sin mostrar aún el HUD online.
