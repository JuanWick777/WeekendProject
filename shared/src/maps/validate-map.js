import { GAME_CONFIG } from '../constants.js';
import { circleHitsMap, firstWallHit } from '../collision.js';

export function validateMap(map, { protectedTiles = [], protectedRoutes = map.protectedRoutes ?? [] } = {}) {
  const errors = [];
  const { columns, rows, tileSize } = GAME_CONFIG.world;
  if (map.columns !== columns || map.rows !== rows || map.tileSize !== tileSize
    || !Array.isArray(map.tiles) || map.tiles.length !== rows
    || map.tiles.some((row) => !Array.isArray(row) || row.length !== columns || row.some((tile) => tile !== 0 && tile !== 1))) {
    return { valid: false, errors: ['Invalid tile grid'] };
  }
  const finitePoint = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y);
  if (!Array.isArray(map.nodes) || map.nodes.length !== 5
    || map.nodes.some((node, index) => !finitePoint(node) || node.id !== GAME_CONFIG.match.nodeOrder[index] || node.radius !== GAME_CONFIG.match.nodeRadius)) {
    return { valid: false, errors: ['Invalid nodes'] };
  }
  if (!Array.isArray(map.spawnPoints) || map.spawnPoints.length < 4 || !Array.isArray(map.pickupSpawns)
    || !map.spawnPoints.every(finitePoint) || !map.pickupSpawns.every(finitePoint)) {
    return { valid: false, errors: ['Invalid spawn points'] };
  }
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < columns; col += 1) {
    if ((row === 0 || col === 0 || row === rows - 1 || col === columns - 1) && map.tiles[row][col] !== 1) errors.push('Open border');
  }
  for (const [col, row] of protectedTiles) if (map.tiles[row]?.[col] !== 0) errors.push('Protected route blocked');
  for (const route of protectedRoutes) for (let i = 1; i < route.points.length; i += 1) {
    const [x, y] = route.points[i - 1]; const [tx, ty] = route.points[i];
    if (firstWallHit(map, x, y, tx - x, ty - y, route.clearance - .01) !== null) errors.push('Narrow or blocked route: ' + route.id);
  }
  for (const node of map.nodes) {
    if (map.nodes.some((other) => other !== node && Math.hypot(node.x - other.x, node.y - other.y) < node.radius + other.radius)) errors.push('Nodes overlap');
    if (circleHitsMap(map, node.x, node.y, node.radius)) errors.push('Node obstructed: ' + node.id);
    let approaches = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let free = true;
      for (let distance = 0; distance <= node.radius + tileSize; distance += 4) {
        if (circleHitsMap(map, node.x + dx * distance, node.y + dy * distance, GAME_CONFIG.player.radius)) { free = false; break; }
      }
      if (free) approaches += 1;
    }
    if (approaches < 2) errors.push('Node has fewer than two approaches: ' + node.id);
  }
  for (const [index, point] of map.spawnPoints.entries()) {
    if (circleHitsMap(map, point.x, point.y, GAME_CONFIG.player.radius)) errors.push('Spawn obstructed');
    if (map.nodes.some((node) => Math.hypot(point.x - node.x, point.y - node.y) < node.radius + GAME_CONFIG.player.radius)) errors.push('Spawn inside node');
    if (map.spawnPoints.slice(0, index).some((other) => other.id === point.id || Math.hypot(point.x - other.x, point.y - other.y) < 2 * GAME_CONFIG.player.radius)) errors.push('Spawns overlap');
  }
  for (const pickup of map.pickupSpawns) {
    if (pickup.type !== 'shield' || pickup.radius !== GAME_CONFIG.match.pickupRadius
      || !['initial', 'random'].includes(pickup.spawnKind)
      || circleHitsMap(map, pickup.x, pickup.y, pickup.radius)
      || map.nodes.some((node) => Math.hypot(pickup.x - node.x, pickup.y - node.y) < node.radius + pickup.radius)) errors.push('Invalid pickup');
  }
  if (new Set(map.pickupSpawns.map((point) => point.id)).size !== map.pickupSpawns.length
    || map.pickupSpawns.filter((point) => point.spawnKind === 'initial').length !== 4
    || map.pickupSpawns.filter((point) => point.spawnKind === 'random').length !== 6) errors.push('Invalid shield distribution');
  const start = map.spawnPoints[0];
  const visited = new Set();
  const queue = [[Math.floor(start.x / tileSize), Math.floor(start.y / tileSize)]];
  visited.add(queue[0].join(','));
  for (let index = 0; index < queue.length; index += 1) {
    const [col, row] = queue[index];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = col + dc; const nr = row + dr; const key = nc + ',' + nr;
      if (nc < 0 || nr < 0 || nc >= columns || nr >= rows || visited.has(key)) continue;
      if (circleHitsMap(map, (nc + 0.5) * tileSize, (nr + 0.5) * tileSize, GAME_CONFIG.player.radius)) continue;
      visited.add(key); queue.push([nc, nr]);
    }
  }
  for (const point of [...map.nodes, ...map.spawnPoints, ...map.pickupSpawns]) {
    // A point on a tile edge may fit even when that tile's center does not.
    // Connect it to a reachable nearby center using the actual swept radius.
    const col = Math.floor(point.x / tileSize); const row = Math.floor(point.y / tileSize);
    let reachable = false;
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
      const x = (col + dc + 0.5) * tileSize; const y = (row + dr + 0.5) * tileSize;
      if (visited.has((col + dc) + ',' + (row + dr))
        && firstWallHit(map, point.x, point.y, x - point.x, y - point.y, GAME_CONFIG.player.radius) === null) reachable = true;
    }
    if (!reachable) errors.push('Unreachable point');
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
