import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { inputPayloadSchema } from '@cybergrid/shared/schemas';
import { validateMap } from './maps/validate-map.js';
import { movePlayer } from './movement.js';
import { objectiveState } from './objectives.js';
import { fireProjectile, advanceProjectiles } from './combat.js';
import { buildResult } from './results.js';
import { createShieldPickups } from './shield-pickups.js';

export function createMatch({ matchId, roomCode, startedAtMs, players, map, rules: overrides = {} }) {
  const rules = { ...GAME_CONFIG.match, ...overrides };
  if (!validateMap(map).valid || players.length < 2 || players.length > 4 || new Set(players.map((p) => p.id)).size !== players.length) throw new Error('Invalid match setup');
  if (!Number.isInteger(rules.durationMs) || rules.durationMs <= 0 || rules.durationMs !== rules.nodeDurationMs * map.nodes.length) throw new Error('Invalid round duration');
  if (!Number.isInteger(rules.shieldSpawnIntervalMs) || rules.shieldSpawnIntervalMs <= 0) throw new Error('Invalid shield interval');
  const events = [];
  let eventSequence = 0;
  let result = null;
  const state = {
    matchId, roomCode, startedAtMs, rules, map: structuredClone(map), tick: 0, elapsedUs: 0,
    projectiles: new Map(), nextProjectileId: 0,
    players: new Map(players.map((player, index) => [player.id, {
      id: player.id, displayName: player.displayName, x: map.spawnPoints[index].x, y: map.spawnPoints[index].y,
      aimX: 1, aimY: 0, hp: GAME_CONFIG.player.maxHealth, shieldCharges: 0,
      kills: 0, deaths: 0, alive: true, connected: true, forfeited: false,
      controlUs: 0, aliveUs: 0, participatedUs: 0, lastProcessedSeq: -1,
      input: null, pendingInputs: [], lastAcceptedSeq: -1, nextShotUs: 0, respawnAtUs: 0,
    }])),
    emit(kind, actorId, targetId, x, y) {
      events.push({ eventId: matchId + ':e' + eventSequence++, tick: state.tick + 1, kind, actorId, targetId, x, y });
    },
  };

  const shields = createShieldPickups(state.map, rules, state.emit);

  function respawnAt(timeUs) {
    for (const player of state.players.values()) {
      if (player.alive || player.forfeited || player.respawnAtUs > timeUs) continue;
      const enemies = [...state.players.values()].filter((other) => other.id !== player.id && other.alive && !other.forfeited);
      const candidates = state.map.spawnPoints.map((point, index) => ({
        ...point, index, distance: enemies.length ? Math.min(...enemies.map((enemy) => Math.hypot(point.x - enemy.x, point.y - enemy.y))) : Infinity,
      })).sort((a, b) => b.distance - a.distance || a.index - b.index);
      const point = candidates.find((candidate) => candidate.distance >= 2 * GAME_CONFIG.player.radius);
      if (!point) continue;
      player.x = point.x; player.y = point.y; player.hp = GAME_CONFIG.player.maxHealth;
      player.alive = true; player.shieldCharges = 0; player.nextShotUs = timeUs;
      state.emit('respawn', player.id, null, player.x, player.y);
    }
  }

  function segment(fromUs, toUs) {
    respawnAt(fromUs);
    const dtSeconds = (toUs - fromUs) / 1_000_000;
    const activeInputs = new Map();
    for (const player of state.players.values()) {
      if (player.forfeited) continue;
      player.participatedUs += toUs - fromUs;
      if (player.alive) player.aliveUs += toUs - fromUs;
      const input = player.input;
      if (!player.connected || !input || input.receivedUs > fromUs || input.expiresUs <= fromUs) continue;
      player.lastProcessedSeq = input.seq;
      const aimLength = Math.hypot(input.aimX, input.aimY);
      if (aimLength > 0.001) { player.aimX = input.aimX / aimLength; player.aimY = input.aimY / aimLength; }
      if (!player.alive) continue;
      activeInputs.set(player.id, input);
      movePlayer(player, input, dtSeconds, state.map);
    }
    shields.advance(toUs, state.players);
    for (const [id, input] of activeInputs) if (input.attack) fireProjectile(state, state.players.get(id), fromUs);
    advanceProjectiles(state, dtSeconds, toUs);
    const objective = objectiveState(state.map, state.players, fromUs, startedAtMs, rules);
    if (objective.controllerId) state.players.get(objective.controllerId).controlUs += toUs - fromUs;
  }

  function step(toUs) {
    let fromUs = state.elapsedUs;
    while (fromUs < toUs) {
      for (const player of state.players.values()) {
        while (player.pendingInputs.length && player.pendingInputs[0].receivedUs <= fromUs) {
          player.input = player.pendingInputs.shift();
          player.lastProcessedSeq = player.input.seq;
        }
      }
      let endUs = Math.min(toUs, (Math.floor(fromUs / (rules.nodeDurationMs * 1000)) + 1) * rules.nodeDurationMs * 1000);
      for (const player of state.players.values()) {
        const times = [player.respawnAtUs, player.pendingInputs[0]?.receivedUs, player.input?.expiresUs];
        if (player.input?.attack) times.push(player.nextShotUs);
        for (const time of times) if (time > fromUs) endUs = Math.min(endUs, time);
      }
      if (shields.nextBoundaryUs() > fromUs) endUs = Math.min(endUs, shields.nextBoundaryUs());
      segment(fromUs, endUs);
      fromUs = endUs; state.elapsedUs = endUs;
    }
    respawnAt(toUs);
    state.tick += 1;
  }

  function snapshot() {
    return {
      matchId, tick: state.tick, serverTimeMs: startedAtMs + state.elapsedUs / 1000,
      remainingMs: Math.max(0, rules.durationMs - state.elapsedUs / 1000),
      objective: objectiveState(state.map, state.players, state.elapsedUs, startedAtMs, rules),
      players: [...state.players.values()].map((player) => ({
        id: player.id, displayName: player.displayName, x: player.x, y: player.y, aimX: player.aimX, aimY: player.aimY,
        hp: player.hp, shieldCharges: player.shieldCharges, controlTimeMs: player.controlUs / 1000,
        score: Math.floor(player.controlUs / 1_000_000), kills: player.kills, deaths: player.deaths,
        alive: player.alive, connected: player.connected, forfeited: player.forfeited,
        respawnRemainingMs: player.alive || player.forfeited ? 0 : Math.max(0, (player.respawnAtUs - state.elapsedUs) / 1000),
        lastProcessedSeq: player.lastProcessedSeq,
      })),
      pickups: shields.snapshot(),
      projectiles: [...state.projectiles.values()].map(({ id, ownerId, x, y, dirX, dirY }) => ({ id, ownerId, x, y, dirX, dirY })),
    };
  }

  return Object.freeze({
    acceptInput(userId, payload, elapsedMs) {
      const input = inputPayloadSchema.parse(payload);
      const player = state.players.get(userId);
      if (result || !player || player.forfeited || !player.connected || input.seq <= player.lastAcceptedSeq) return false;
      if (!Number.isFinite(elapsedMs) || elapsedMs < state.elapsedUs / 1000 || elapsedMs >= rules.durationMs) return false;
      if (player.pendingInputs.length >= 64) return false;
      const receivedUs = Math.round(elapsedMs * 1000);
      player.pendingInputs.push({ ...input, receivedUs, expiresUs: receivedUs + GAME_CONFIG.network.inputTimeoutMs * 1000 });
      player.lastAcceptedSeq = input.seq;
      return true;
    },
    setConnected(userId, connected, resetSequence = false) {
      const player = state.players.get(userId);
      if (result || !player || player.forfeited) return;
      if (player.connected !== connected || resetSequence) { player.input = null; player.pendingInputs.length = 0; }
      player.connected = connected;
      if (resetSequence) { player.lastAcceptedSeq = -1; player.lastProcessedSeq = -1; }
    },
    forfeit(userId) {
      const player = state.players.get(userId);
      if (result || !player) return;
      player.forfeited = true; player.alive = false; player.input = null; player.pendingInputs.length = 0; player.shieldCharges = 0;
      for (const projectile of state.projectiles.values()) if (projectile.ownerId === userId) state.projectiles.delete(projectile.id);
    },
    advanceTo(elapsedMs) {
      if (result) return;
      if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Invalid server elapsed time');
      const eligible = [...state.players.values()].filter((player) => !player.forfeited);
      if (eligible.length <= 1) { result = buildResult(state, eligible.length ? 'forfeit' : 'empty'); return; }
      const targetUs = Math.min(Math.round(elapsedMs * 1000), rules.durationMs * 1000);
      let nextUs = Math.round((state.tick + 1) * 1_000_000 / GAME_CONFIG.network.tickRate);
      while (nextUs <= targetUs) { step(nextUs); nextUs = Math.round((state.tick + 1) * 1_000_000 / GAME_CONFIG.network.tickRate); }
      if (targetUs === rules.durationMs * 1000) {
        if (state.elapsedUs < targetUs) step(targetUs);
        result = buildResult(state, 'time');
      }
    },
    getSnapshot: snapshot,
    getResult: () => result ? structuredClone(result) : null,
    drainEvents: () => events.splice(0),
    getStartPayload() {
      return {
        matchId, map: structuredClone(state.map), endsAtMs: startedAtMs + rules.durationMs,
        config: {
          mode: rules.mode, durationMs: rules.durationMs, respawnMs: rules.respawnMs,
          nodeDurationMs: rules.nodeDurationMs, nodePreviewMs: rules.nodePreviewMs,
          scorePerSecond: rules.scorePerSecond, maxShieldCharges: GAME_CONFIG.player.maxShieldCharges, shieldSpawnIntervalMs: rules.shieldSpawnIntervalMs,
        }, state: snapshot(),
      };
    },
  });
}
