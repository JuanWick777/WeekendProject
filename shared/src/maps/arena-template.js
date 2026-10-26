import { GAME_CONFIG } from '../constants.js';
import { circleHitsMap } from '../collision.js';
import design from './a-design.json' with { type: 'json' };
import { resetWallGeometry } from '../wall-geometry.js';

// Rebuild tools' occupancy from the same resolved walls used by physics and art.
export function rebuildMapTiles(map) {
  resetWallGeometry(map);
  const { columns, rows, tileSize } = map;
  map.tiles = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, col) =>
    Number(row === 0 || col === 0 || row === rows - 1 || col === columns - 1
      || circleHitsMap(map, (col + .5) * tileSize, (row + .5) * tileSize, .001))));
  return map;
}

export function createArenaTemplate(variantId = 'base') {
  const variant = design.variants.find((entry) => entry.id === variantId);
  if (!variant) throw new RangeError('Unknown A map variant');
  const { columns, rows, tileSize } = GAME_CONFIG.world;
  const nodeIds = ['N3', 'N1', 'N4', 'N5', 'N2'];
  const spawnIds = ['S1', 'S4', 'S2', 'S3'];
  const map = {
    templateId: 'a-industrial', templateVersion: 5, variantId,
    collisionModel: 'segments-v1', columns, rows, tileSize,
    designWidth: design.width, designHeight: design.height,
    outline: structuredClone(design.outline), outlineThickness: 18,
    wallPaths: variant.walls.map((wall, index) => ({
      id: 'wall-' + index, category: wall.type, thickness: 22, endPadding: 4,
      points: [[wall.x1, wall.y1], [wall.x2, wall.y2]],
    })),
    nodes: nodeIds.map((authorId, index) => ({ ...design.nodes.find((n) => n.id === authorId),
      id: GAME_CONFIG.match.nodeOrder[index], authorId, radius: GAME_CONFIG.match.nodeRadius })),
    spawnPoints: spawnIds.map((authorId, index) => ({ ...design.spawns.find((s) => s.id === authorId),
      id: ['nw', 'se', 'ne', 'sw'][index], authorId })),
    pickupSpawns: design.shields.map((point) => ({ ...point, type: 'shield',
      spawnKind: point.type, radius: GAME_CONFIG.match.pickupRadius })),
    protectedRoutes: [],
  };
  // Coarse occupancy for tools only; diagonal metal faces keep continuous colliders.
  return rebuildMapTiles(map);
}

export const ARENA_TEMPLATE = createArenaTemplate();
