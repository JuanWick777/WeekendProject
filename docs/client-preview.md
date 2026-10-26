# Arena y práctica local — integración A1

Abrir con Node 24: `npm ci` si faltan dependencias y `npm run dev`; http://127.0.0.1:5173. La vista muestra **SIMULACIÓN LOCAL · SIN MULTIJUGADOR**. Solo se incluye en desarrollo y no guarda resultados.

- PC: WASD/flechas, ratón y clic mantenido.
- Móvil: pad izquierdo de movimiento y derecho de apuntado/disparo, simultáneos. Seleccionar controles táctiles en herramientas para revisarlos en escritorio.
- P1–P4: elegir un único dron controlado; los restantes quedan quietos. No hay bots.
- Cámara: mapa completo o seguimiento 2×. Cuadrícula muestra la malla auxiliar y Colisiones los rectángulos físicos originales.
- Ronda normal: 150 s, cinco nodos, 30 s cada uno. Pausa al cambiar de ventana.
- Práctica de combate: P1 en R1 (360,180), P2 (424,180), P3 (1036,860) y P4 en R12 (1100,860). Seleccionar P2 y disparar a la izquierda para comprobar escudo, daño y respawn.
- Reiniciar restablece ronda/escudos/estadísticas con la semilla escrita.

La práctica usa createMatch de shared, input 20 Hz y tick 30 Hz. El render no calcula daño ni puntuación. Todos tienen 100 HP, velocidad 160, radio 10 y arma idéntica. El escudo es una carga sin duración.

El dibujo del escenario reutiliza las funciones originales de A; los drones son sus PNG transparentes originales, sin recrearlos. Se adapta solo la presentación al tamaño común del cuerpo. Mundo 1448 × 1088, con plano original 1448 × 1086 sin estirar; plantilla a-industrial v5, generador v3, protocolo 5. Terreno fijo; semilla de escudos independiente. Ver [maps.md](maps.md).

Verificación automática: geometría base exacta, tres variantes opt-in, recorridos con movimiento real, diagonales, esquinas y balas rápidas; además combate/escudos/respawn, red del servidor y ronda local. No sustituye pruebas con varios navegadores y PostgreSQL ni un móvil físico.

Esta entrega conserva el panel de práctica de B. La adaptación del HUD/efectos y de las pantallas de A es el siguiente bloque. El cliente online, interpolación/reconciliación, reconexión y guardado siguen pendientes. Ver [a1-integration.md](a1-integration.md).
