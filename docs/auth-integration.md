# B1 — Autenticación implementada y conexión con C

Estado: auth y [salas/WebSockets](lobbies-network.md) integrados en main por los PR #2 y #3. B3 añade [simulación y guardado inyectado](game-server.md). **Falta conectar los repositorios PostgreSQL de C al arranque y probar esa integración.** El servidor normal conserva health y responde 503 AUTH_NOT_READY en auth hasta recibirlos; no crea un almacenamiento en memoria de producción.

## Archivos disponibles

- server/src/auth/auth-service.js: `createAuthService({ users, sessions, now? })`.
- server/src/auth/routes.js: registro, login, logout y me, montados desde createApp.
- server/src/auth/middleware.js: requireSession, requireAllowedOrigin y requireAuthReady.
- server/src/auth/session.js: lector de cg_session y opciones de cookie, reutilizable en B2.
- server/src/auth/passwords.js: hash y comprobación scrypt asíncronos.
- server/src/auth/rate-limit.js: límite de intentos por IP y ventana.
- server/test/auth.test.js: pruebas HTTP reales con repositorios aislados de prueba. No son los E2E finales ni una prueba de PostgreSQL.

## Entregable inmediato de C

`users` y `sessions` deben implementar todas las funciones de [contracts.md](contracts.md), con las firmas ya acordadas. B1 valida la presencia de esas funciones al construir el servicio. C decide cómo construir sus repositorios/pool; no hay que duplicarlos dentro de auth.

Requisitos concretos de integración:

- createUser devuelve un usuario con id, username y displayName; findUserByUsername incluye passwordHash.
- Username normalizado único. Una carrera de duplicado lanza un error con code USERNAME_TAKEN; auth lo convierte a HTTP 409.
- Sesiones almacenan userId, tokenHash y expiresAtMs. La búsqueda devuelve `{ user, expiresAtMs }` o null; el vencimiento debe llegar como número finito en ms.
- Las operaciones son asíncronas; los errores de conexión/SQL deben propagarse, sin aparentar éxito.

Cuando estén listos, B/C conectan en server/src/index.js antes de crear el servidor:

~~~js
import { createAuthService } from './auth/auth-service.js';
import { createServerRuntime } from './runtime.js';

// users, sessions y matches son los repositorios PostgreSQL inicializados por C.
const authService = createAuthService({ users, sessions });
const runtime = createServerRuntime({
  authService,
  saveMatch: (result) => matches.saveMatch(result),
  appOrigin: config.appOrigin,
  nodeEnv: config.nodeEnv,
});
const { server } = runtime;
~~~

El fragmento muestra el punto de unión, no un módulo de almacenamiento ya existente. Coordinar la edición de index.js con B. Al apagar, ejecutar runtime.close y cerrar el pool. La conexión/configuración inicial debe fallar claramente si es incorrecta; no sustituirla con repositorios de prueba. Ajustar el estado database de health cuando se implemente su comprobación real.

B2 ya conecta el roomCode real del usuario y protege las salas con requireSession. El runtime acepta /ws cuando recibe authService; sin repositorios sigue rechazando el upgrade. Se conservan createApp y los middleware para las pruebas aisladas de auth.

## Contrato HTTP disponible

POST register recibe username, displayName y password; POST login recibe username y password. Ambos responden 200 con `{ ok: true, data: { user } }` y cookie cg_session. GET me requiere esa cookie. POST logout la invalida y elimina del navegador; repetir logout es válido.

Las operaciones POST exigen header Origin igual a APP_ORIGIN, también cuando se prueban con curl o un cliente API. En desarrollo usar el navegador en http://127.0.0.1:5173 y rutas relativas mediante Vite. APP_ORIGIN es el origen sin ruta ni barra final; en producción debe ser el origen HTTPS público. No activar CORS permisivo para corregir una configuración equivocada.

Errores: 400 VALIDATION_ERROR, 401 INVALID_CREDENTIALS/UNAUTHENTICATED, 403 ORIGIN_FORBIDDEN, 409 USERNAME_TAKEN, 429 AUTH_RATE_LIMITED/AUTH_BUSY y 503 AUTH_NOT_READY. Errores inesperados de persistencia responden 500 genérico sin publicar detalles internos. UI debe manejar estos códigos.

## Contraseñas y sesiones

Formato persistido: `scrypt$32768$8$3$<saltHex>$<derivedKeyHex>`, salt aleatorio de 16 bytes y clave de 64. Parámetros N=32768, r=8, p=3, maxmem=64 MiB; se usan las APIs asíncronas y comparación de tiempo constante de [Node 24 crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback). Esta combinación está entre las opciones scrypt de [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).

El token de sesión tiene 32 bytes aleatorios, codificados base64url. Solo el SHA-256 del token se guarda en PostgreSQL; el token se envía exclusivamente como cookie HttpOnly, SameSite=Lax, Path=/ y Secure en producción, con vencimiento de 24 horas. No se necesita SESSION_SECRET para este esquema de tokens opacos. Un login correcto reemplaza la sesión presentada por el navegador; otras sesiones del usuario no se eliminan globalmente.

Hay 20 intentos combinados de registro/login por minuto e IP por defecto y como máximo dos derivaciones scrypt simultáneas por proceso. Son límites del despliegue de un proceso, no un servicio distribuido. C/B deben comprobar cómo llega la IP en el proxy de hosting antes de configurar trust proxy; no confiar automáticamente en cualquier X-Forwarded-For recibido.

## Verificación y cierre de B1

Con Node 24: npm run verify. B1 aprobó 20 pruebas; junto con B2/B3, el total es 72 pruebas, lint y build aprobados. Los tests de auth cubren registro, normalización/duplicados, credenciales, rotación, expiración, logout, Origin, validación, cookies Secure, frecuencia, errores de repositorio y estado no configurado.

Para cerrar B1 faltan dos cuentas reales con PostgreSQL, reinicio del servidor conservando usuarios/sesiones y rechazo de sesión después de logout/expiración. C añade esa integración a su base de pruebas; el recorrido de navegador con auth, lobby y Canvas sigue pendiente de C3/A/B2.
