import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { generateMap } from '@cybergrid/shared/maps';
import { createMatch } from '@cybergrid/shared/simulation';

// Development adapter only. The online server executes this same createMatch.
export function createPracticeSession({ seed = 42, mode = 'round' } = {}) {
  const map = generateMap(seed);
  if (!['round', 'combat'].includes(mode)) throw new RangeError('Invalid practice mode');
  if (mode === 'combat') {
    // A local drill near R1/R12. Online spawns remain in the four corners.
    const start = map.pickupSpawns.find((p) => p.id === 'R1');
    const end = map.pickupSpawns.find((p) => p.id === 'R12');
    const positions = [[start.x, start.y], [start.x + 64, start.y], [end.x - 64, end.y], [end.x, end.y]];
    map.spawnPoints.forEach((point, index) => { [point.x, point.y] = positions[index]; });
  }
  const players = Array.from({ length: 4 }, (_, index) => ({ id: 'local-' + index, displayName: 'P' + (index + 1) }));
  const match = createMatch({ matchId: 'local-practice', roomCode: 'LOCAL1', startedAtMs: 0, players, map });
  const sequences = players.map(() => 0);
  const interval = 1000 / GAME_CONFIG.network.inputRate;
  let elapsed = 0; let nextInputAt = 0; let selected = 0;
  const idle = (player) => ({ moveX: 0, moveY: 0, aimX: player.aimX, aimY: player.aimY, attack: false });
  function clear() {
    for (const player of players) match.setConnected(player.id, true, true);
  }
  return {
    map,
    get selected() { return selected; },
    get snapshot() { return match.getSnapshot(); },
    get result() { return match.getResult(); },
    select(index) {
      if (!Number.isInteger(index) || !players[index]) throw new RangeError('Invalid local player');
      clear(); selected = index;
    },
    clear,
    advance(durationMs, input) {
      if (!Number.isFinite(durationMs) || durationMs < 0) throw new RangeError('Invalid local elapsed time');
      const target = Math.min(elapsed + durationMs, GAME_CONFIG.match.durationMs);
      while (nextInputAt < target && !match.getResult()) {
        match.advanceTo(nextInputAt);
        match.getSnapshot().players.forEach((player, index) => {
          match.acceptInput(player.id, { ...idle(player), ...(index === selected ? input : {}), seq: sequences[index]++ }, nextInputAt);
        });
        nextInputAt += interval;
      }
      elapsed = target; match.advanceTo(elapsed);
      return match.drainEvents();
    },
  };
}
