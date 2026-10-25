import { describe, expect, it } from 'vitest';
import { createPracticeSession } from '../src/preview/practice-session.js';
import { generateMap } from '@cybergrid/shared/maps';

const idle = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, attack: false };
describe('práctica local con motor canónico', () => {
  it('recoge, bloquea una bala, recibe daño, muere y reaparece sin escudo', () => {
    const session = createPracticeSession({ mode: 'combat' });
    expect(session.advance(50, idle).filter((e) => e.kind === 'shield:pickup')).toHaveLength(2);
    expect(session.snapshot.players[0].shieldCharges).toBe(1);
    expect(session.snapshot.pickups.map((p) => p.id)).toEqual(['R3', 'R10']);
    session.select(1);
    const attack = { ...idle, aimX: -1, attack: true };
    expect(session.advance(250, attack).some((e) => e.kind === 'shield:block')).toBe(true);
    expect(session.snapshot.players[0]).toMatchObject({ hp: 100, shieldCharges: 0 });
    session.advance(350, attack);
    expect(session.snapshot.players[0].hp).toBeLessThan(100);
    expect(session.advance(1100, attack).some((e) => e.kind === 'death')).toBe(true);
    expect(session.snapshot.players[0]).toMatchObject({ hp: 0, alive: false, deaths: 1 });
    expect(session.snapshot.players[1].kills).toBe(1);
    expect(session.advance(3100, idle).some((e) => e.kind === 'respawn')).toBe(true);
    expect(session.snapshot.players[0]).toMatchObject({ hp: 100, alive: true, shieldCharges: 0 });
  });

  it('produce el mismo combate con frames cortos o largos y detiene al dron anterior al cambiar', () => {
    const a = createPracticeSession({ mode: 'combat' }); const b = createPracticeSession({ mode: 'combat' });
    a.select(1); b.select(1); const attack = { ...idle, aimX: -1, attack: true };
    const eventsA = a.advance(2000, attack); const eventsB = [];
    for (let i = 0; i < 125; i += 1) eventsB.push(...b.advance(16, attack));
    expect(a.snapshot).toEqual(b.snapshot); expect(eventsA).toEqual(eventsB);
    const session = createPracticeSession();
    session.advance(150, { ...idle, moveY: 1 });
    session.select(1); const before = session.snapshot.players[0];
    session.advance(300, idle);
    expect(session.snapshot.players[0]).toMatchObject({ x: before.x, y: before.y });
  });

  it('rota los cinco nodos, cierra una ronda y no altera el mapa online', () => {
    const round = createPracticeSession(); const combat = createPracticeSession({ mode: 'combat' });
    expect(round.map).toEqual(generateMap(42)); expect(combat.map.spawnPoints).not.toEqual(round.map.spawnPoints);
    expect(combat.map.tiles).toEqual(round.map.tiles);
    for (const id of ['north', 'east', 'south', 'west']) {
      round.advance(30000, idle); expect(round.snapshot.objective.activeNodeId).toBe(id);
    }
    round.advance(30000, idle);
    expect(round.result).toMatchObject({ status: 'completed', durationMs: 150000, finishReason: 'time' });
    const result = round.result; round.advance(10000, idle); expect(round.result).toEqual(result);
    expect(() => createPracticeSession({ seed: -1 })).toThrow();
    expect(() => createPracticeSession({ mode: 'unknown' })).toThrow();
  });
});
