import { ARENA_TEMPLATE } from './arena-template.js';
import { validateMap } from './validate-map.js';

export const GENERATOR_VERSION = 2;

import { createRandom } from '../random.js';
export { createRandom } from '../random.js';

export function generateMap(seed, { template = ARENA_TEMPLATE, layout = 'reference', maxAttempts = 16, onFallback = (details) => console.warn('MAP_FALLBACK', details) } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4_294_967_295) throw new RangeError('Map seed must be uint32');
  if (!['reference', 'procedural'].includes(layout)) throw new RangeError('Unknown map layout');
  const random = createRandom(seed);
  function candidate(fallback) {
    const { templateId, templateVersion, columns, rows, tileSize, tiles, nodes, spawnPoints, pickupSpawns, wallPaths, outline, protectedRoutes } = structuredClone(template);
    for (const group of template.obstacleGroups) {
      const variant = group.variants[fallback || layout === 'reference' ? 0 : Math.floor(random() * group.variants.length)];
      if (!variant) throw new Error('Empty obstacle group');
      for (const [col, row] of variant) {
        if (!tiles[row] || col < 0 || col >= columns) throw new Error('Obstacle outside map');
        tiles[row][col] = 1;
      }
    }
    return { seed, layout, templateId, templateVersion, generatorVersion: GENERATOR_VERSION, columns, rows, tileSize, tiles, nodes, spawnPoints, pickupSpawns, wallPaths, outline, protectedRoutes };
  }
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const map = candidate(false);
    if (validateMap(map, template).valid) return map;
  }
  const map = candidate(true);
  const validation = validateMap(map, template);
  if (!validation.valid) throw new Error('Invalid map fallback: ' + validation.errors.join(', '));
  onFallback({ seed, templateId: map.templateId, reason: 'No valid candidate within attempt limit', attempts: maxAttempts });
  return map;
}
