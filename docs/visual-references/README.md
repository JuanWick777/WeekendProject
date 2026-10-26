# Referencias de diseño de A

Imágenes entregadas por el equipo para orientar distribución, colores, personajes, efectos y HUD. Son referencias, no instrucciones que sustituyan las reglas del juego. B programa el cliente y el mapa; A diseña y revisa.

| Archivo | Uso |
| --- | --- |
| [arena-sketch-v1.png](arena-sketch-v1.png) | Primer boceto cardinal |
| [CleanImageCG.jpeg](maps/CleanImageCG.jpeg) | Distribución limpia de paredes/nodos |
| [MapCG.jpeg](maps/MapCG.jpeg) | Categorías de pared y ubicaciones de escudos |
| [TecnicalAdjustmenCG.jpeg](maps/TecnicalAdjustmenCG.jpeg) | Guía histórica de coordenadas y radios |
| [UnitsCG.jpeg](maps/UnitsCG.jpeg) | Referencia de espacios y accesos |
| [WallsCG.jpeg](maps/WallsCG.jpeg) | Apariencia metálica y luces |
| [CharactersCG.jpeg](characters/CharactersCG.jpeg) | Cuatro siluetas y colores rojo/amarillo/violeta/verde |
| [RedCG.jpeg](characters/RedCG.jpeg) | Lámina detallada del hexagonal rojo y sus giros |
| [YellowCG.jpeg](characters/YellowCG.jpeg) | Blindado amarillo, franjas y módulos laterales |
| [PurpleCG.jpeg](characters/PurpleCG.jpeg) | Esférico violeta con anillos/pods |
| [GreenCG.jpeg](characters/GreenCG.jpeg) | Romboidal verde, marco y módulos en flecha |
| [escudoCG.jpeg](effects/escudoCG.jpeg) | Pedestal, recogida y desaparición |
| [ColorsCG.jpeg](ui/ColorsCG.jpeg) | Paleta Industrial Tech |
| [MobileUICG.jpeg](ui/MobileUICG.jpeg) | Composición del HUD común, con controles solo en móvil |

## Correcciones acordadas

- Todos los personajes tienen los mismos atributos e hitbox, sin habilidades.
- El escudo absorbe un impacto, no vence por tiempo y admite una carga.
- Cuatro recogidas iniciales aparecen una vez; después hay un aleatorio a la vez, con cadencia 15 s según contrato.
- Solo un nodo está activo; todos tienen radio 64.
- FFA individual: las menciones a equipos son errores de las imágenes.
- Mundo vigente 1280 × 1120, cuadrícula 160 × 140 de 8; las dimensiones antiguas se conservan únicamente como referencia.
- Las curvas/diagonales se adaptan a tiles. Ahora se usa el trazado fijo de referencia; las variaciones se posponen hasta terminar pantallas.

Los cinco menús nuevos de la carpeta local ui solo se analizaron; no se incorporan al cliente ni al commit de esta etapa. Ver [revisión de pantallas](../ui-notes.md).

Las imágenes originales se conservan sin edición. El cliente dibuja sus propios elementos Canvas; no usa estas láminas como una imagen plana de la arena. Ver [mapa](../maps.md) y [vista de diseño](../client-preview.md).
