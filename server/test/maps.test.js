import { describe, expect, it } from 'vitest';
import { generateMap } from '../src/game/maps/generate-map.js';
import { ARENA_TEMPLATE } from '../src/game/maps/arena-template.js';
import { validateMap } from '../src/game/maps/validate-map.js';
import { firstWallHit } from '@cybergrid/shared/collision';

describe('mapas procedurales', () => {
  it('reproduce una semilla/versión sin mutar plantilla ni compartir tiles entre rondas', () => {
    const template = JSON.stringify(ARENA_TEMPLATE);
    const first = generateMap(0); const other = generateMap(0);
    expect(first).toEqual(other);
    first.tiles[2][2] = 1;
    expect(other.tiles[2][2]).toBe(0);
    expect(JSON.stringify(ARENA_TEMPLATE)).toBe(template);
  });

  it('mantiene rutas, radios y dos accesos por nodo en 64 semillas con variación real', () => {
    const variants = new Set(); let fallbacks = 0;
    for (let seed = 0; seed < 64; seed += 1) {
      const map = generateMap(seed, { onFallback: () => { fallbacks += 1; } });
      expect(validateMap(map, ARENA_TEMPLATE)).toEqual({ valid: true, errors: [] });
      for (const point of map.spawnPoints) {
        const dx = point.x < 384 ? 96 : -96; const dy = point.y < 320 ? 96 : -96;
        expect(firstWallHit(map, point.x, point.y, dx, 0, 10)).toBeNull();
        expect(firstWallHit(map, point.x, point.y, 0, dy, 10)).toBeNull();
      }
      variants.add(JSON.stringify(map.tiles));
    }
    expect(variants.size).toBeGreaterThan(1);
    expect(fallbacks).toBe(0);
  });

  it('usa un fallback válido y rechaza semillas inválidas y geometría intransitable', () => {
    const fallback = [];
    expect(validateMap(generateMap(42, { maxAttempts: 0, onFallback: (event) => fallback.push(event) })).valid).toBe(true);
    expect(fallback).toHaveLength(1);
    for (const seed of [-1, NaN, 0.1, 2 ** 32]) expect(() => generateMap(seed)).toThrow();
    const blocked = generateMap(42);
    for (let row = 1; row < blocked.rows - 1; row += 1) blocked.tiles[row][blocked.columns / 2] = 1;
    expect(validateMap(blocked).valid).toBe(false);
  });

  it('conserva la cobertura del plano en los extremos abierto/cerrado y su unión', () => {
    const baseline = ARENA_TEMPLATE.tiles.flat().filter(Boolean).length;
    expect(baseline).toBeGreaterThanOrEqual(370);
    for (const strategy of ['shortest', 'longest', 'union']) {
      const map = structuredClone(ARENA_TEMPLATE);
      for (const group of map.obstacleGroups) {
        const sorted = [...group.variants].sort((a, b) => a.length - b.length);
        const points = strategy === 'union' ? sorted.flat() : strategy === 'shortest' ? sorted[0] : sorted.at(-1);
        for (const [col, row] of points) map.tiles[row][col] = 1;
      }
      expect(validateMap(map, ARENA_TEMPLATE)).toEqual({ valid: true, errors: [] });
    }
  });
});
