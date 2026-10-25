# Fixture v3 para A y C

[rotating-control.json](rotating-control.json) contiene `fixture: true`, un payload `matchStart` y otro `matchEnd`, según docs/contracts.md. Se puede usar en una escena local identificada como fixture para desarrollar mapa, HUD y resultados antes del servidor de juego.

Es una muestra estática de formato con cuatro jugadores. **No es un generador procedural, una partida online ni el mapa final de A.** Sus coordenadas, coberturas y tiempos son de demostración; nunca insertar este resultado como source=live ni conectar la escena al recorrido de producción como si fuera multijugador.

Los IDs de nodos se alinean con el boceto del equipo: center, north (A), east (B), south (C), west (D). Dimensiones de trabajo: 48 × 40, tile 16, mundo 768 × 640, radio de nodo 64. El boceto original y notas están en docs/visual-references y docs/maps.md.

Importación del ejemplo desde el workspace:

~~~js
import fixture from '@cybergrid/shared/fixtures/rotating-control' with { type: 'json' };

const { map, state } = fixture.matchStart;
// Usar únicamente en la escena de desarrollo marcada como fixture.
~~~

La práctica local de B genera una ronda con el motor compartido en lugar de modificar este fixture. C consulta MatchResult como ejemplo de forma. matchStart se regeneró desde generateMap/createMatch reales (plantilla v3); matchEnd conserva un resultado sintético de muestra; el ejemplo no se guarda como partida live. Mantener los cambios de este archivo coordinados con el contrato y las constantes compartidas.
