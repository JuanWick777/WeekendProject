# Recorridos E2E con servidor y PostgreSQL reales

Requieren Node 24, los módulos de C, el puente de B y el build de A3. No usan repositorios de memoria ni resultados inventados.

## Ejecutar en Windows con Edge instalado

Desde la raíz del repositorio integrado:

```powershell
npm.cmd ci
# Configurar TEST_DATABASE_URL en .env; usar una base de pruebas distinta.
npm.cmd run verify
$env:E2E_BROWSER_CHANNEL = 'msedge'
npm.cmd run test:e2e
Remove-Item Env:E2E_BROWSER_CHANNEL
```

Para Chromium: `npx.cmd playwright install chromium` y ejecutar sin E2E_BROWSER_CHANNEL. En Linux/Actions: `npx playwright install --with-deps chromium`.

El servidor E2E usa localhost:4176 por defecto (E2E_PORT permite otro). Crea un esquema cg_test_<uuid> en TEST_DATABASE_URL, carga el esquema oficial y lo elimina al terminar. La cuenta necesita permiso de crear/eliminar ese esquema. No modifica ni trunca las tablas normales de desarrollo. Cualquier E2E interrumpido forzosamente puede dejar un esquema de pruebas que C deba revisar.

No configurar NODE_ENV=production en esta ejecución. Playwright transmite NODE_ENV=test a su servidor. El pool de C exige TEST_DATABASE_URL explícita. El tiempo de ronda es 15 s, nodo 3 s y cuenta regresiva 300 ms solo en tests; no cambia las reglas de producción.

## Tres recorridos

1. Registro, escape de nombre, privacidad de respuesta, cierre e inicio de sesión y contraseña incorrecta.
2. Dos contextos/cuentas, lobby real, teclado autoritativo, móvil 390×844 y dos pads simultáneos, recarga/recuperación de matchId, abandono y resultado consultado directamente en PostgreSQL.
3. Fin natural, cinco nodos, empate, persistencia, revancha que reinicia listo y genera otro matchId.

Se guardan capturas de las pantallas en test-results; un fallo conserva screenshot y trace. Los contextos comprueban errores de JavaScript. La base prueba source=live, is_synthetic=false y participantes reales.

El recorrido móvil automatizado usa emulación de Edge/Chromium y CDP multitouch. No sustituye un teléfono físico, red pública ni pruebas con cuatro usuarios en redes diferentes.
