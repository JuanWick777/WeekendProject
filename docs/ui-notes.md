# Revisión de referencias de menú — pendiente de implementar

Se revisaron MainMenuCG, MatchMenuCG, RoomCG, HowToPlayCG y ResultsCG, entregadas por A en la carpeta local `docs/visual-references/ui/`. Esta etapa solo analiza las pantallas; no las incorpora al cliente ni añade esas cinco imágenes al commit del mapa. Mantener la paleta Industrial Tech, placas oscuras, marco cian, tipografía y jerarquía visual de A.

## Ajustes antes de programar

| Referencia | Conservar | Ajustar al contrato real |
| --- | --- | --- |
| MainMenuCG | Logo, fondo industrial, Jugar y Cómo jugar | Falta diseño de registro/login y estado de sesión. En navegador, Salir debe cerrar sesión o volver a la pantalla correspondiente; no prometer cerrar la pestaña. |
| MatchMenuCG | Crear/unirse, separación clara de las dos acciones | Código de seis caracteres A–Z/0–9; nombre de sala requerido por la API, validación, carga y errores. Mostrar quién tiene sesión iniciada. |
| RoomCG | Cuatro plazas, código copiable, indicadores Listo | La muestra K7P4 tiene cuatro caracteres; usar seis. Identificar anfitrión, permitir Listo/cancelar Listo y mostrar Iniciar solo al host. Exigir 2–4 personas listas y conectadas; countdown de 3 s y estados de desconexión. |
| HowToPlayCG | Cinco nodos, uno activo, 1 punto/s, disputa, rotación 30 s, aviso 5 s y ronda 150 s | PC apunta con ratón. Móvil usa pad derecho para apuntar y disparar al arrastrar; ambos pads funcionan simultáneamente. Aclarar escudo de un impacto sin caducidad, recogidas 15 s, respawn 3 s y desempates. “Por separado” debe significar direcciones independientes, sin impedir movimiento y disparo simultáneos. |
| ResultsCG | Ganador destacado y tabla de puntos/bajas/muertes | Usar resultado del servidor y contemplar empate, abandono y ronda abortada. Señalar guardado pendiente/fallido. Nueva partida vuelve al lobby y limpia Listo mediante revancha del host; no inicia otra ronda unilateralmente. Distinguir su función de Volver al lobby. |

No usar nombres o estadísticas de las láminas como datos reales. Las cuatro apariencias comparten atributos. No añadir habilidades ni escudos con duración. Mostrar los mismos datos en PC y móvil; solo los controles táctiles cambian. El cliente conserva autoridad del servidor para posiciones, daño, puntos y resultados.

## Orden posterior

1. A completa autenticación y confirma estados de carga/error, anfitrión y empate.
2. B construye navegación y pantallas funcionales contra las rutas de auth/salas y WebSocket existentes.
3. C corrige y entrega users/sessions y matches.saveMatch; B integra PostgreSQL sin persistencia alternativa.
4. Integrar resultado, revancha, reconexión y estados de guardado; comprobar dos cuentas y móvil real.

No se implementa nada de este recorrido en el cambio de arena fija v4. Ver [contrato](contracts.md), [tareas](tasks.md) y [práctica local](client-preview.md).
