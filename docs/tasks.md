# Tareas y orden de integración

Entrega: domingo 25/10/2026 23:59, Ciudad de México. Se recomienda enviar antes de 21:30. Se conservan tres roles humanos; no son subagentes.

## Próximos bloques de trabajo

| ID | Persona | Primer resultado comprobable | Depende de |
| --- | --- | --- | --- |
| B0 | B | Base local, reglas y contrato compartido; commit inicial en main | Ver README y docs/github-workflow.md |
| A1 | A | En 60 min: moodboard, gameplay PC/móvil, wireframes lobby/resultados, paleta y elementos | Brief A; no depende de backend |
| C1a | C | Bases dev/test, esquema y repositorios users/sessions | Contrato |
| B1 | B | Registro, login, me, logout y middleware de sesión | Interfaces de C1a; se puede empezar con repositorio inyectado |
| A2 | A | Canvas adaptable, HUD e inputs de mover/apuntar/disparar | Shared y dirección visual |
| C1b | C | URL pública de bootstrap y persistencia de resultados | Cuenta Render y base |
| B2 | B | Crear/entrar/listo/iniciar y socket autenticado entre dos usuarios | B1 + C1a |
| A3 | A | Lobby online, consumo de snapshots e interpolación; coordenadas DOM | B2 y formato compartido |
| B3 | B | Ronda completa autoritativa con proyectiles, sincronización y resultado | B2 + saveMatch de C |
| C2 | C | Seed 100/1000, agregados correctos y medición | Persistencia + MatchResult |
| B4 | B | Caducidad de input, reconexión, límites y limpieza | B3 |
| A4 | A | Móvil real, efectos, sonido y resultados pulidos | A3 + B3 |
| C3 | C coordina | 10 casos funcionales + 3 E2E en Actions | Cada caso avanza con su módulo |
| C4 | C coordina | Auditoría pública, documentación, URL y repo entregables | Integración completa |

## Primer punto de encuentro

Una hora después de empezar el bloque paralelo: A muestra dos composiciones, C entrega firmas/repositorios de sesión y B muestra avance de autenticación. Si un repositorio no está listo, mantener interfaz inyectada y acordar un plazo; no construir otra persistencia incompatible.

Integrar cambios pequeños cada 1-2 horas. No esperar a terminar toda una carpeta para cruzar información con el resto.

## Responsabilidad por pruebas

- B: 2 mapas + 2 daño/escalado + 1 autoridad.
- A: 2 interpolación.
- C: 2 payloads Zod + 1 telemetría/semilla.
- C coordina E2E; A y B corrigen su parte. Bootstrap contiene casos adicionales de contrato/frontera HTTP, no la suite funcional completa.

## Git y dependencias

El repositorio privado es https://github.com/JuanWick777/WeekendProject. El dueño publica el commit inicial, agrega a los colaboradores y garantiza acceso al evaluador. A: feat/client-shell. B: feat/auth. C: feat/storage. Después abrir ramas por tarea y PR hacia main. Los pasos completos están en github-workflow.md.

Los cambios en shared se coordinan con B. Los cambios en app.js para conectar routers y en package-lock se integran pronto para evitar conflictos largos. Una instalación por raíz; las credenciales .env se comparten por un canal privado.

## Criterio común de terminado

El cambio arranca desde una instalación limpia, pasa npm run verify, tiene comprobación concreta del comportamiento y actualiza el contrato si cambia. No dejar módulos simulados sin identificarlos. Al completar C3 también debe pasar verify:release y el workflow debe ejecutar E2E.

## Cortes de alcance

Antes de efectos adicionales: login -> lobby -> ronda -> resultado -> persistencia. Si ese ciclo no funciona el sábado por la noche, recortar contenido visual opcional. El domingo a las 18:00 se congelan funciones. Guardar margen para acceso público, móviles y entrega de las dos URL.
