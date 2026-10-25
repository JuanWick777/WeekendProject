import { describe, expect, it } from 'vitest';
import { generateMap } from '../src/game/maps/generate-map.js';
import { ARENA_TEMPLATE } from '../src/game/maps/arena-template.js';
import { validateMap } from '../src/game/maps/validate-map.js';

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
    for (let row = 1; row < 15; row += 1) blocked.tiles[row][12] = 1;
    expect(validateMap(blocked).valid).toBe(false);
  });
});
