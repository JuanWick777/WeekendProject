import { ARENA_TEMPLATE, createArenaTemplate } from './arena-template.js';
import { validateMap } from './validate-map.js';
import { createRandom } from '../random.js';
export { createRandom } from '../random.js';
export const GENERATOR_VERSION = 3;

// Authored variants are opt-in; ordinary rounds retain A's base layout.
export function generateMap(seed, { template, layout = 'reference', maxAttempts = 16,
  onFallback = (details) => console.warn('MAP_FALLBACK', details) } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4_294_967_295) throw new RangeError('Map seed must be uint32');
  if (!['reference', 'procedural'].includes(layout)) throw new RangeError('Unknown map layout');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 0) throw new RangeError('Invalid attempt limit');
  const random = createRandom(seed);
  function candidate(fallback) {
    const base = template ?? (fallback || layout === 'reference' ? ARENA_TEMPLATE
      : createArenaTemplate(['base', 'v2', 'v3'][Math.floor(random() * 3)]));
    return { ...structuredClone(base), seed, layout, generatorVersion: GENERATOR_VERSION };
  }
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const map = candidate(false);
    if (validateMap(map).valid) return map;
  }
  const map = candidate(true); const validation = validateMap(map);
  if (!validation.valid) throw new Error('Invalid map fallback: ' + validation.errors.join(', '));
  onFallback({ seed, templateId: map.templateId, reason: 'No valid candidate within attempt limit', attempts: maxAttempts });
  return map;
}
