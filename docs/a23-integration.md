# A2/A3 — aplicación online e integración del equipo

Base de los parches: main 74f9fd4 más el paquete A1. Se entregan dos parches de cliente y un tercero separado para el puente de B. Los módulos de almacenamiento de C no se incluyen ni se reemplazan.

## Pantallas y diseño

El menú de escritorio usa el PNG original de A con botones accesibles superpuestos. Registro/login, salas, lobby de cuatro plazas, ayuda y resultados se construyen con HTML adaptable al mismo estilo industrial. No son imágenes con nombres o estadísticas de ejemplo. En móvil el menú usa botones y texto adaptados al ancho; en juego aparecen los dos pads.

El mapa y los personajes usan los archivos originales de A1. No se usan los bots, atributos diferentes ni reglas temporales del prototipo. Las reglas compartidas mantienen velocidad 160, radio 10, proyectil 480, alcance 320, cadencia 350 ms y escudo de un impacto.

## Circuito funcional

1. Crear cuenta o iniciar sesión. La API conserva una cookie HttpOnly; el cliente no guarda tokens ni contraseñas en localStorage/sessionStorage.
2. Crear sala o introducir código de seis caracteres. El lobby muestra jugadores, anfitrión, conexión y listo.
3. Esperar la preparación de las imágenes y marcar LISTO. Solo el anfitrión inicia con al menos dos participantes conectados y preparados.
4. Jugar con snapshots del servidor. El cliente predice únicamente movimiento local y dibuja interpolación y efectos.
5. El menú de partida avisa que la ronda continúa. Abandonar pasa por la API real.
6. Resultados muestra clasificación, empate/abandono, estadísticas y estado de guardado. No declara guardado hasta recibir confirmación del servidor.
7. El anfitrión puede preparar revancha; se reinicia LISTO y la ronda usa un matchId nuevo.

Una recarga recupera sala/ronda mientras la sesión siga válida. La conexión intenta recuperarse durante 15 segundos; una pestaña sustituida deja de reconectar automáticamente para evitar que dos pestañas se expulsen entre sí. El botón RECONECTAR permite reclamarla manualmente. Al cambiar de ventana se liberan controles; no se pausa el reloj de servidor.

## Dependencias y propiedad

- A revisa y publica A1, A2 y A3 desde su cuenta.
- C publica sus módulos de users/sessions/matches, siembra/telemetría y correcciones SQL.
- B aplica el puente de servidor después de integrar C y cierra la entrega.
- No copiar node_modules, .env, dist, bases temporales o test-results al repositorio.
- No aplicar un parche si falla git apply --check. Revisar el diff frente a cambios nuevos; no sobrescribir archivos completos de C.

El puente añade server/src/postgres-services.js y configura index.js. Comprueba cuatro tablas, enlaza users/sessions con authService y matches.saveMatch con el runtime. Un fallo de base/esquema impide anunciar un servidor operativo. /api/health informa database=ready después de esa comprobación; no es una sonda SQL continua.

## Verificación y límites

En la copia integrada con el paquete conocido de C pasaron lint, 105 pruebas, build y tres E2E con PostgreSQL 18 y Edge. Los E2E usan cuentas y conexiones reales, aislamiento por esquema y rondas de 15 s solo en su servidor de pruebas. Producción conserva 150/30/5 s.

Todavía deben comprobarse Supabase por internet, el despliegue HTTPS, teléfono físico, mediciones públicas y endpoints de evaluación. El paquete no crea cuentas de hosting, no publica URL ni resuelve por sí mismo el requisito procedural. La persistencia fallida se muestra al usuario; aún no hay reintento automático de guardado.
