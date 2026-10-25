import { GAME_CONFIG } from '@cybergrid/shared/constants';

const { columns, rows, tileSize } = GAME_CONFIG.world;
const tiles = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, col) =>
  Number(row === 0 || col === 0 || row === rows - 1 || col === columns - 1)));
const rect = (col, row, width = 1, height = 1) => Array.from({ length: height }, (_, y) =>
  Array.from({ length: width }, (_, x) => [col + x, row + y])).flat();
const mirror = (points, flipX, flipY) => points.map(([col, row]) => [flipX ? columns - 1 - col : col, flipY ? rows - 1 - row : row]);
const obstacleGroups = [];

// Four spawn bays have independent horizontal and vertical exits, 64 units wide.
for (const flipX of [false, true]) for (const flipY of [false, true]) {
  const fixed = [
    ...rect(1, 7, 2), ...rect(7, 1, 1, 2),
    ...rect(10, 1, 3), ...rect(12, 2, 2), ...rect(13, 3),
    ...rect(2, 16, 1, 4),
    // Segmented ring surrounding the center, outside all control circles.
    ...rect(17, 14, 3), ...rect(17, 15, 1, 2),
  ];
  for (const [col, row] of mirror(fixed, flipX, flipY)) tiles[row][col] = 1;
  const suffix = (flipY ? 's' : 'n') + (flipX ? 'e' : 'w');
  const groups = [
    { id: 'outer-elbow', variants: [
      [...rect(11, 11, 3), ...rect(11, 12, 1, 2)],
      [...rect(11, 11, 1, 3), ...rect(12, 13, 2)],
    ] },
    { id: 'inner-elbow', variants: [
      [...rect(18, 11, 2), ...rect(19, 12)],
      [...rect(18, 11), ...rect(18, 12, 2)],
    ] },
    { id: 'node-pillar', variants: [[], rect(16, 5, 1, 3)] },
    { id: 'center-pillar', variants: [[], rect(19, 17, 1, 2)] },
    { id: 'side-cover', variants: [[], rect(14, 17, 2)] },
  ];
  for (const group of groups) obstacleGroups.push({
    id: group.id + '-' + suffix,
    variants: group.variants.map((points) => mirror(points, flipX, flipY)),
  });
}
// Optional horizontal cover between the central and north/south nodes.
for (const flipY of [false, true]) obstacleGroups.push({
  id: 'axial-cover-' + (flipY ? 'south' : 'north'),
  variants: [[], mirror(rect(22, 14, 4), false, flipY)],
});

const protectedTiles = [];
for (let row = 1; row < rows - 1; row += 1) for (let col = 1; col < columns - 1; col += 1) {
  if (([9, 19, 20, 30].includes(row) && col >= 4 && col <= 43)
    || ([8, 39].includes(col) && row >= 8 && row <= 31)) protectedTiles.push([col, row]);
}
const pickup = (id, x, y, spawnKind) => ({ id, type: 'shield', x, y, radius: GAME_CONFIG.match.pickupRadius, spawnKind });

export const ARENA_TEMPLATE = {
  templateId: 'cardinal-sketch', templateVersion: 2, columns, rows, tileSize,
  tiles, protectedTiles, obstacleGroups,
  nodes: [
    { id: 'center', x: 384, y: 320, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'north', x: 384, y: 128, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'east', x: 640, y: 320, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'south', x: 384, y: 512, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'west', x: 128, y: 320, radius: GAME_CONFIG.match.nodeRadius },
  ],
  spawnPoints: [
    { id: 'spawn-nw', x: 64, y: 64 }, { id: 'spawn-se', x: 704, y: 576 },
    { id: 'spawn-ne', x: 704, y: 64 }, { id: 'spawn-sw', x: 64, y: 576 },
  ],
  pickupSpawns: [
    pickup('R1', 160, 112, 'initial'), pickup('R3', 608, 112, 'initial'),
    pickup('R10', 160, 528, 'initial'), pickup('R12', 608, 528, 'initial'),
    pickup('R2', 384, 208, 'random'), pickup('R4', 224, 240, 'random'),
    pickup('R5', 544, 240, 'random'), pickup('R8', 224, 400, 'random'),
    pickup('R9', 544, 400, 'random'), pickup('R11', 384, 432, 'random'),
  ],
};
