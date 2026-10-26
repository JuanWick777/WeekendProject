import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { generateMap } from '../../src/game/maps/generate-map.js';
import { createMatch } from '../../src/game/match.js';

export function flatMap() {
  const map = generateMap(42);
  map.tiles = map.tiles.map((row, y) => row.map((_tile, x) => Number(y === 0 || x === 0 || y === map.rows - 1 || x === map.columns - 1)));
  // Stable calibration coordinates keep simulation tests independent of art.
  map.nodes = [
    {id:'center',x:384,y:320,radius:64},{id:'north',x:384,y:128,radius:64},
    {id:'east',x:640,y:320,radius:64},{id:'south',x:384,y:512,radius:64},{id:'west',x:128,y:320,radius:64},
  ];
  map.spawnPoints = [{id:'nw',x:64,y:64},{id:'se',x:704,y:576},{id:'ne',x:704,y:64},{id:'sw',x:64,y:576}];
  map.pickupSpawns[0].x=160; map.pickupSpawns[0].y=112;
  map.pickupSpawns = map.pickupSpawns.map((p,index) => index ? { ...p, x: 800+index*32, y: 160 } : p);
  map.collisionModel = 'tiles';
  delete map.wallPaths; delete map.outline; delete map.protectedRoutes;
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
