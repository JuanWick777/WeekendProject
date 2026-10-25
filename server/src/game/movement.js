import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { circleHitsMap } from './collision.js';

export function movePlayer(player, input, dtSeconds, map) {
  const { radius, speed } = GAME_CONFIG.player;
  const magnitude = Math.max(1, Math.hypot(input.moveX, input.moveY));
  const dx = input.moveX / magnitude * speed * dtSeconds;
  const dy = input.moveY / magnitude * speed * dtSeconds;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (radius / 2)));
  for (let step = 0; step < steps; step += 1) {
    for (const [axis, delta] of [['x', dx / steps], ['y', dy / steps]]) {
      const original = player[axis];
      player[axis] = original + delta;
      if (!circleHitsMap(map, player.x, player.y, radius)) continue;
      let low = 0; let high = 1;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const fraction = (low + high) / 2;
        player[axis] = original + delta * fraction;
        if (circleHitsMap(map, player.x, player.y, radius)) high = fraction; else low = fraction;
      }
      player[axis] = original + delta * low;
    }
  }
}
