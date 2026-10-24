# CyberGrid — Diseño acordado v1

## Identidad

Arena cenital de 2 a 4 jugadores, todos contra todos, sobre una red informática. El objetivo es recoger datos, transportarlos y sincronizarlos en un nodo central. Gana la puntuación asegurada, no la carga ni las bajas por sí solas.

Duración: 150 segundos. Capacidad: 5 fragmentos. Sincronización: 2 segundos quieto dentro del nodo. Moverse, disparar o recibir daño reinicia el progreso. Sincronizar asegura toda la carga y la deja en cero.

Desempate: puntuación descendente, bajas descendentes, muertes ascendentes; si siguen iguales, empate. Un empate se registra como tal y no como victoria individual.

## Combate aprobado

El arma es un bláster con **proyectiles de energía dirigidos**. No existe un ataque radial.

- Vida: 100; recarga del disparo: 350 ms.
- Velocidad: 480 unidades/s; alcance: 320 unidades.
- Daño: redondear 30 - 10 * distanciaRecorrida / 320 dentro de [0, 320]. Fuera de alcance no impacta.
- El proyectil termina en la primera pared o rival alcanzado. No daña a su dueño, no rebota y no atraviesa.
- Vida, daño, impactos y enfriamiento se resuelven en el servidor.
- Muerte: carga al suelo, muertes +1, baja al atacante y respawn tras 3 segundos.
- Los puntos sincronizados nunca se pierden al morir.

La distancia es la recorrida por el proyectil desde su origen. Un tick debe comprobar el segmento completo contra paredes y jugadores para evitar atravesarlos a alta velocidad.

## Mundo y controles

24 columnas x 16 filas, casillas de 32 unidades: 768 x 512 unidades. Paredes modulares con variaciones por semilla, apariciones seguras y caminos al nodo. Verificar conectividad y disponer de un fallback válido.

Los jugadores colisionan con paredes y límites; no bloquean físicamente el movimiento de otros jugadores en esta primera versión. Los disparos sí interactúan con rivales.

Movimiento: 160 unidades/s, radio 10. Normalizar diagonales. PC: WASD/flechas + ratón + clic izquierdo mantenido. Móvil: joystick izquierdo y botón/control derecho de apuntado y disparo, simultáneos.

Fragmentos fijos reaparecen tras 8 segundos; la carga caída por eliminación caduca a los 15 segundos si no se recoge. Estos valores y la densidad de recogidas se pueden afinar con playtesting sin cambiar el contrato.

## Ciclo de sala

lobby -> countdown (3 segundos) -> playing -> finished -> lobby al pedir revancha.

Solo el anfitrión inicia con 2-4 personas y todos listos. Si sale del lobby, se transfiere el anfitrión. No se incorporan participantes nuevos durante una ronda. La revancha crea otro matchId, otra semilla y reinicia Listo y estadísticas de ronda.

Inputs caducan a los 250 ms. Reconexión del mismo usuario: hasta 15 segundos; el jugador permanece en el mundo, detenido y vulnerable. Al vencer el plazo se registra abandono. Si queda un participante, finalizar por abandono después de resolver los plazos. Si no queda ninguno, marcar partida abortada, sin victoria; las partidas abortadas no entran al win rate de completadas.

## Presentación

Pantallas: autenticación, lobby, partida y resultados. HUD: vida, carga, puntos, tiempo y clasificación compacta. Mostrar progreso de sincronización y tiempo de respawn. Diagnósticos plegables: conexión, RTT, FPS y coordenadas autoritativas.

A define paleta y elementos dentro de la dirección de circuitos/energía. Usar formas legibles y efectos acotados. El fixture de desarrollo y la pantalla de bootstrap no representan una partida online.

## Fuera del alcance inicial

Campaña, clases, tienda, skins, múltiples armas, rebotes, chat, matchmaking global, bots y múltiples instancias de servidor. Agregar contenido solo si existe una ronda completa, las pruebas están verdes y queda tiempo.
