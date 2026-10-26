import { describe, expect, it, vi } from 'vitest';
import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { advanceProjectiles, damageAtDistance, fireProjectile } from '../src/game/combat.js';
import { flatMap, playerState } from './helpers/simulation-fixture.js';

function state(targetOptions = {}) {
  return { matchId: 'combat', map: flatMap(), rules: GAME_CONFIG.match,
    players: new Map([['a', playerState('a', 64, 256)], ['b', playerState('b', 200, 256, targetOptions)]]),
    projectiles: new Map(), nextProjectileId: 0, emit: vi.fn() };
}

describe('daño y proyectiles autoritativos', () => {
  it('escala el daño de 30 a 20 usando distancia recorrida, con redondeo', () => {
    expect([0, 80, 160, 240, 320].map(damageAtDistance)).toEqual([30, 28, 25, 23, 20]);
  });
  it('no daña fuera de alcance ni acepta distancias no válidas', () => {
    for (const distance of [-1, 321, Infinity, NaN]) expect(damageAtDistance(distance)).toBe(0);
  });
  it('respeta 350 ms de enfriamiento y no golpea al dueño', () => {
    const s = state(); const owner = s.players.get('a');
    fireProjectile(s, owner, 0); fireProjectile(s, owner, 349999); fireProjectile(s, owner, 350000);
    expect(s.projectiles.size).toBe(2);
    s.players.get('b').x = 500;
    advanceProjectiles(s, 1, 1_000_000);
    expect(owner.hp).toBe(100); expect(s.players.get('b').hp).toBe(100); expect(s.projectiles.size).toBe(0);
  });
  it('detecta el primer impacto por segmento aunque el destino esté más allá del rival', () => {
    const s = state(); s.players.set('c', playerState('c', 260, 256));
    fireProjectile(s, s.players.get('a'), 0); advanceProjectiles(s, 0.5, 500000);
    expect(s.players.get('b').hp).toBe(100 - damageAtDistance(123));
    expect(s.players.get('c').hp).toBe(100); expect(s.projectiles.size).toBe(0);
  });
  it('las paredes bloquean a un rival situado detrás y consumen el proyectil', () => {
    const s = state(); s.map.tiles[256 / s.map.tileSize][128 / s.map.tileSize] = 1;
    fireProjectile(s, s.players.get('a'), 0); advanceProjectiles(s, 0.5, 500000);
    expect(s.players.get('b').hp).toBe(100); expect(s.projectiles.size).toBe(0);
  });
  it('el escudo absorbe exactamente un impacto y después se aplica daño', () => {
    const s = state({ shieldCharges: 1 });
    fireProjectile(s, s.players.get('a'), 0); advanceProjectiles(s, 0.5, 500000);
    expect(s.players.get('b')).toMatchObject({ hp: 100, shieldCharges: 0 });
    fireProjectile(s, s.players.get('a'), 350000); advanceProjectiles(s, 0.5, 850000);
    expect(s.players.get('b').hp).toBeLessThan(100);
  });
  it('una muerte se atribuye una sola vez y programa respawn sin dejar escudo', () => {
    const s = state({ hp: 1 });
    fireProjectile(s, s.players.get('a'), 0); advanceProjectiles(s, 0.5, 500000); advanceProjectiles(s, 0.5, 1000000);
    expect(s.players.get('a').kills).toBe(1);
    expect(s.players.get('b')).toMatchObject({ hp: 0, alive: false, deaths: 1, shieldCharges: 0, respawnAtUs: 3500000 });
  });
});
