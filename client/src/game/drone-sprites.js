import { PILOTS } from './palette.js';

const sprites = new Map();
const TAU = Math.PI * 2;
function path(c, points) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
}
function polygon(c, radius, sides, phase = -Math.PI / 2) {
  path(c, Array.from({ length: sides }, (_, i) => [Math.cos(phase + i * TAU / sides) * radius, Math.sin(phase + i * TAU / sides) * radius]));
}
function disc(c, radius, fill, stroke = '#101a23') {
  c.beginPath(); c.arc(0, 0, radius, 0, TAU); c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.stroke();
}
function metal(c, x, y, width, height) {
  const gradient = c.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, '#e1ebf0'); gradient.addColorStop(.2, '#879eae'); gradient.addColorStop(.5, '#354a59'); gradient.addColorStop(1, '#15232e');
  c.fillStyle = gradient; c.fillRect(x, y, width, height); c.strokeStyle = '#080f16'; c.lineWidth = 1.4; c.strokeRect(x, y, width, height);
}
function lamp(c, x, y, width, height, color) {
  c.save(); c.fillStyle = color; c.shadowColor = color; c.shadowBlur = 5; c.fillRect(x, y, width, height);
  c.shadowBlur = 0; c.fillStyle = '#ffffff99'; c.fillRect(x + 1, y + 1, Math.max(1, width - 2), 1); c.restore();
}
function shell(c, sides) {
  polygon(c, 21, sides); c.fillStyle = '#09141e'; c.fill(); c.strokeStyle = '#8fa4b2'; c.lineWidth = 1; c.stroke();
  for (let i = 0; i < sides; i += 1) {
    const a = -Math.PI / 2 + (i + .07) * TAU / sides; const b = -Math.PI / 2 + (i + .93) * TAU / sides;
    path(c, [[Math.cos(a) * 21, Math.sin(a) * 21], [Math.cos(b) * 21, Math.sin(b) * 21],
      [Math.cos(b) * 15, Math.sin(b) * 15], [Math.cos(a) * 15, Math.sin(a) * 15]]);
    const gradient = c.createLinearGradient(-14, -21, 18, 21);
    gradient.addColorStop(0, '#e0e9ef'); gradient.addColorStop(.4, '#8b9ba9'); gradient.addColorStop(.55, '#475d6f'); gradient.addColorStop(1, '#233341');
    c.fillStyle = gradient; c.fill(); c.strokeStyle = '#10202e'; c.lineWidth = .8; c.stroke();
  }
}

// Recreated as cached Canvas sprites from A's four rotation sheets. No JPEG
// background/captions enter the game. Facing is continuous, skins are cosmetic.
function createSprite(index) {
  const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 160;
  const c = canvas.getContext('2d'); c.scale(2, 2); c.translate(40, 40);
  const color = PILOTS[index].color;
  c.lineWidth = 1;
  if (index === 0) {
    for (const side of [-1, 1]) {
      c.save(); c.translate(side * 15, 17); c.rotate(-side * .55);
      metal(c, -3, -2, 6, 13); lamp(c, -2, 2, 4, 9, color); c.restore();
    }
    shell(c, 6); polygon(c, 13, 6); c.fillStyle = '#210e18'; c.fill();
    c.strokeStyle = color; c.lineWidth = 1.8; c.stroke();
    c.shadowColor = color; c.shadowBlur = 8; disc(c, 6, color, '#ffb3c0'); c.shadowBlur = 0;
  } else if (index === 1) {
    for (const side of [-1, 1]) { metal(c, side * 24 - 4, -7, 8, 14); lamp(c, side * 24 - 2, -5, 4, 10, color); }
    shell(c, 8); lamp(c, -13, -6, 26, 3, color); lamp(c, -13, 3, 26, 3, color);
    disc(c, 8, '#392b13'); c.shadowColor = color; c.shadowBlur = 8; disc(c, 5.5, color, '#fff2a7'); c.shadowBlur = 0;
  } else if (index === 2) {
    for (const side of [-1, 1]) {
      metal(c, side * 24 - 4, -6, 8, 12); lamp(c, side * 24 - 2, -4, 4, 8, color);
      c.save(); c.translate(side * 13, 21); disc(c, 5, '#8b7ca2'); disc(c, 3, color, '#e8caff'); c.restore();
    }
    disc(c, 21, '#9299b0'); disc(c, 18, '#2a2a42'); disc(c, 14, '#111324', '#a591b7');
    c.strokeStyle = '#d4cce2'; c.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) { c.beginPath(); c.arc(0, 0, 19.5, i * TAU / 6 + .08, (i + 1) * TAU / 6 - .18); c.stroke(); }
    const glow = c.createRadialGradient(-2, -3, 1, 0, 0, 11); glow.addColorStop(0, '#efcaff'); glow.addColorStop(.5, color); glow.addColorStop(1, '#321745');
    c.shadowColor = color; c.shadowBlur = 7; disc(c, 10, glow, '#c385e9'); c.shadowBlur = 0;
  } else {
    for (const side of [-1, 1]) {
      path(c, [[side * 19, -6], [side * 30, 0], [side * 19, 6]]); c.fillStyle = '#8ea6ab'; c.fill(); c.strokeStyle = '#162c32'; c.stroke();
      lamp(c, side < 0 ? -27 : 20, -1.5, 7, 3, color);
    }
    polygon(c, 23, 4); c.fillStyle = '#9fbbc0'; c.fill(); c.strokeStyle = '#152b33'; c.lineWidth = 2; c.stroke();
    polygon(c, 19, 4); c.fillStyle = '#29414c'; c.fill(); c.strokeStyle = '#617f88'; c.stroke();
    polygon(c, 14, 4); c.fillStyle = '#101f1c'; c.fill(); c.strokeStyle = '#9ebda3'; c.lineWidth = 1; c.stroke();
    c.shadowColor = color; c.shadowBlur = 9; polygon(c, 8, 4); c.fillStyle = color; c.fill(); c.strokeStyle = '#e6ffb5'; c.stroke(); c.shadowBlur = 0;
  }
  metal(c, -4.5, -32, 9, 15); lamp(c, -2.5, -29, 5, 10, color);
  return canvas;
}

export function drawSkin(context, player, index) {
  const skin = index % PILOTS.length;
  if (!sprites.has(skin)) sprites.set(skin, createSprite(skin));
  context.save(); context.translate(player.x, player.y);
  context.rotate(Math.atan2(player.aimY, player.aimX) + Math.PI / 2);
  context.drawImage(sprites.get(skin), -24, -24, 48, 48); context.restore();
}
