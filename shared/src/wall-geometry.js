// Oriented rectangles follow A's visible metal faces. Shadows are decorative.
const cache = new WeakMap();
const CELL = 64;

export function insideOutline(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i]; const [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

export function resetWallGeometry(map) { cache.delete(map); }

export function wallGeometry(map) {
  if (cache.has(map)) return cache.get(map);
  const rectangles = []; const buckets = new Map();
  function add([x, y], [tx, ty], thickness, padding = 0) {
    const length = Math.hypot(tx - x, ty - y);
    if (!length) return;
    const ux = (tx - x) / length; const uy = (ty - y) / length;
    const left = -padding; const right = length + padding; const half = thickness / 2;
    const points = [[left, -half], [right, -half], [right, half], [left, half]]
      .map(([a, b]) => [x + a * ux - b * uy, y + a * uy + b * ux]);
    const rect = { x, y, ux, uy, left, right, top: -half, bottom: half, points };
    rectangles.push(rect);
    const xs = points.map((p) => p[0]); const ys = points.map((p) => p[1]);
    for (let row = Math.floor(Math.min(...ys) / CELL); row <= Math.floor(Math.max(...ys) / CELL); row += 1) {
      for (let col = Math.floor(Math.min(...xs) / CELL); col <= Math.floor(Math.max(...xs) / CELL); col += 1) {
        const key = col + ',' + row;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(rect);
      }
    }
  }
  for (const wall of map.wallPaths) {
    for (let i = 1; i < wall.points.length; i += 1) add(wall.points[i - 1], wall.points[i], wall.thickness, wall.endPadding ?? 0);
  }
  for (let i = 0; i < map.outline.length; i += 1) add(map.outline[i], map.outline[(i + 1) % map.outline.length], map.outlineThickness);
  const result = {
    rectangles,
    query(left, top, right, bottom) {
      const found = new Set();
      for (let row = Math.floor(top / CELL); row <= Math.floor(bottom / CELL); row += 1) {
        for (let col = Math.floor(left / CELL); col <= Math.floor(right / CELL); col += 1) {
          for (const rect of buckets.get(col + ',' + row) ?? []) found.add(rect);
        }
      }
      return found;
    },
  };
  cache.set(map, result);
  return result;
}

export function toWallLocal(rect, x, y) {
  const dx = x - rect.x; const dy = y - rect.y;
  return [dx * rect.ux + dy * rect.uy, -dx * rect.uy + dy * rect.ux];
}
