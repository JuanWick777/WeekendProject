import { screenToWorld } from '../game/viewport.js';

export function createControls(canvas, movePad, aimPad) {
  const abort = new AbortController(); const options = { signal: abort.signal };
  const keys = new Set(); const move = { x: 0, y: 0 }; const aim = { x: 1, y: 0 };
  const resetPointers = [];
  let mouse = null; let mouseAttack = false; let touchAttack = false;
  function clear() {
    keys.clear(); move.x = 0; move.y = 0; mouseAttack = false; touchAttack = false;
    for (const reset of resetPointers) reset();
    for (const pad of [movePad, aimPad]) { pad.dataset.active = 'false'; pad.querySelector('.stick').style.transform = ''; }
  }
  const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
  window.addEventListener('keydown', (event) => {
    if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName)) return;
    if (gameKeys.includes(event.code)) { event.preventDefault(); keys.add(event.code); }
  }, options);
  window.addEventListener('keyup', (event) => keys.delete(event.code), options);
  window.addEventListener('blur', clear, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); }, options);
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch') mouse = { x: event.clientX, y: event.clientY };
  }, options);
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    event.preventDefault(); canvas.focus(); mouse = { x: event.clientX, y: event.clientY }; mouseAttack = true;
    canvas.setPointerCapture(event.pointerId);
  }, options);
  window.addEventListener('pointerup', () => { mouseAttack = false; }, options);
  canvas.addEventListener('pointercancel', () => { mouseAttack = false; }, options);

  function bindPad(pad, firing) {
    let pointerId = null;
    resetPointers.push(() => { pointerId = null; });
    function update(event) {
      const rect = pad.getBoundingClientRect(); const radius = rect.width * 0.34;
      const dx = event.clientX - rect.left - rect.width / 2; const dy = event.clientY - rect.top - rect.height / 2;
      const divisor = Math.max(radius, Math.hypot(dx, dy)); const x = dx / divisor; const y = dy / divisor;
      pad.querySelector('.stick').style.transform = `translate(${x * radius}px, ${y * radius}px)`;
      if (firing) {
        touchAttack = true; mouse = null;
        if (Math.hypot(x, y) > 0.1) { const length = Math.hypot(x, y); aim.x = x / length; aim.y = y / length; }
      } else { move.x = x; move.y = y; }
    }
    pad.addEventListener('pointerdown', (event) => {
      if (pointerId !== null) return;
      event.preventDefault(); pointerId = event.pointerId; pad.setPointerCapture(pointerId); pad.dataset.active = 'true'; update(event);
    }, options);
    pad.addEventListener('pointermove', (event) => { if (pointerId === event.pointerId) update(event); }, options);
    const release = (event) => {
      if (pointerId !== event.pointerId) return;
      pointerId = null; pad.dataset.active = 'false'; pad.querySelector('.stick').style.transform = '';
      if (firing) touchAttack = false; else { move.x = 0; move.y = 0; }
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(name, release, options);
    window.addEventListener('blur', () => { pointerId = null; }, options);
  }
  bindPad(movePad, false); bindPad(aimPad, true);
  return {
    read(player, viewport) {
      if (mouse) {
        const rect = canvas.getBoundingClientRect();
        const target = screenToWorld(mouse.x - rect.left, mouse.y - rect.top, viewport);
        const dx = target.x - player.x; const dy = target.y - player.y; const length = Math.hypot(dx, dy);
        if (length > 0.1) { aim.x = dx / length; aim.y = dy / length; }
      }
      const horizontal = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      const vertical = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
      return { moveX: Math.max(-1, Math.min(1, horizontal + move.x)), moveY: Math.max(-1, Math.min(1, vertical + move.y)), aimX: aim.x, aimY: aim.y, attack: mouseAttack || touchAttack };
    },
    clear,
    destroy() { clear(); abort.abort(); },
  };
}
