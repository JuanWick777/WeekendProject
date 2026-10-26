import { insideOutline, wallGeometry, toWallLocal } from './wall-geometry.js';

const EPSILON = 1e-9;

export function circleTouchesRect(x, y, radius, left, top, right, bottom) {
  const nearestX = Math.max(left, Math.min(x, right));
  const nearestY = Math.max(top, Math.min(y, bottom));
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 < radius ** 2 - EPSILON;
}

export function circleHitsMap(map, x, y, radius) {
  if (![x, y, radius].every(Number.isFinite) || radius < 0) return true;
  const size = map.tileSize;
  if (x - radius < 0 || y - radius < 0 || x + radius > map.columns * size || y + radius > map.rows * size) return true;
  if (map.collisionModel === 'segments-v1') {
    if (!insideOutline(x, y, map.outline)) return true;
    for (const wall of wallGeometry(map).query(x - radius, y - radius, x + radius, y + radius)) {
      const [a, b] = toWallLocal(wall, x, y);
      if (circleTouchesRect(a, b, radius, wall.left, wall.top, wall.right, wall.bottom)) return true;
    }
    return false;
  }
  for (let row = Math.max(0, Math.floor((y - radius) / size)); row <= Math.min(map.rows - 1, Math.floor((y + radius) / size)); row += 1) {
    for (let col = Math.max(0, Math.floor((x - radius) / size)); col <= Math.min(map.columns - 1, Math.floor((x + radius) / size)); col += 1) {
      if (map.tiles[row][col] === 1 && circleTouchesRect(x, y, radius, col * size, row * size, (col + 1) * size, (row + 1) * size)) return true;
    }
  }
  return false;
}

export function segmentCircleHit(x, y, dx, dy, cx, cy, radius) {
  const ox = x - cx; const oy = y - cy;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (ox * dx + oy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= -EPSILON && t <= 1 + EPSILON ? Math.max(0, Math.min(1, t)) : null;
}

function segmentRectHit(x, y, dx, dy, left, top, right, bottom) {
  let enter = 0; let exit = 1;
  for (const [position, delta, min, max] of [[x, dx, left, right], [y, dy, top, bottom]]) {
    if (Math.abs(delta) < EPSILON) { if (position < min || position > max) return null; continue; }
    const first = (min - position) / delta; const last = (max - position) / delta;
    enter = Math.max(enter, Math.min(first, last)); exit = Math.min(exit, Math.max(first, last));
    if (enter > exit) return null;
  }
  return enter;
}

function roundedRectHit(x, y, dx, dy, radius, wall) {
  const { left, top, right, bottom } = wall;
  const candidates = [
    segmentRectHit(x, y, dx, dy, left - radius, top, right + radius, bottom),
    segmentRectHit(x, y, dx, dy, left, top - radius, right, bottom + radius),
    ...[[left, top], [right, top], [left, bottom], [right, bottom]]
      .map(([cx, cy]) => segmentCircleHit(x, y, dx, dy, cx, cy, radius)),
  ].filter((value) => value !== null);
  return candidates.length ? Math.min(...candidates) : null;
}

export function firstWallHit(map, x, y, dx, dy, radius) {
  if (map.collisionModel === 'segments-v1') {
    if (circleHitsMap(map, x, y, radius)) return 0;
    let earliest = null;
    const candidates = wallGeometry(map).query(Math.min(x, x + dx) - radius, Math.min(y, y + dy) - radius,
      Math.max(x, x + dx) + radius, Math.max(y, y + dy) + radius);
    for (const wall of candidates) {
      const [a, b] = toWallLocal(wall, x, y);
      const hit = roundedRectHit(a, b, dx * wall.ux + dy * wall.uy, -dx * wall.uy + dy * wall.ux, radius, wall);
      if (hit !== null && (earliest === null || hit < earliest)) earliest = hit;
    }
    return earliest;
  }
  let earliest = null;
  const size = map.tileSize;
  const minCol = Math.max(0, Math.floor((Math.min(x, x + dx) - radius) / size));
  const maxCol = Math.min(map.columns - 1, Math.floor((Math.max(x, x + dx) + radius) / size));
  const minRow = Math.max(0, Math.floor((Math.min(y, y + dy) - radius) / size));
  const maxRow = Math.min(map.rows - 1, Math.floor((Math.max(y, y + dy) + radius) / size));
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (map.tiles[row][col] !== 1) continue;
      const left = col * size; const top = row * size; const right = left + size; const bottom = top + size;
      const candidates = [
        segmentRectHit(x, y, dx, dy, left - radius, top, right + radius, bottom),
        segmentRectHit(x, y, dx, dy, left, top - radius, right, bottom + radius),
        ...[[left, top], [right, top], [left, bottom], [right, bottom]]
          .map(([cx, cy]) => segmentCircleHit(x, y, dx, dy, cx, cy, radius)),
      ].filter((value) => value !== null);
      for (const t of candidates) if (earliest === null || t < earliest) earliest = t;
    }
  }
  return earliest;
}
