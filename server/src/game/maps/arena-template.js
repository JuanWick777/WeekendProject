import { GAME_CONFIG } from '@cybergrid/shared/constants';

// Working geometry from the team's sketch, pending A's final layout/playtesting.
const { columns, rows, tileSize } = GAME_CONFIG.world;
const tiles = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, col) =>
  Number(row === 0 || col === 0 || row === rows - 1 || col === columns - 1)));
for (const [col, row] of [[9, 5], [14, 5], [9, 10], [14, 10]]) tiles[row][col] = 1;

const protectedTiles = [];
for (let row = 1; row < rows - 1; row += 1) {
  for (let col = 1; col < columns - 1; col += 1) {
    if ([7, 8, 1, 2, 13, 14].includes(row) || [11, 12, 1, 2, 21, 22].includes(col)) protectedTiles.push([col, row]);
  }
}

export const ARENA_TEMPLATE = {
  templateId: 'cardinal-sketch', templateVersion: 1, columns, rows, tileSize,
  tiles, protectedTiles,
  nodes: [
    { id: 'center', x: 384, y: 256, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'north', x: 384, y: 96, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'east', x: 640, y: 256, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'south', x: 384, y: 416, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'west', x: 128, y: 256, radius: GAME_CONFIG.match.nodeRadius },
  ],
  spawnPoints: [
    { id: 'spawn-nw', x: 64, y: 64 }, { id: 'spawn-se', x: 704, y: 448 },
    { id: 'spawn-ne', x: 704, y: 64 }, { id: 'spawn-sw', x: 64, y: 448 },
  ],
  pickupSpawns: [
    { id: 'shield-nw', type: 'shield', x: 256, y: 96, radius: GAME_CONFIG.match.pickupRadius },
    { id: 'shield-se', type: 'shield', x: 512, y: 416, radius: GAME_CONFIG.match.pickupRadius },
  ],
  obstacleGroups: [
    { id: 'nw', variants: [[[7, 4], [7, 5]], [[6, 5], [7, 5]]] },
    { id: 'ne', variants: [[[16, 4], [16, 5]], [[16, 5], [17, 5]]] },
    { id: 'se', variants: [[[16, 10], [16, 11]], [[16, 10], [17, 10]]] },
    { id: 'sw', variants: [[[7, 10], [7, 11]], [[6, 10], [7, 10]]] },
  ],
};
