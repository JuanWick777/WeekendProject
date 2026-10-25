import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { generateMap } from '../../src/game/maps/generate-map.js';
import { createMatch } from '../../src/game/match.js';

export function flatMap() {
  const map = generateMap(42);
  map.tiles = map.tiles.map((row, y) => row.map((_tile, x) => Number(y === 0 || x === 0 || y === map.rows - 1 || x === map.columns - 1)));
  return map;
}

export function testMatch(options = {}) {
  return createMatch({ matchId: 'test-match', roomCode: 'ABC123', startedAtMs: 1000,
    players: [{ id: 'a', displayName: 'A' }, { id: 'b', displayName: 'B' }], map: flatMap(), ...options });
}

export function driver(match) {
  let time = 0;
  const sequences = new Map();
  return {
    get time() { return time; },
    step(durationMs, inputs = {}) {
      const target = time + durationMs;
      while (time < target) {
        for (const player of match.getSnapshot().players) {
          const seq = (sequences.get(player.id) ?? -1) + 1; sequences.set(player.id, seq);
          match.acceptInput(player.id, { seq, moveX: 0, moveY: 0, aimX: 1, aimY: 0, attack: false, ...inputs[player.id] }, time);
        }
        time = Math.min(target, time + 50); match.advanceTo(time);
      }
    },
  };
}

export const idle = (seq = 0, overrides = {}) => ({ seq, moveX: 0, moveY: 0, aimX: 1, aimY: 0, attack: false, ...overrides });
export const playerState = (id, x, y, overrides = {}) => ({
  id, x, y, aimX: 1, aimY: 0, hp: GAME_CONFIG.player.maxHealth, alive: true,
  forfeited: false, shieldCharges: 0, nextShotUs: 0, kills: 0, deaths: 0,
  input: null, pendingInputs: [], ...overrides,
});
