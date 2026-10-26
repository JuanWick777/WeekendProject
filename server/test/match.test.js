import { describe, expect, it } from 'vitest';
import { objectiveState } from '../src/game/objectives.js';
import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { driver, flatMap, idle, playerState, testMatch } from './helpers/simulation-fixture.js';

describe('movimiento, control y ciclo de partida', () => {
  it('mantiene velocidad con inputs a 20 Hz sin perder intervalos entre ticks', () => {
    const match = testMatch(); const d = driver(match);
    d.step(1000, { a: { moveX: 1 } });
    expect(match.getSnapshot().players[0].x).toBeCloseTo(224, 5);
    expect(match.getSnapshot().players[0].lastProcessedSeq).toBe(19);
  });
  it('normaliza diagonales, caduca inputs y rechaza posición/velocidad falsificadas', () => {
    const match = testMatch(); const d = driver(match);
    expect(() => match.acceptInput('a', idle(0, { x: 500 }), 0)).toThrow();
    expect(() => match.acceptInput('a', idle(0, { moveX: 2 }), 0)).toThrow();
    d.step(1000, { a: { moveX: 1, moveY: 1 } });
    const p = match.getSnapshot().players[0];
    expect(Math.hypot(p.x - 64, p.y - 64)).toBeCloseTo(160, 5);
    const expired = testMatch(); expired.acceptInput('a', idle(0, { moveX: 1 }), 0); expired.advanceTo(1000);
    expect(expired.getSnapshot().players[0].x).toBeCloseTo(104, 5);
  });
  it('no atraviesa paredes ni límites al mantener el movimiento', () => {
    const map = flatMap(); map.tiles[64 / map.tileSize][160 / map.tileSize] = 1;
    const match = testMatch({ map }); const d = driver(match);
    d.step(3000, { a: { moveX: 1 } });
    expect(match.getSnapshot().players[0].x).toBeCloseTo(150, 2);
    d.step(2000, { a: { moveY: -1 } });
    expect(match.getSnapshot().players[0].y).toBeCloseTo(map.tileSize + GAME_CONFIG.player.radius, 2);
  });
  it('distingue vacío, único ocupante y disputa; ignora muertos y abandonados', () => {
    const map = flatMap(); const players = new Map([['a', playerState('a', 384, 320)], ['b', playerState('b', 704, 448)]]);
    const read = () => objectiveState(map, players, 0, 1000, GAME_CONFIG.match);
    expect(read()).toMatchObject({ status: 'controlled', controllerId: 'a' });
    players.get('b').x = 384; players.get('b').y = 320;
    expect(read().status).toBe('contested');
    players.get('b').alive = false; expect(read().controllerId).toBe('a');
    players.get('a').forfeited = true; expect(read().status).toBe('empty');
  });
  it('conserva fracciones y detiene/reanuda puntos al disputar el mismo nodo', () => {
    const match = testMatch(); const d = driver(match);
    d.step(2000, { a: { moveX: 1 } }); d.step(1600, { a: { moveY: 1 } });
    const before = match.getSnapshot().players[0].controlTimeMs;
    d.step(600); d.step(400);
    expect(match.getSnapshot().players[0].controlTimeMs - before).toBe(1000);
    d.step(2000, { b: { moveX: -1 } }); d.step(1600, { b: { moveY: -1 } });
    expect(match.getSnapshot().objective.status).toBe('contested');
    const disputed = match.getSnapshot().players[0].controlTimeMs;
    d.step(1000); expect(match.getSnapshot().players[0].controlTimeMs).toBe(disputed);
    d.step(800, { b: { moveY: 1 } });
    const resumed = match.getSnapshot().players[0].controlTimeMs;
    d.step(1000); expect(match.getSnapshot().players[0].controlTimeMs - resumed).toBe(1000);
  });
  it('avisa y rota en los límites, mantiene el mapa y termina a 150 s sin prórroga', () => {
    const match = testMatch(); const map = match.getStartPayload().map;
    match.advanceTo(24999); expect(match.getSnapshot().objective.nextNodeId).toBeNull();
    match.advanceTo(25000); expect(match.getSnapshot().objective.nextNodeId).toBe('north');
    for (const [time, node] of [[30000, 'north'], [60000, 'east'], [90000, 'south'], [120000, 'west']]) {
      match.advanceTo(time); expect(match.getSnapshot().objective.activeNodeId).toBe(node);
    }
    match.advanceTo(149000); expect(match.getSnapshot().objective.nextNodeId).toBeNull();
    match.advanceTo(1_000_000);
    expect(match.getSnapshot().remainingMs).toBe(0); expect(match.getResult().durationMs).toBe(150000);
    expect(match.getStartPayload().map).toEqual(map);
    expect(match.getResult()).toMatchObject({ winnerId: null, drawPlayerIds: ['a', 'b'] });
  });
  it('recoge el escudo inicial una vez y conserva la carga sin caducidad', () => {
    const match = testMatch(); const d = driver(match);
    d.step(600, { a: { moveX: 1 } }); d.step(300, { a: { moveY: 1 } });
    expect(match.getSnapshot().players[0].shieldCharges).toBe(1);
    expect(match.getSnapshot().pickups.some((p) => p.id === 'R1')).toBe(false);
    d.step(20000);
    expect(match.getSnapshot().players[0].shieldCharges).toBe(1);
    expect(match.getSnapshot().pickups.some((p) => p.id === 'R1')).toBe(false);
  });
  it('mata y reaparece a los 3 s conservando estadísticas e invariantes de tiempos', () => {
    const match = testMatch(); const d = driver(match);
    d.step(2000, { a: { moveX: 1 }, b: { moveX: -1 } });
    d.step(1600, { a: { moveY: 1 }, b: { moveY: -1 } });
    d.step(1100, { a: { attack: true } });
    expect(match.getSnapshot().players[1]).toMatchObject({ alive: false, hp: 0, deaths: 1 });
    const points = match.getSnapshot().players[0].score;
    d.step(3000);
    expect(match.getSnapshot().players[1]).toMatchObject({ alive: true, hp: 100, deaths: 1 });
    expect(match.getSnapshot().players[0].score).toBeGreaterThanOrEqual(points);
    match.advanceTo(150000);
    const result = match.getResult();
    for (const p of result.players) {
      expect(p.controlTimeMs).toBeLessThanOrEqual(p.aliveMs); expect(p.aliveMs).toBeLessThanOrEqual(p.participatedMs);
      expect(p.participatedMs).toBeLessThanOrEqual(result.durationMs); expect(p.score).toBe(Math.floor(p.controlTimeMs / 1000));
    }
    expect(result.players.reduce((sum, p) => sum + p.controlTimeMs, 0)).toBeLessThanOrEqual(result.durationMs);
  });
  it('detiene al desconectado y recupera posición/vida con nueva secuencia', () => {
    const match = testMatch(); match.acceptInput('a', idle(50, { moveX: 1 }), 0); match.advanceTo(100);
    match.setConnected('a', false); const before = match.getSnapshot().players[0];
    match.advanceTo(1100); expect(match.getSnapshot().players[0].x).toBe(before.x);
    expect(match.acceptInput('a', idle(51), 1100)).toBe(false);
    match.setConnected('a', true, true); expect(match.acceptInput('a', idle(0, { moveX: 1 }), 1100)).toBe(true);
    match.advanceTo(1200); expect(match.getSnapshot().players[0].x).toBeGreaterThan(before.x);
    expect(match.getSnapshot().players[0].hp).toBe(before.hp);
  });
  it('resuelve abandono y partida vacía una sola vez, sin victoria para abandonados', () => {
    const match = testMatch(); match.advanceTo(1000); match.forfeit('a'); match.advanceTo(1034);
    expect(match.getResult()).toMatchObject({ finishReason: 'forfeit', winnerId: 'b' });
    const first = match.getResult(); match.forfeit('b'); match.advanceTo(150000); expect(match.getResult()).toEqual(first);
    const empty = testMatch(); empty.forfeit('a'); empty.forfeit('b'); empty.advanceTo(34);
    expect(empty.getResult()).toMatchObject({ status: 'aborted', finishReason: 'empty', winnerId: null, drawPlayerIds: [] });
  });
});
