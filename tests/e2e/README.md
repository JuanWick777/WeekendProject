# E2E pendientes — C3

Crear auth.spec.js, lobby.spec.js y gameplay.spec.js. Usar el servidor real y dos contextos independientes, con base PostgreSQL de pruebas.

La partida usa el contrato v2 de nodos rotatorios de docs/contracts.md. gameplay envía controles reales, comprueba x/y autoritativas en DOM y observa el cambio desde el segundo cliente; incluir variante táctil y presentación del objetivo. No depender de los antiguos carry/syncProgress ni confundir el fixture de diseño con juego online.

Playwright ya tiene proyectos desktop y mobile-landscape y arranca el build con el servidor en 127.0.0.1:3100. Al añadir los flujos, instalar Chromium con npx playwright install chromium. En Actions usar la instalación con dependencias del runner.

No se proporciona un spec vacío ni una prueba de que existe un canvas como sustituto de los tres flujos de la rúbrica. npm run test:e2e fallará sin tests: es esperado hasta C3. npm run verify valida solamente el bootstrap; verify:release añade E2E.
