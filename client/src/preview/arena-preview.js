import { createPracticeSession } from './practice-session.js';
import { createRenderer, drawDrone } from '../game/renderer.js';
import { createControls } from '../input/controls.js';
import { PILOTS, NODE_NAMES } from '../game/palette.js';

const clock = (ms) => {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + (seconds % 60).toString().padStart(2, '0');
};

export function startArenaPreview() {
  const $ = (id) => document.getElementById(id);
  const canvas = $('game'); const roster = $('roster');
  const controls = createControls(canvas, $('move-pad'), $('aim-pad'));
  const abort = new AbortController(); const options = { signal: abort.signal };
  let session; let renderer; let effects = []; let zoom = window.matchMedia('(pointer: coarse)').matches ? 2 : 1;
  let running = true; let paused = false; let lastTime = null; let frameId; let frameCount = 0; let measuredAt = 0; let hudAt = 0;
  $('preview-tools').hidden = false;
  $('design-label').textContent = 'SIMULACIÓN LOCAL · SIN MULTIJUGADOR';
  function updateSelection() {
    for (const card of roster.children) card.setAttribute('aria-pressed', String(Number(card.dataset.index) === session.selected));
    $('pilot-name').textContent = PILOTS[session.selected].name;
  }
  function updateHud() {
    const state = session.snapshot; const player = state.players[session.selected];
    $('round-time').textContent = clock(state.remainingMs);
    $('active-node').textContent = NODE_NAMES[state.objective.activeNodeId];
    $('rotation-time').textContent = clock(state.objective.changesAtMs - state.serverTimeMs);
    $('shield-state').textContent = player.shieldCharges ? '◈ Escudo equipado · 1 impacto' : '◇ Sin escudo';
    $('local-health').textContent = player.alive ? `Vida ${player.hp}/100 · ${player.kills} bajas / ${player.deaths} muertes` : `Reaparece en ${(player.respawnRemainingMs / 1000).toFixed(1)} s`;
    $('game-status').textContent = session.result ? 'RONDA TERMINADA' : paused ? 'PAUSA LOCAL' : !player.alive ? `REAPARICIÓN · ${(player.respawnRemainingMs / 1000).toFixed(1)} s` :
      state.objective.status === 'controlled' ? `${state.players.find((p) => p.id === state.objective.controllerId).displayName} CONTROLA EL NODO` : state.objective.status === 'contested' ? 'NODO DISPUTADO · SIN PUNTOS' : 'ENTRA AL NODO ACTIVO PARA PUNTUAR';
    $('pause-preview').textContent = paused ? 'Continuar' : 'Pausar';
    state.players.forEach((p, index) => {
      const card = roster.children[index]; card.querySelector('.pilot-score').textContent = `${p.score} pts`;
      const health = card.querySelector('.health-bar'); health.firstElementChild.style.width = p.hp + '%';
      health.setAttribute('aria-label', `Vida ${p.hp} de 100`);
      card.querySelector('.pilot-detail').textContent = p.alive ? `${p.hp} HP${p.shieldCharges ? ' · ◈' : ''}` : `↻ ${(p.respawnRemainingMs / 1000).toFixed(1)} s`;
    });
    const diagnostic = $('preview-player-state');
    Object.assign(diagnostic.dataset, { playerX: player.x, playerY: player.y, hp: player.hp, shield: player.shieldCharges, alive: player.alive });
    diagnostic.textContent = `P${session.selected + 1} · x ${player.x.toFixed(1)} · y ${player.y.toFixed(1)} · ${player.hp} HP · escudo ${player.shieldCharges}`;
    const result = session.result; $('local-result').hidden = !result;
    if (result) {
      $('result-title').textContent = result.winnerId ? `${state.players.find((p) => p.id === result.winnerId).displayName} GANA` : 'EMPATE';
      $('result-scores').textContent = result.players.map((p) => `${p.displayName}: ${p.score} pts · ${p.kills} bajas · ${p.deaths} muertes`).join('\n');
    }
  }
  function reset() {
    const field = $('map-seed'); if (!field.reportValidity()) return;
    const selected = session?.selected ?? 0;
    session = createPracticeSession({ seed: Number(field.value), mode: $('practice-mode').value });
    session.select(selected); renderer = createRenderer(canvas, session.map);
    effects = []; controls.clear(); lastTime = null; paused = false;
    const { map } = session;
    $('arena-spec').textContent = `768 × 640 · semilla ${map.seed} · plantilla v${map.templateVersion}`;
    updateSelection(); updateHud(); canvas.focus();
  }
  PILOTS.forEach((pilot, index) => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'pilot-card';
    card.style.setProperty('--pilot-color', pilot.color); card.dataset.index = index;
    card.setAttribute('aria-label', 'Controlar P' + (index + 1) + ': ' + pilot.name);
    const icon = document.createElement('canvas'); icon.width = 88; icon.height = 88; icon.setAttribute('aria-hidden', 'true');
    const context = icon.getContext('2d'); context.scale(2, 2);
    drawDrone(context, { x: 22, y: 22, aimX: 0, aimY: -1, hp: 100 }, index, false, false);
    const info = document.createElement('span'); info.className = 'pilot-info';
    info.innerHTML = `<strong>P${index + 1}</strong><span class="pilot-score">0 pts</span><span class="health-bar" aria-label="Vida 100 de 100"><span></span></span><span class="pilot-detail">100 HP</span>`;
    card.append(icon, info); roster.append(card);
    card.addEventListener('click', () => { controls.clear(); session.select(index); updateSelection(); updateHud(); canvas.focus(); }, options);
  });
  $('camera-mode').value = zoom === 1 ? 'map' : 'follow';
  $('camera-mode').addEventListener('change', (event) => { zoom = event.target.value === 'map' ? 1 : 2; }, options);
  $('control-mode').addEventListener('change', (event) => { document.body.dataset.controls = event.target.value; controls.clear(); session.clear(); }, options);
  $('practice-mode').addEventListener('change', reset, options);
  for (const id of ['reset-preview', 'result-restart']) $(id).addEventListener('click', reset, options);
  $('pause-preview').addEventListener('click', () => { paused = !paused; controls.clear(); session.clear(); lastTime = null; updateHud(); }, options);
  function suspend() { paused = true; controls.clear(); session.clear(); lastTime = null; updateHud(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); }, options);
  window.addEventListener('blur', suspend, options);
  reset();
  function frame(time) {
    if (!running) return;
    const dt = lastTime === null ? 0 : Math.min(time - lastTime, 100); lastTime = time;
    const before = session.snapshot; const local = before.players[session.selected];
    if (!paused && !session.result) {
      const events = session.advance(dt, controls.read(local, renderer.viewport));
      for (const event of events) if (event.kind !== 'shot') effects.push({ ...event, bornAt: time });
    }
    effects = effects.filter((effect) => time - effect.bornAt < 800);
    renderer.draw(session.snapshot, { localId: local.id, time, zoom, effects,
      grid: $('show-grid').checked, collisions: $('show-collisions').checked });
    if (time >= hudAt) { updateHud(); hudAt = time + 100; }
    frameCount += 1;
    if (time - measuredAt >= 1000) { $('fps').textContent = Math.round(frameCount * 1000 / (time - measuredAt)) + ' FPS'; frameCount = 0; measuredAt = time; }
    frameId = requestAnimationFrame(frame);
  }
  const close = () => { running = false; cancelAnimationFrame(frameId); controls.destroy(); abort.abort(); roster.replaceChildren(); };
  window.addEventListener('pagehide', close, { ...options, once: true });
  frameId = requestAnimationFrame(frame);
  return close;
}
