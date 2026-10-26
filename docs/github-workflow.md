# Cómo trabajaremos en GitHub

Repositorio privado: https://github.com/JuanWick777/WeekendProject

El bootstrap ya está en main y A/C ya aceptaron las invitaciones. Cada persona trabaja con su propia cuenta; no compartir contraseñas ni tokens. El profesor necesitará acceso al repositorio si va a revisarlo; conservarlo privado no concede acceso por compartir únicamente la URL.

## Flujo acordado

main es la base integrada del equipo. Ya incorpora bootstrap, documentación v2, auth y salas/WebSocket (PR #1–#3). Los siguientes cambios entran por pull request.

Se crea una rama por tarea, no una rama permanente por persona:

| Persona | Primera rama | Trabajo |
| --- | --- | --- |
| A | feat/design-references | Diseño, referencias y revisión visual |
| B | feat/client-online | Cliente online sobre el servidor ya integrado |
| C | feat/storage | PostgreSQL y repositorios de usuarios/sesiones |

Tras integrar una tarea, crear otra rama desde main actualizado. Ejemplos siguientes: feat/lobbies, feat/telemetry y feat/client-network. No necesitamos una rama develop durante este fin de semana.

Los PR #1–#4 ya integran documentación, auth, salas/WebSocket y B3. El bloque de arena/vista de diseño parte de main en feat/arena-design. B asume la programación de client; A mantiene las referencias. Incorporar main actualizado antes de conectar cliente o persistencia.

**Push y merge son pasos distintos.** Push publica los commits de una rama en GitHub. El PR permite revisarlos; el merge incorpora el cambio a main. Tener una rama sincronizada y sin commits pendientes de push no significa que sus cambios ya estén en main. Un clon de main recibe solamente lo que se haya integrado allí.

## A y C: primera preparación

Si aún no tienen un checkout, cada persona clona el repositorio en su propia computadora:

~~~powershell
git clone https://github.com/JuanWick777/WeekendProject.git
cd WeekendProject
node --version
npm ci
~~~

Usar Node 24. Si GitHub solicita autenticación, iniciar sesión mediante el gestor de credenciales; no poner un token dentro de la URL.

A crea su primera rama:

~~~powershell
git switch -c feat/design-references
~~~

C crea su primera rama:

~~~powershell
git switch -c feat/storage
~~~

Ambos arrancan con npm run dev. El bootstrap no necesita base de datos; la aplicación completa sí. B ya tiene la carpeta GameWeekend como checkout: no debe clonar otro repositorio dentro de ella.

## Hacer cambios y compartirlos

Ejemplo de A; B y C usan sus archivos, mensaje y rama:

~~~powershell
git status
npm run verify
git add docs/visual-references
git commit -m "docs: add visual design references"
git push -u origin feat/design-references
~~~

Agregar solo los archivos de la tarea; revisar git status antes de confirmar. En los siguientes envíos de la misma rama basta git push. No subir node_modules, dist ni archivos .env.

En GitHub, abrir Pull requests > New pull request:

- Base: main.
- Compare: la rama de la tarea.
- Describir el comportamiento agregado y cómo se comprobó.
- Adjuntar capturas si cambia la presentación.
- Comprobar que Actions pase y que otra persona revise antes de integrar.

La base ejecuta lint, las pruebas existentes y build en cada PR. C ampliará el workflow con PostgreSQL y los tres E2E. Un check verde actual no significa que la rúbrica completa esté terminada.

Si está listo, el dueño o un colaborador integra mediante Squash and merge para tareas independientes, conservando un resumen claro. Para ramas encadenadas se puede usar un commit de merge que preserve sus dependencias. Después se puede eliminar la rama remota de esa tarea. No mezclar un cambio roto ni empujar directamente a main una nueva función.

## Traer cambios de los demás durante una tarea

Con los cambios propios guardados en un commit, y permaneciendo en tu rama:

~~~powershell
git fetch origin
git merge origin/main
npm run verify
git push
~~~

Si hay conflictos, resolver las secciones marcadas con la persona responsable, añadir los archivos resueltos y completar el commit de merge. No borrar el trabajo ajeno ni usar push --force para evitar un conflicto. Avisar al equipo si el contrato compartido necesita cambiar.

Hacer esta integración cada 1-2 horas o cuando cambie shared/, una interfaz de persistencia o el router principal. Un merge temprano es más pequeño que juntar tres días de cambios al final.

## Empezar la siguiente tarea

Primero asegurar que git status esté limpio. Después:

~~~powershell
git switch main
git pull --ff-only origin main
git switch -c feat/nombre-de-la-siguiente-tarea
~~~

No continuar desarrollando sobre una rama que ya se integró por squash.

## Propiedad y coordinación

- A: docs/visual-references/ y revisión visual. B asume la programación de client/.
- B: shared/ y server/src/auth, rooms, net y game.
- C: server/src/storage, telemetry, scripts, tests/e2e y configuración global de pruebas/despliegue.
- app.js, package.json y package-lock.json requieren aviso porque pueden cambiar en varias tareas.
- C acuerda con B las interfaces de users/sessions antes de implementarlas.
- Los diseños se pueden compartir desde el primer momento; el cliente integrado debe consumir el mismo contrato de docs/contracts.md.

## Acciones iniciales del dueño

1. Mantener el acuerdo de PR, comprobaciones y una revisión de otra persona antes de integrar.
2. Compartir los cambios de contratos y revisar los primeros PR pronto.
3. Revisar Actions del commit que se va a integrar; el bootstrap verde no acredita la suite completa.
4. Dar al evaluador el acceso necesario antes de entregar URL pública y repositorio.

Este documento fija el acuerdo del equipo. No presupone que existan reglas automáticas de protección de ramas configuradas en GitHub.

Referencia: https://docs.github.com/en/get-started/using-github/github-flow
