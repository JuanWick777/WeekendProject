import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { firstWallHit, segmentCircleHit } from './collision.js';

export function damageAtDistance(distance) {
  const { projectileRange, damageNear, damageFar } = GAME_CONFIG.weapon;
  if (!Number.isFinite(distance) || distance < 0 || distance > projectileRange) return 0;
  return Math.round(damageNear - (damageNear - damageFar) * distance / projectileRange);
}

export function fireProjectile(state, player, fromUs) {
  const { weapon } = GAME_CONFIG;
  if (fromUs < player.nextShotUs) return;
  player.nextShotUs = fromUs + weapon.cooldownMs * 1000;
  const id = state.matchId + ':p' + state.nextProjectileId++;
  state.projectiles.set(id, {
    id, ownerId: player.id, x: player.x, y: player.y,
    dirX: player.aimX, dirY: player.aimY, distance: 0,
  });
  state.emit('shot', player.id, null, player.x, player.y);
}

export function advanceProjectiles(state, dtSeconds, toUs) {
  const { weapon, player: playerConfig } = GAME_CONFIG;
  const targets = [...state.players.values()].sort((a, b) => a.id.localeCompare(b.id));
  for (const projectile of state.projectiles.values()) {
    const length = Math.min(weapon.projectileSpeed * dtSeconds, weapon.projectileRange - projectile.distance);
    if (length <= 0) { state.projectiles.delete(projectile.id); continue; }
    const dx = projectile.dirX * length; const dy = projectile.dirY * length;
    const wallT = firstWallHit(state.map, projectile.x, projectile.y, dx, dy, weapon.projectileRadius);
    let nearestT = wallT ?? Infinity; let victim = null;
    for (const player of targets) {
      if (!player.alive || player.forfeited || player.id === projectile.ownerId) continue;
      const t = segmentCircleHit(projectile.x, projectile.y, dx, dy, player.x, player.y, playerConfig.radius + weapon.projectileRadius);
      if (t !== null && t < nearestT - 1e-9) { nearestT = t; victim = player; }
    }
    const fraction = Number.isFinite(nearestT) ? nearestT : 1;
    projectile.x += dx * fraction; projectile.y += dy * fraction; projectile.distance += length * fraction;
    if (victim) {
      if (victim.shieldCharges > 0) {
        victim.shieldCharges -= 1;
        state.emit('shield:block', projectile.ownerId, victim.id, victim.x, victim.y);
      } else {
        victim.hp = Math.max(0, victim.hp - damageAtDistance(Math.min(projectile.distance, weapon.projectileRange)));
        state.emit('hit', projectile.ownerId, victim.id, victim.x, victim.y);
        if (victim.hp === 0) {
          victim.alive = false; victim.deaths += 1; victim.shieldCharges = 0;
          victim.respawnAtUs = toUs + state.rules.respawnMs * 1000;
          victim.input = null;
          victim.pendingInputs.length = 0;
          const attacker = state.players.get(projectile.ownerId);
          if (attacker) attacker.kills += 1;
          state.emit('death', projectile.ownerId, victim.id, victim.x, victim.y);
        }
      }
    }
    if (Number.isFinite(nearestT) || projectile.distance >= weapon.projectileRange - 1e-9) state.projectiles.delete(projectile.id);
  }
}
