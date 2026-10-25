import { describe, expect, it, vi } from 'vitest';
import { createShieldPickups } from '../src/game/shield-pickups.js';
import { generateMap } from '../src/game/maps/generate-map.js';
import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { playerState } from './helpers/simulation-fixture.js';

function setup(seed = 42) {
  const map = generateMap(seed); const emit = vi.fn();
  return { map, emit, pickups: createShieldPickups(map, GAME_CONFIG.match, emit), players: new Map() };
}

describe('escudos iniciales y aparición única aleatoria', () => {
  it('ofrece cuatro iniciales, los consume una sola vez y no caduca la carga', () => {
    const s = setup(); const point = s.pickups.snapshot()[0];
    expect(s.pickups.snapshot().map((p) => p.id).sort()).toEqual(['R1', 'R10', 'R12', 'R3']);
    const player = playerState('a', point.x, point.y); s.players.set('a', player);
    s.pickups.advance(0, s.players); s.pickups.advance(60_000_000, s.players);
    expect(player.shieldCharges).toBe(1);
    expect(s.pickups.snapshot().some((p) => p.id === point.id)).toBe(false);
    expect(s.emit).toHaveBeenCalledTimes(1);
  });
  it('aparece a 15 s y mantiene solo un aleatorio disponible sin acumularlos', () => {
    const s = setup();
    s.pickups.advance(14_999_999, s.players); expect(s.pickups.snapshot()).toHaveLength(4);
    s.pickups.advance(15_000_000, s.players); const first = s.pickups.snapshot();
    expect(first).toHaveLength(5);
    s.pickups.advance(90_000_000, s.players); expect(s.pickups.snapshot()).toEqual(first);
  });
  it('espera otros 15 s después de recogerlo y reproduce la selección por semilla', () => {
    const a = setup(); const b = setup();
    for (const s of [a, b]) s.pickups.advance(15_000_000, s.players);
    expect(a.pickups.snapshot()).toEqual(b.pickups.snapshot());
    const point = a.pickups.snapshot().find((p) => a.map.pickupSpawns.find((spawn) => spawn.id === p.id).spawnKind === 'random');
    a.players.set('a', playerState('a', point.x, point.y));
    a.pickups.advance(16_000_000, a.players); expect(a.pickups.snapshot()).toHaveLength(4);
    a.pickups.advance(30_999_999, a.players); expect(a.pickups.snapshot()).toHaveLength(4);
    a.pickups.advance(31_000_000, a.players); expect(a.pickups.snapshot()).toHaveLength(5);
    expect(a.pickups.snapshot().some((p) => p.id === point.id)).toBe(false);
  });
  it('no consume una recogida con inventario lleno y resuelve empates por id', () => {
    const s = setup(); const point = s.pickups.snapshot()[0];
    const b = playerState('b', point.x, point.y, { shieldCharges: 1 });
    s.players.set('b', b); s.pickups.advance(0, s.players);
    expect(s.pickups.snapshot()).toHaveLength(4);
    b.shieldCharges = 0; s.players.set('a', playerState('a', point.x, point.y));
    s.pickups.advance(1000, s.players);
    expect(s.players.get('a').shieldCharges).toBe(1); expect(b.shieldCharges).toBe(0);
    expect(s.pickups.snapshot()).toHaveLength(3);
  });
});
