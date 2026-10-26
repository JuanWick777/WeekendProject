import { ARENA_TEMPLATE } from './arena-template.js';
import { createProceduralArena } from './coverage.js';
import { validateMap } from './validate-map.js';
import { createRandom } from '../random.js';
export { createRandom } from '../random.js';
export const GENERATOR_VERSION = 4;

// Generate once on the server; clients receive this resolved geometry verbatim.
export function generateMap(seed, { template, layout = 'procedural', maxAttempts = 16,
  onFallback = (details) => console.warn('MAP_FALLBACK', details) } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4_294_967_295) throw new RangeError('Map seed must be uint32');
  if (!['reference', 'procedural'].includes(layout)) throw new RangeError('Unknown map layout');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 0) throw new RangeError('Invalid attempt limit');
  const random = createRandom(seed);
  function candidate(fallback, attempts) {
    const map = template || fallback || layout === 'reference'
      ? structuredClone(template ?? ARENA_TEMPLATE) : createProceduralArena(random);
    return { ...map, seed, layout, generatorVersion: GENERATOR_VERSION,
      generation: { ...map.generation, attempts, fallback } };
  }
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const map = candidate(false, attempt + 1);
    if (validateMap(map).valid) return map;
  }
  const map = candidate(true, maxAttempts); const validation = validateMap(map);
  if (!validation.valid) throw new Error('Invalid map fallback: ' + validation.errors.join(', '));
  onFallback({ seed, templateId: map.templateId, reason: 'No valid candidate within attempt limit', attempts: maxAttempts });
  return map;
}
