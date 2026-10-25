import { createRandom } from './maps/generate-map.js';
import { GAME_CONFIG } from '@cybergrid/shared/constants';

export function createShieldPickups(map, rules, emit) {
  const initial = map.pickupSpawns.filter((point) => point.spawnKind === 'initial').map((point) => ({ ...point }));
  const pool = map.pickupSpawns.filter((point) => point.spawnKind === 'random');
  const random = createRandom((map.seed ^ 0x53484945) >>> 0);
  const intervalUs = rules.shieldSpawnIntervalMs * 1000;
  let nextSpawnUs = intervalUs;
  let active = null;
  let previousIndex = -1;

  return Object.freeze({
    advance(timeUs, players) {
      if (!active && pool.length && timeUs >= nextSpawnUs) {
        let index = Math.floor(random() * pool.length);
        if (pool.length > 1 && index === previousIndex) index = (index + 1) % pool.length;
        previousIndex = index;
        active = { ...pool[index] };
      }
      const collectors = [...players.values()].sort((a, b) => a.id.localeCompare(b.id));
      for (const pickup of [...initial, ...(active ? [active] : [])]) {
        const collector = collectors.find((player) => player.alive && !player.forfeited && player.shieldCharges === 0
          && Math.hypot(player.x - pickup.x, player.y - pickup.y) <= pickup.radius + GAME_CONFIG.player.radius);
        if (!collector) continue;
        collector.shieldCharges = 1;
        if (pickup === active) { active = null; nextSpawnUs = timeUs + intervalUs; }
        else initial.splice(initial.indexOf(pickup), 1);
        emit('shield:pickup', collector.id, null, pickup.x, pickup.y);
      }
    },
    nextBoundaryUs: () => !active && pool.length ? nextSpawnUs : Infinity,
    snapshot: () => [...initial, ...(active ? [active] : [])].map(({ id, type, x, y, radius }) => ({ id, type, x, y, radius })),
  });
}
