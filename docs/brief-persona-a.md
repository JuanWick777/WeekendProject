# A — Guía completa de cliente, arte y mapas

Tu responsabilidad es `client/` y `docs/visual-references/`. B desarrolla cuentas, salas, sockets y simulación; C desarrolla datos, telemetría, pruebas globales y despliegue. Trabajamos con JavaScript ESM, Vite, HTML/CSS y Canvas 2D. La entrega termina el domingo 25/10/2026 a las 23:59, Ciudad de México.

La referencia de reglas es [game-design.md](game-design.md), la de datos es [contracts.md](contracts.md) y la de arena es [maps.md](maps.md). Esta guía cubre todo tu alcance, no solo el primer bloque. Las constantes compartidas ya son v2. Puedes usar el [fixture de desarrollo](../shared/fixtures/README.md); sockets y partida online siguen pendientes.

## Qué estamos construyendo

Arena de 2–4 personas, todos contra todos, con rondas de 150 segundos y proyectiles de energía dirigidos. Cinco zonas se activan de una en una durante 30 segundos cada una: centro, norte (sector A), este (sector B), sur (sector C), oeste (sector D). Hay aviso del siguiente nodo durante los últimos 5 segundos.

Una persona viva sola dentro acumula un punto por segundo; dos o más disputan y nadie puntúa. Se puede moverse y disparar dentro. Las fracciones de segundo y los puntos se conservan al salir o morir. Respawn: 3 segundos. Gana más puntuación, luego bajas, luego menos muertes; empate si persiste. Una carga de escudo recogible absorbe el siguiente impacto automáticamente. No hay transporte de fragmentos, entrega ni barra de sincronización.

## Tu mapa y sus variantes

Diseña **una sola arena base**, no dos mapas ni un mapa por nodo. Cuadrícula 24 × 16, tile de 32, mundo 768 × 512. B generará variantes de obstáculos por semilla; tú dibujas la plantilla y los grupos que pueden variar. El mapa permanece igual durante la ronda aunque cambie el objetivo.

Entrega el trazado con paredes fijas, cinco círculos de radio 64, al menos cuatro apariciones, recogidas de escudo, rutas protegidas y variantes permitidas de cobertura. Un dibujo con cuadrícula y coordenadas basta para empezar; B ayuda a convertirlo a datos. Todos los criterios de accesos, conectividad, fallback y reparto están en [maps.md](maps.md). No crees un generador propio en el cliente: renderiza el mapa resuelto que recibe del servidor.

## Dirección visual y recursos

Estética cenital de circuitos y energía. Una posible paleta es fondo `#070B14`, paredes `#162034`, energía `#54E7FF`, peligro `#FF6A8B`, acentos `#FFD166` y texto `#F4F7FC`; puedes ajustarla manteniendo contraste y legibilidad.

Necesitamos elementos coherentes para jugador y orientación, pared sólida, suelo/decoración, proyectil, impacto, escudo disponible/equipado y nodo inactivo/activo/controlado/disputado/próximo. Distingue jugadores con contorno, nombre u otra señal además del color. El nodo debe mostrar un límite preciso; evita que el brillo oculte balas, paredes o accesos.

Mantén una sola dirección artística. Si aún faltan referencias, limita la búsqueda a 30–45 minutos y reúne 6–8 con una frase de intención cada una:

- Geometry Wars: claridad de formas, energía y contraste. [Capturas del editor](https://blog.activision.com/fr/more-games/archives/pre-order-geometry-wars-3-dimensions-to-gain-two-exclusive-bonus-levels).
- Transistor: paleta y ambiente tecnológico. [Galería oficial](https://www.supergiantgames.com/games/transistor/).
- Brawl Stars: lectura del personaje y distribución móvil. [Página oficial](https://supercell.com/en/games/brawlstars/).
- Búsquedas: `top down neon arena shooter`, `twin stick shooter mobile HUD`, `hardpoint objective HUD`, `sci fi control point`, `2d energy projectile VFX`.

Guarda recursos integrados dentro de client y referencias/bocetos en docs/visual-references. Anota origen y licencia de recursos externos. Prioriza formas Canvas simples y efectos acotados. Sonido, si alcanza el tiempo, debe activarse tras interacción y poder silenciarse.

## Todas las pantallas y estados

- Registro/login con validación, carga, credenciales incorrectas y sesión expirada.
- Crear sala o entrar por código; errores de código, sala llena o ronda iniciada.
- Lobby con participantes, conexión, anfitrión, Listo y botón de inicio según permisos.
- Cuenta regresiva y vuelta al lobby si se cancela.
- Partida: Canvas, HUD, controles, respawn y reconexión.
- Resultados: ganador/empate/abandono, puntos, control, bajas, muertes y revancha del anfitrión.
- Error de conexión y recuperación sin duplicar jugador ni mostrar un éxito ficticio.

HUD: vida, escudo 0/1, puntos, tiempo de ronda, clasificación compacta, nodo activo, tiempo hasta cambio, estado vacío/controlado/disputado y preaviso del próximo nodo. La progresión es tiempo de control acumulado; no dibujar un porcentaje de captura que sugiera otra regla.

## Controles completos

PC: WASD/flechas, ratón y clic izquierdo mantenido. Móvil: joystick izquierdo y acción derecha que se arrastra para apuntar y mantener disparo. Ambos controles funcionan a la vez; se ocultan en PC. Evitar scroll/zoom accidental sobre la superficie de juego y liberar entradas al terminar/cancelar un gesto, perder foco o cambiar de pantalla.

Enviar `seq`, `moveX`, `moveY`, `aimX`, `aimY`, `attack` según contrato. Apuntar es independiente de moverse. Convertir ratón/touch desde tamaño CSS y encuadre hasta coordenadas del mundo; contemplar barras de ajuste, escala y DPR. No enviar coordenadas del jugador para moverlo.

## Canvas, red y diagnóstico

Canvas conserva proporciones al redimensionar y ajustar densidad de píxeles; HUD/menús usan HTML/CSS. Bucle con requestAnimationFrame y delta, sin cambiar velocidad según refresco. No acumular loops, listeners ni timers al cambiar de pantalla/reconectar.

Consume HTTP y WebSocket reales, controla errores y deduplica efectos por eventId. Interpola rivales y proyectiles entre snapshots; corrige predicción local con estado autoritativo y lastProcessedSeq. Sincroniza temporizadores con serverTimeMs y los plazos recibidos; el cliente no suma puntos ni decide impactos, ocupación o recogidas.

Mostrar FPS, RTT y conexión en diagnóstico plegable. Mantener `data-testid="player-state"` con `data-player-x` y `data-player-y` recibidos del servidor, no de la animación predicha. Coordinar selectores estables con C para login, sala, Listo e inicio.

Se pueden usar escenas locales para avanzar antes del backend, claramente rotuladas como fixture. Retirarlas del recorrido online final. No convertir respuestas inventadas en una partida aparentemente conectada.

## Pruebas, integración y definición de terminado

Tus dos pruebas funcionales cubren interpolación normal y comportamiento con intervalos extremos/falta de muestras, sin NaN ni saltos fuera de la política acordada. Ayuda a C con E2E de controles reales PC y móvil; el segundo cliente debe observar el movimiento recibido del servidor.

Trabaja en `feat/client-shell` y luego ramas pequeñas por tarea, con PR hacia main. B mantiene shared; coordina cambios de protocolo o dependencias. Lee [github-workflow.md](github-workflow.md).

Tu parte termina cuando todas las pantallas funcionan con el servidor real, el mapa recibido coincide entre clientes, los tres estados del nodo y su rotación son claros, se puede moverse/disparar simultáneamente en móvil y PC, y los resultados/revancha corresponden al servidor. Debe pasar npm run verify; al integrar C3 también verify:release. Pulir efectos después de cerrar ese recorrido.
