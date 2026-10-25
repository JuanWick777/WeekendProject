import { PALETTE as P, PILOTS, NODE_NAMES } from './palette.js';
import { createViewport } from './viewport.js';

function polygon(context, radius, sides, angle = 0) {
  context.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const a = angle + index * Math.PI * 2 / sides;
    const x = Math.cos(a) * radius; const y = Math.sin(a) * radius;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.closePath();
}

export function drawDrone(context, player, index, local = false, labels = true) {
  const pilot = PILOTS[index % PILOTS.length];
  const { x, y } = player;
  context.save(); context.translate(x, y);
  if (local) {
    context.strokeStyle = '#ffffff99'; context.lineWidth = 0.8;
    context.setLineDash([2, 3]); context.beginPath(); context.arc(0, 0, 17, 0, Math.PI * 2); context.stroke(); context.setLineDash([]);
  }
  if (player.shieldCharges) {
    context.fillStyle = pilot.color + '16'; context.strokeStyle = pilot.color + 'aa'; context.lineWidth = 1.2;
    context.beginPath(); context.arc(0, 0, 19, 0, Math.PI * 2); context.fill(); context.stroke();
  }
  context.rotate(Math.atan2(player.aimY, player.aimX));
  context.shadowColor = '#000'; context.shadowBlur = 4; context.shadowOffsetY = 2;
  if (pilot.shape === 'circle') { context.beginPath(); context.arc(0, 0, 11, 0, Math.PI * 2); }
  else polygon(context, 12, pilot.shape === 'diamond' ? 4 : pilot.shape === 'hexagon' ? 6 : 8, Math.PI / 4);
  context.fillStyle = '#111a23'; context.strokeStyle = P.lightMetal; context.lineWidth = 2; context.fill(); context.stroke();
  context.shadowOffsetY = 0; context.shadowBlur = 0;
  context.fillStyle = '#111820'; context.strokeStyle = '#778d9c'; context.lineWidth = 1;
  context.fillRect(6, -3.5, 11, 7); context.strokeRect(6, -3.5, 11, 7);
  context.fillStyle = pilot.color; context.shadowColor = pilot.color; context.shadowBlur = 6;
  context.fillRect(10, -1.3, 7, 2.6);
  if (pilot.shape === 'circle') { context.beginPath(); context.arc(0, 0, 6, 0, Math.PI * 2); }
  else polygon(context, 7, pilot.shape === 'diamond' ? 4 : 6, Math.PI / 4);
  context.fillStyle = pilot.color + '35'; context.strokeStyle = pilot.color; context.lineWidth = 1; context.fill(); context.stroke();
  context.beginPath(); context.arc(0, 0, 3, 0, Math.PI * 2); context.fillStyle = pilot.color; context.fill();
  context.restore();
  if (!labels) return;
  context.save(); context.textAlign = 'center'; context.font = 'bold 9px system-ui';
  context.fillStyle = '#f6faff'; context.shadowColor = '#000'; context.shadowBlur = 3;
  context.fillText('P' + (index + 1), x, y - 24);
  context.shadowBlur = 0; context.fillStyle = '#080e14'; context.fillRect(x - 14, y - 20, 28, 4);
  context.fillStyle = '#a4f348'; context.fillRect(x - 13, y - 19, 26 * player.hp / 100, 2);
  context.restore();
}

function staticArena(map) {
  const layer = document.createElement('canvas'); const size = map.tileSize;
  layer.width = map.columns * size; layer.height = map.rows * size;
  const c = layer.getContext('2d');
  c.fillStyle = P.background; c.fillRect(0, 0, layer.width, layer.height);
  for (let row = 0; row < map.rows; row += 1) for (let col = 0; col < map.columns; col += 1) {
    if (map.tiles[row][col]) continue;
    const x = col * size; const y = row * size;
    const noise = ((col * 73 + row * 137 + map.seed) % 19);
    c.fillStyle = `rgb(${37 + noise / 3},${47 + noise / 3},${55 + noise / 3})`;
    c.fillRect(x, y, size, size);
    c.strokeStyle = '#111b2477'; c.lineWidth = 0.7; c.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    if (noise === 3) { c.strokeStyle = '#6e7b8733'; c.beginPath(); c.moveTo(x + 3, y + 3); c.lineTo(x + 8, y + 10); c.lineTo(x + 7, y + 15); c.stroke(); }
    if ((row + col) % 7 === 0) { c.fillStyle = '#80909b55'; c.fillRect(x + 2, y + 2, 1, 1); }
  }
  for (const [index, point] of map.spawnPoints.entries()) {
    c.fillStyle = '#101b2599'; c.fillRect(point.x - 25, point.y - 23, 50, 46);
    c.strokeStyle = '#5debff55'; c.lineWidth = 1; c.strokeRect(point.x - 25, point.y - 23, 50, 46);
    c.fillStyle = '#5debff44'; c.fillRect(point.x - 18, point.y + 14, 36, 3);
    c.fillStyle = '#c4d7e5'; c.font = 'bold 8px system-ui'; c.textAlign = 'center'; c.fillText('SPAWN ' + (index + 1), point.x, point.y - 29);
  }
  for (let row = 0; row < map.rows; row += 1) for (let col = 0; col < map.columns; col += 1) {
    if (!map.tiles[row][col]) continue;
    const x = col * size; const y = row * size;
    c.fillStyle = '#050a0f'; c.fillRect(x + 2, y + 3, size, size);
    const gradient = c.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, '#758590'); gradient.addColorStop(0.18, '#35434e'); gradient.addColorStop(0.7, '#202a33'); gradient.addColorStop(1, '#111922');
    c.fillStyle = gradient; c.fillRect(x, y, size, size);
    const above = map.tiles[row - 1]?.[col] === 1; const below = map.tiles[row + 1]?.[col] === 1;
    const left = map.tiles[row]?.[col - 1] === 1; const right = map.tiles[row]?.[col + 1] === 1;
    c.lineWidth = 1; c.strokeStyle = '#9babb6'; c.beginPath();
    if (!above) { c.moveTo(x + 1, y + 1); c.lineTo(x + size - 1, y + 1); }
    if (!left) { c.moveTo(x + 1, y + 1); c.lineTo(x + 1, y + size - 1); } c.stroke();
    c.strokeStyle = '#040a10'; c.beginPath();
    if (!below) { c.moveTo(x, y + size - 1); c.lineTo(x + size, y + size - 1); }
    if (!right) { c.moveTo(x + size - 1, y); c.lineTo(x + size - 1, y + size); } c.stroke();
    if ((row + col) % 3 === 0) {
      c.strokeStyle = (row + col) % 9 === 0 ? P.amber : P.cyan;
      c.shadowColor = c.strokeStyle; c.shadowBlur = 4; c.lineWidth = 1.7; c.beginPath();
      if (!above || !below) { c.moveTo(x + 4, y + size / 2); c.lineTo(x + size - 4, y + size / 2); }
      else if (!left || !right) { c.moveTo(x + size / 2, y + 4); c.lineTo(x + size / 2, y + size - 4); }
      c.stroke(); c.shadowBlur = 0;
    }
  }
  c.textAlign = 'center'; c.font = '600 12px system-ui'; c.fillStyle = '#a0b5c799';
  for (const node of map.nodes) c.fillText(NODE_NAMES[node.id], node.x, node.y - node.radius - 16);
  return layer;
}

function drawPickup(c, point, time) {
  c.save(); c.translate(point.x, point.y);
  c.fillStyle = '#0b141e'; c.strokeStyle = '#65818e'; c.lineWidth = 1;
  c.beginPath(); c.ellipse(0, 5, 12, 5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.strokeStyle = P.cyan + '99'; c.beginPath(); c.ellipse(0, 4, 15, 7, 0, 0, Math.PI * 2); c.stroke();
  c.translate(0, Math.sin(time / 400) * 1.5 - 2);
  c.shadowColor = P.cyan; c.shadowBlur = 7; c.fillStyle = '#5debff33'; c.strokeStyle = P.cyan; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(0, -10); c.lineTo(8, -7); c.lineTo(6, 1); c.lineTo(0, 6); c.lineTo(-6, 1); c.lineTo(-8, -7); c.closePath(); c.fill(); c.stroke(); c.restore();
}

export function createRenderer(canvas, map) {
  const context = canvas.getContext('2d'); const background = staticArena(map);
  let viewport = createViewport(1, 1, background.width, background.height);
  return {
    get viewport() { return viewport; },
    draw(state, { localId, time = 0, zoom = 1, grid = false, collisions = false, projectiles = [] } = {}) {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width); const height = Math.max(1, rect.height); const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * ratio); const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
      const local = state.players.find((player) => player.id === localId);
      viewport = createViewport(width, height, background.width, background.height, { zoom, focusX: local?.x, focusY: local?.y });
      context.setTransform(ratio, 0, 0, ratio, 0, 0); context.fillStyle = '#080f16'; context.fillRect(0, 0, width, height);
      context.translate(viewport.offsetX, viewport.offsetY); context.scale(viewport.scale, viewport.scale);
      context.drawImage(background, 0, 0);
      for (const node of map.nodes) {
        const active = state.objective.activeNodeId === node.id;
        const next = state.objective.nextNodeId === node.id;
        const color = active ? state.objective.status === 'contested' ? P.amber : P.cyan : next ? P.amber : '#72899b';
        context.save(); context.translate(node.x, node.y);
        const gradient = context.createRadialGradient(0, 0, 8, 0, 0, node.radius);
        gradient.addColorStop(0, active ? color + '22' : '#607b8c0a'); gradient.addColorStop(1, active ? color + '0d' : '#607b8c05');
        context.fillStyle = gradient; context.beginPath(); context.arc(0, 0, node.radius, 0, Math.PI * 2); context.fill();
        context.strokeStyle = color + (active || next ? 'dd' : '55'); context.lineWidth = active ? 1.8 : 1;
        context.setLineDash(active ? [] : [5, 5]); context.stroke(); context.setLineDash([]);
        if (active) { context.shadowColor = color; context.shadowBlur = 8; }
        context.beginPath(); context.arc(0, 0, 23, 0, Math.PI * 2); context.stroke();
        context.shadowBlur = 0; context.textAlign = 'center'; context.font = 'bold 10px system-ui'; context.fillStyle = color;
        context.fillText(active ? 'ACTIVO' : next ? 'PRÓXIMO' : 'NODO', 0, 4);
        if (active) {
          const fraction = Math.max(0, Math.min(1, (state.objective.changesAtMs - state.serverTimeMs) / 30000));
          context.strokeStyle = color; context.lineWidth = 3; context.beginPath(); context.arc(0, 0, node.radius + 5, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2); context.stroke();
        }
        context.restore();
      }
      for (const pickup of state.pickups) drawPickup(context, pickup, time);
      for (const projectile of projectiles) {
        context.save(); context.strokeStyle = projectile.color; context.shadowColor = projectile.color; context.shadowBlur = 5; context.lineWidth = 2;
        context.beginPath(); context.moveTo(projectile.x - projectile.dirX * 9, projectile.y - projectile.dirY * 9); context.lineTo(projectile.x, projectile.y); context.stroke(); context.restore();
      }
      state.players.forEach((player, index) => { if (player.alive && !player.forfeited) drawDrone(context, player, index, player.id === localId); });
      if (grid) {
        context.strokeStyle = '#8ee6ff33'; context.lineWidth = 0.5; context.beginPath();
        for (let x = 0; x <= background.width; x += map.tileSize) { context.moveTo(x, 0); context.lineTo(x, background.height); }
        for (let y = 0; y <= background.height; y += map.tileSize) { context.moveTo(0, y); context.lineTo(background.width, y); } context.stroke();
      }
      if (collisions) {
        context.strokeStyle = '#ff7788'; context.lineWidth = 0.6;
        map.tiles.forEach((row, y) => row.forEach((tile, x) => { if (tile) context.strokeRect(x * map.tileSize, y * map.tileSize, map.tileSize, map.tileSize); }));
        for (const player of state.players) { context.beginPath(); context.arc(player.x, player.y, 10, 0, Math.PI * 2); context.stroke(); }
      }
    },
  };
}
