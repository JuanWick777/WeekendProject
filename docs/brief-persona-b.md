# B — Servidor, salas y simulación

Este rol lo toma el coordinador de este chat. La base B0 está preparada localmente; falta publicarla en GitHub. Lee primero game-design.md y contracts.md.

## Tu primer bloque: B1, autenticación

Mientras A diseña y C prepara almacenamiento, implementa auth-service.js con repositorios inyectados. Así puedes comprobar su lógica con un repositorio de prueba sin esperar a que PostgreSQL esté listo.

1. Acordar con C las firmas de users.js y sessions.js que aparecen en contracts.md.
2. Implementar registro con username normalizado, displayName y hash de contraseña. Usar scrypt asíncrono de node:crypto o una librería acordada; nunca guardar la contraseña.
3. Implementar login que compruebe hash, logout y GET /api/auth/me.
4. Usar token aleatorio de sesión en cookie HttpOnly, SameSite=Lax, Path=/ y Secure en producción. Guardar su hash en la base. Duración inicial: 24 horas.
5. Agregar middleware de sesión para salas; ningún cliente elige su userId.
6. Integrar repositorios reales de C y probar dos usuarios distintos.

Terminado: login correcto devuelve 200 y cookie; credenciales incorrectas devuelven 401; me sin sesión devuelve 401; logout invalida la sesión; respuestas públicas no incluyen hashes ni tokens.

## Segundo bloque: B2, salas y conexión

- Crear código de sala de seis caracteres, entrar/salir, marcar Listo y transferir anfitrión si sale.
- Estados: lobby, countdown, playing, finished.
- Solo iniciar con 2-4 participantes y todos listos; solo el anfitrión inicia o pide revancha.
- Aceptar upgrade /ws únicamente con sesión válida y Origin permitido. Vincular el socket al usuario del servidor.
- Enviar welcome/lobby y propagar cambios a los participantes de la sala.
- Implementar ping/pong de aplicación para medir RTT. Añadir heartbeat del transporte para detectar conexiones muertas.
- Rechazar conexiones adicionales o reemplazar de forma controlada la conexión anterior del mismo usuario; no crear jugadores duplicados.

Terminado: dos navegadores con dos cuentas se ven en la misma sala, reciben sus cambios y empiezan una cuenta regresiva. La sesión y la pertenencia a la sala también se comprueban en backend.

## Tercer bloque: B3, partida completa

1. Generador por semilla con conectividad comprobada y fallback válido.
2. Tick fijo de 30 Hz. Usar reloj del servidor, no dt ni posiciones enviados por el cliente.
3. Movimiento de 160 unidades/s, normalización diagonal y colisiones con paredes/límites.
4. Proyectiles: 480 unidades/s, alcance 320, intervalo 350 ms, daño de 30 a 20. Detectar el primer impacto a lo largo del segmento recorrido; no comprobar únicamente su punto final.
5. Recogidas e inventario hasta 5 fragmentos; sincronización automática de 2 segundos que se cancela por movimiento, disparo o daño.
6. Muerte, pérdida de carga, respawn a los 3 segundos y condición de fin a los 150 segundos.
7. Snapshots de 15 Hz con lastProcessedSeq por jugador, proyectiles y estado de sincronización.
8. Persistir un resultado por matchId mediante C, en una transacción, sin bloquear cada tick con consultas.

Terminado: dos usuarios pueden jugar una ronda completa y los resultados corresponden a las decisiones del servidor.

## Cuarto bloque: B4, límites y desconexión

- Validar mensajes con Zod, limitar tamaño/frecuencia y rechazar inputs fuera de fase.
- Inputs sin actualizar durante 250 ms vuelven a movimiento cero y sin disparo.
- Ignorar secuencias repetidas/antiguas. En reconexión, establecer la secuencia inicial con el cliente.
- Permitir recuperar al mismo jugador durante 15 segundos, sin duplicarlo.
- Después del plazo, registrar abandono y limpiar la participación. Resolver final por abandono cuando corresponda.
- Limpiar salas inactivas y recursos de partidas terminadas.

## Tus pruebas requeridas

- Dos de mapas: reproducibilidad y transitabilidad/apariciones.
- Dos de daño/escalado: fórmula y límites.
- Una de autoridad: input malicioso no permite atravesar paredes ni superar velocidad.

Estas cinco son casos funcionales pendientes; las pruebas ya incluidas en el bootstrap no las reemplazan.

## Archivos tuyos

server/src/auth/, rooms/, net/, game/, app.js, index.js y config.js. Mantienes shared/src/. C edita storage/ y telemetry/; conecta sus routers desde app.js en un cambio pequeño coordinado.

Primer entregable para A: un login y lobby reales. Primer entregable para C: el formato definitivo de MatchResult y la llamada saveMatch.
