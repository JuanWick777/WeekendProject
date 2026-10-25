import fixture from '@cybergrid/shared/fixtures/rotating-control';
import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { movePlayer } from '@cybergrid/shared/movement';
import { firstWallHit } from '@cybergrid/shared/collision';
import { createRenderer, drawDrone } from '../game/renderer.js';
import { createControls } from '../input/controls.js';
import { PILOTS, NODE_NAMES } from '../game/palette.js';

// This module is imported only by Vite development builds. It never authenticates,
// sends results, awards points, or replaces the online server.
export function startArenaPreview() {
  const { map } = fixture.matchStart; const state = structuredClone(fixture.matchStart.state);
  const canvas = document.querySelector('#game'); const renderer = createRenderer(canvas, map);
  const controls = createControls(canvas, document.querySelector('#move-pad'), document.querySelector('#aim-pad'));
  const coarse = window.matchMedia('(pointer: coarse)');
  let selected = 0; let zoom = coarse.matches ? 2 : 1;
  let running = true; let lastTime = null; let nextShotAt = 0; let projectiles = []; let projectileId = 0;
  let frameId; let frameCount = 0; let measuredAt = 0;
  const abort = new AbortController(); const options = { signal: abort.signal };

  document.querySelector('#preview-tools').hidden = false;
  document.querySelector('#design-label').textContent = 'VISTA DE DISEÑO · MOVIMIENTO LOCAL · SIN PARTIDA ONLINE';
  document.querySelector('#arena-spec').textContent = `${map.columns * map.tileSize} × ${map.rows * map.tileSize} · semilla ${map.seed} · plantilla v${map.templateVersion}`;
  const roster = document.querySelector('#roster');
  state.players.forEach((player, index) => {
    const pilot = PILOTS[index]; const card = document.createElement('button'); card.type = 'button';
    card.className = 'pilot-card'; card.style.setProperty('--pilot-color', pilot.color); card.dataset.index = index;
    card.setAttribute('aria-label', 'Revisar ' + pilot.name);
    const icon = document.createElement('canvas'); icon.width = 44; icon.height = 44; icon.setAttribute('aria-hidden', 'true');
    drawDrone(icon.getContext('2d'), { ...player, x: 20, y: 24 }, index, false, false);
    const text = document.createElement('span'); text.className = 'pilot-info';
    const name = document.createElement('strong'); name.textContent = 'P' + (index + 1);
    const score = document.createElement('span'); score.className = 'pilot-score'; score.textContent = '0 pts';
    const health = document.createElement('span'); health.className = 'health-bar'; health.setAttribute('aria-label', 'Vida 100 de 100');
    const fill = document.createElement('span'); health.append(fill); text.append(name, score, health); card.append(icon, text); roster.append(card);
    card.addEventListener('click', () => { selected = index; controls.clear(); updateSelection(); canvas.focus(); }, options);
  });
  function updateSelection() {
    for (const card of roster.children) card.setAttribute('aria-pressed', String(Number(card.dataset.index) === selected));
    document.querySelector('#pilot-name').textContent = PILOTS[selected].name;
  }
  updateSelection();
  document.querySelector('#camera-mode').value = zoom === 1 ? 'map' : 'follow';
  document.querySelector('#camera-mode').addEventListener('change', (event) => { zoom = event.target.value === 'map' ? 1 : 2; }, options);
  document.querySelector('#control-mode').addEventListener('change', (event) => {
    document.body.dataset.controls = event.target.value; controls.clear();
  }, options);
  document.querySelector('#node-preview').addEventListener('change', (event) => {
    const index = map.nodes.findIndex((node) => node.id === event.target.value);
    state.objective.activeNodeId = map.nodes[index].id; state.objective.rotationIndex = index;
    state.objective.nextNodeId = null; state.objective.status = 'empty'; state.objective.controllerId = null;
    state.serverTimeMs = fixture.matchStart.state.serverTimeMs + index * 30000;
    state.objective.changesAtMs = state.serverTimeMs + 30000;
    state.remainingMs = 150000 - index * 30000; updateHud();
  }, options);
  document.querySelector('#reset-preview').addEventListener('click', () => {
    state.players.forEach((player, index) => Object.assign(player, fixture.matchStart.state.players[index]));
    projectiles = []; controls.clear(); canvas.focus();
  }, options);
  function updateHud() {
    const seconds = state.remainingMs / 1000;
    document.querySelector('#round-time').textContent = Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + (seconds % 60).toString().padStart(2, '0');
    document.querySelector('#active-node').textContent = NODE_NAMES[state.objective.activeNodeId];
    document.querySelector('#rotation-time').textContent = '00:30';
  }
  updateHud();
  function frame(time) {
    if (!running) return;
    const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.05); lastTime = time;
    const player = state.players[selected]; const input = controls.read(player, renderer.viewport);
    movePlayer(player, input, dt, map); player.aimX = input.aimX; player.aimY = input.aimY;
    if (input.attack && time >= nextShotAt) {
      nextShotAt = time + GAME_CONFIG.weapon.cooldownMs;
      projectiles.push({ id: projectileId++, x: player.x, y: player.y, dirX: input.aimX, dirY: input.aimY, distance: 0, color: PILOTS[selected].color });
    }
    projectiles = projectiles.filter((projectile) => {
      const length = Math.min(GAME_CONFIG.weapon.projectileSpeed * dt, GAME_CONFIG.weapon.projectileRange - projectile.distance);
      const dx = projectile.dirX * length; const dy = projectile.dirY * length;
      const wall = firstWallHit(map, projectile.x, projectile.y, dx, dy, GAME_CONFIG.weapon.projectileRadius);
      projectile.x += dx; projectile.y += dy; projectile.distance += length;
      return wall === null && projectile.distance < GAME_CONFIG.weapon.projectileRange;
    });
    renderer.draw(state, { localId: player.id, time, zoom, projectiles,
      grid: document.querySelector('#show-grid').checked, collisions: document.querySelector('#show-collisions').checked });
    const diagnostic = document.querySelector('#preview-player-state');
    diagnostic.dataset.playerX = player.x; diagnostic.dataset.playerY = player.y;
    diagnostic.textContent = `P${selected + 1} · x ${player.x.toFixed(1)} · y ${player.y.toFixed(1)}`;
    frameCount += 1;
    if (time - measuredAt >= 1000) { document.querySelector('#fps').textContent = Math.round(frameCount * 1000 / (time - measuredAt)) + ' FPS'; frameCount = 0; measuredAt = time; }
    frameId = requestAnimationFrame(frame);
  }
  const suspend = () => { lastTime = null; controls.clear(); };
  document.addEventListener('visibilitychange', suspend, options); window.addEventListener('blur', suspend, options);
  const close = () => { running = false; cancelAnimationFrame(frameId); controls.destroy(); abort.abort(); };
  window.addEventListener('pagehide', close, { ...options, once: true });
  frameId = requestAnimationFrame(frame);
  return close;
}
