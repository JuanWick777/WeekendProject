# Cliente online y práctica local de desarrollo

La URL normal abre el menú online de A3. El circuito completo necesita C y el puente de servidor de B: registro/login, crear/unirse a sala, LISTO, inicio por el anfitrión, ronda y resultados.

Para revisar el mapa sin PostgreSQL: `npm run dev:client` y abrir http://127.0.0.1:5173/?practice=1. La práctica está identificada como local, no guarda resultados y solo está disponible en desarrollo.

- PC: WASD/flechas, ratón y clic mantenido.
- Táctil: dos pads simultáneos; el selector permite revisarlos en escritorio.
- P1–P4: elegir un único dron; el resto permanece quieto, sin bots.
- Mapa completo o cámara 2×, cuadrícula auxiliar y colisiones físicas originales.
- Práctica de combate: P1 en R1 (360,180), P2 (424,180), P3 (1036,860) y P4 en R12 (1100,860). Disparar con P2 hacia P1 comprueba escudo, daño y respawn.
- Reiniciar restaura ronda, recogidas y estadísticas; la práctica se pausa al cambiar de ventana.

Mapa 1448 × 1088, dibujo original 1448 × 1086 sin estirar; plantilla a-industrial v5, generador v3, protocolo 5. El terreno base continúa fijo. A2/A3 no cambian la geometría ni los atributos.

La práctica conserva el panel de revisión de B; el HUD y los efectos nuevos se revisan en la partida online. En online no se pausa el servidor al abrir el menú o cambiar de pestaña. Ver [A2](a2-visuals.md), [integración](a23-integration.md) y [E2E](../tests/e2e/README.md).
