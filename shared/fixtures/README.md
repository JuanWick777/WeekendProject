# Fixture v5 para A y C

rotating-control.json contiene fixture: true, matchStart y matchEnd según docs/contracts.md. El inicio se genera con generateMap/createMatch reales y el resultado ejecutando esa misma ronda sin inputs. Ambos son **datos sintéticos de ejemplo**, nunca source=live.

La muestra usa a-industrial v5, generador v3, protocolo 5; mundo 1448 × 1088 y plano original 1448 × 1086 sin estirar. Colisión segments-v1, nodos center/north/east/south/west con radio 64. Ver docs/maps.md y docs/a1-integration.md.

Sirve para desarrollar presentación aislada, marcada como fixture. No acredita una partida online, guardado ni generación procedural completa. La práctica local ejecuta el motor en lugar de modificar este ejemplo.
