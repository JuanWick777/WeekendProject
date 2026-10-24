# Contexto y primer encargo para la persona A

Este texto se puede copiar completo y compartir con la responsable del cliente y del diseño visual.

## Contexto del proyecto

Somos tres personas desarrollando **CyberGrid: Breach & Sync**, un videojuego web multijugador para un concurso escolar. La entrega termina el domingo **25 de octubre de 2026 a las 23:59, hora de Ciudad de México**. Debemos entregar una URL pública y el repositorio. Tenemos experiencia media en JavaScript y utilizaremos JavaScript con módulos ESM, Vite, Canvas 2D, HTML y CSS. El servidor usa Node.js, Express y WebSockets con `ws`. Compartimos reglas y esquemas Zod desde `@cybergrid/shared`.

Tu rol es **A: dirección visual, cliente Canvas, controles e interfaz**. B implementa cuentas, salas, sockets y simulación; C implementa persistencia, telemetría, pruebas de integración, CI y despliegue. Tus primeras propuestas visuales pueden comenzar antes de que el repositorio esté en GitHub.

## De qué trata el juego

Es una arena competitiva vista desde arriba para **2 a 4 jugadores**, todos contra todos. Cada ronda dura **150 segundos**. Controlas a un intruso dentro de una red informática: recorres pasillos, recoges fragmentos de datos y los llevas a un **nodo central de sincronización**.

Puedes transportar hasta **5 fragmentos**. Transportarlos todavía no suma puntos: necesitas quedarte quieto dentro del nodo durante **2 segundos** para asegurar toda tu carga. Moverte, disparar o recibir daño cancela ese progreso. Al eliminarte, pierdes la carga transportada, pero conservas los puntos ya asegurados; reapareces tras **3 segundos**.

Gana quien más datos haya sincronizado. Se desempata por más bajas y luego por menos muertes; si persiste, hay empate.

El arma está definida: **disparos de energía dirigidos**, con proyectiles visibles. NO usamos un pulso radial como ataque. Un proyectil viaja en línea recta y desaparece al impactar una pared, al primer rival o al alcanzar su límite. La vida inicial es 100; el daño baja de 30 a 20 con la distancia; el intervalo de disparo es 350 ms, la velocidad 480 unidades/s y el alcance 320 unidades. Estos valores se afinan juntos tras jugar.

Ejemplo: llevas cuatro fragmentos y empiezas a sincronizar. Otro jugador te dispara desde un pasillo. Puedes intentar terminar, retirarte o defenderte. Si mueres antes de terminar, ese jugador puede recoger tu carga.

## Controles y pantallas

- PC: WASD o flechas para moverte, ratón para apuntar y clic izquierdo mantenido para disparar repetidamente.
- Móvil: joystick izquierdo para movimiento y un control de disparo derecho que se arrastra para apuntar; mantenerlo activo permite disparar. Apuntar es independiente del movimiento. Debe verse como un botón de acción claramente identificable.
- En PC los controles táctiles deben ocultarse. En móvil deben permitir mover y disparar a la vez, sin hacer scroll de la página.
- Pantallas: registro/login, crear o entrar a sala por código, lobby con estados Listo, cuenta regresiva, partida, resultados y revancha.
- Estados adicionales que deben tener diseño: conectando, error de credenciales, sala llena, rival desconectado, reconectando, respawn y empate.

## Primera dirección visual propuesta

Buscamos **ciencia ficción de circuitos y energía**, con lectura rápida de la arena. Puedes explorar dos variantes dentro de esa dirección y recomendar una. La cámara es cenital 2D; el mapa lógico mide **24 x 16 casillas de 32 unidades**, equivalente a 768 x 512 unidades. El Canvas se adapta sin estirar el mundo y tiene que seguir siendo legible en teléfono apaisado.

Una base posible, que puedes mejorar:

- Fondo: azul casi negro, por ejemplo `#070B14`.
- Paredes: grafito azulado, por ejemplo `#162034`.
- Energía/interacción: cian, por ejemplo `#54E7FF`.
- Peligro/impactos: coral, por ejemplo `#FF6A8B`.
- Datos y puntos: ámbar, por ejemplo `#FFD166`.
- Texto: blanco suave, por ejemplo `#F4F7FC`.

Queremos formas simples dibujables en Canvas: intrusos o drones geométricos, paredes modulares, fragmentos de datos, proyectiles con estela y un nodo con anillo de progreso. Diferencia jugadores con color, contorno, nombre y orientación; los elementos no deben distinguirse únicamente por color.

El HUD necesita vida, carga `0/5`, puntos asegurados, tiempo restante y clasificación compacta. El progreso de sincronización, el daño y la dirección de apuntado deben entenderse de inmediato. FPS, ping y coordenadas pertenecen a un panel de diagnóstico discreto y plegable.

## Qué buscar como referencia y para qué

Dedica como máximo **30-45 minutos a referencias**. Reúne entre 6 y 8 imágenes y escribe una frase por imagen explicando qué quieres tomar como idea. Estudia lenguaje visual y funcionamiento; diseña nuestros elementos propios.

1. **Geometry Wars**: formas luminosas, contraste entre proyectiles y fondo, claridad del movimiento. Referencia del editor con capturas: https://blog.activision.com/fr/more-games/archives/pre-order-geometry-wars-3-dimensions-to-gain-two-exclusive-bonus-levels
2. **Transistor**: ambientes tecnológicos y combinación de color, arquitectura y energía. Nos interesa la dirección artística; nuestra vista seguirá siendo cenital y nuestra geometría mucho más sencilla. Galería oficial: https://www.supergiantgames.com/games/transistor/
3. **Brawl Stars**: observar distribución de controles y legibilidad de personajes en pantalla móvil. Nuestro disparo mantenido tiene reglas propias. Página oficial: https://supercell.com/en/games/brawlstars/

Búsquedas útiles para ampliar el moodboard:

- `top down neon arena shooter gameplay`
- `cyberpunk 2d top down tileset`
- `twin stick shooter mobile HUD`
- `energy projectile game VFX 2D`
- `capture point progress ring game UI`
- `sci fi game lobby UI`

## Entregable de diseño para la primera hora

1. Un moodboard breve, con referencias comentadas y una dirección recomendada.
2. Una composición de partida para escritorio, por ejemplo 1440 x 900.
3. Una composición de partida para móvil horizontal, por ejemplo 844 x 390.
4. Un boceto del lobby y de la pantalla de resultados. Pueden ser wireframes simples.
5. Una paleta y una minihoja de elementos: jugador, pared, datos, nodo, proyectil, impacto y botones.

Usa la herramienta que ya domines: Figma, Canva, un editor de dibujo o bocetos. Las referencias y bocetos pueden enviarse al equipo para revisión; los recursos que se integren se guardarán dentro del repositorio. Prioriza una propuesta clara sobre muchas variantes.

## Tu implementación después del diseño

Primero: un Canvas adaptable con una arena de prueba, un jugador, una pared, datos y el nodo; HUD en HTML/CSS y controles que produzcan inputs normalizados. La escena de prueba debe estar claramente identificada como **fixture local**, sin simular que ya existe una partida online.

Después: conexión a HTTP/WebSocket, renderizado de snapshots, interpolación, mira, proyectiles, resultados y efectos. Coordina con B cualquier cambio del contrato antes de incorporarlo. El documento `docs/contracts.md` es la referencia técnica.

Un input llevará `seq`, `moveX`, `moveY`, `aimX`, `aimY` y `attack`. Los vectores de apuntado son independientes del movimiento. La conversión del ratón debe considerar el tamaño CSS del Canvas y el encuadre del mundo.

Tú presentas el estado; el servidor decide posiciones válidas, daño, impactos, carga y puntuación. Los efectos visuales no cambian esas reglas. La predicción de movimiento local es visual y siempre se corrige con el estado del servidor.

Tu carpeta principal es `client/`. Tus pruebas iniciales son las dos de interpolación. Los archivos de `shared/` se coordinan con B. No instales otro motor ni cambies el protocolo por tu cuenta. La UI usa HTML/CSS y el mundo usa Canvas 2D.

## Cuándo está terminado tu primer bloque

- El equipo puede revisar los dos diseños de partida y aprobar una dirección visual.
- En el navegador se ve una escena Canvas que conserva proporciones al redimensionar.
- El HUD diferencia claramente carga transportada y puntuación asegurada.
- Se pueden mover y apuntar en direcciones diferentes.
- En móvil aparecen controles utilizables simultáneamente; en PC se ocultan.
- Los disparos de energía son visualmente distintos de los fragmentos que se recogen.
- No dependes de que el servidor esté completo para avanzar en la presentación y el input.

El objetivo del fin de semana es una partida pequeña y pulida que podamos demostrar de principio a fin. Tu mayor aporte será que las acciones se entiendan, el control se sienta bien y la identidad visual sea coherente.
