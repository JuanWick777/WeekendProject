import { GAME_CONFIG } from '../constants.js';

const { columns, rows, tileSize } = GAME_CONFIG.world;
// Authoring coordinates keep the proportions of A's sketch; physics uses world units.
const PLAN_WIDTH = 1024; const PLAN_HEIGHT = 896; const PLAN_SCALE = 1.25;
const mirror = ([x, y], flipX, flipY) => [flipX ? PLAN_WIDTH - x : x, flipY ? PLAN_HEIGHT - y : y];
const scalePoint = ([x,y]) => [x * PLAN_SCALE, y * PLAN_SCALE];
const segmentDistance = (x, y, [ax, ay], [bx, by]) => {
  const dx = bx - ax; const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
};
function inside(x, y, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i]; const [bx, by] = polygon[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) hit = !hit;
  }
  return hit;
}
// Free-floor silhouette: four protruding bays, diagonal shoulders and stepped
// perimeter. Everything outside it is solid void, never an invisible floor.
const outline = [
  [24,64],[136,64],[136,88],[216,88],[264,56],[280,56],[280,24],[336,24],[336,40],
  [688,40],[688,24],[744,24],[744,56],[760,56],[808,88],[888,88],[888,64],[1000,64],
  [1000,176],[984,176],[984,304],[1000,304],[1000,328],[984,328],[984,568],[1000,568],
  [1000,592],[984,592],[984,720],[1000,720],[1000,832],[888,832],[888,808],
  [808,808],[760,840],[744,840],[744,872],[688,872],[688,856],[336,856],[336,872],
  [280,872],[280,840],[264,840],[216,808],[136,808],[136,832],[24,832],
  [24,720],[40,720],[40,592],[24,592],[24,568],[40,568],[40,328],[24,328],
  [24,304],[40,304],[40,176],[24,176],
];
const floorOutline = outline.map(scalePoint);
const tiles = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, col) =>
  Number(!inside((col + .5) * tileSize, (row + .5) * tileSize, floorOutline))));
const wallPaths = [];
function stroke(id, points, thickness = 12) {
  points = points.map(scalePoint);
  wallPaths.push({ id, points, thickness });
  for (let row = 1; row < rows - 1; row += 1) for (let col = 1; col < columns - 1; col += 1) {
    const x = (col + .5) * tileSize; const y = (row + .5) * tileSize;
    if (points.slice(1).some((b, i) => segmentDistance(x, y, points[i], b) <= thickness / 2)) tiles[row][col] = 1;
  }
}
for (const flipX of [false, true]) for (const flipY of [false, true]) {
  const suffix = (flipY ? 's' : 'n') + (flipX ? 'e' : 'w');
  const add = (id, points, thickness = 12) => stroke(id + '-' + suffix, points.map((p) => mirror(p, flipX, flipY)), thickness);
  // Two exits per bay, tested with 64 world units of full clearance.
  add('bay-sill', [[24,184],[40,184]]);
  add('bay-elbow', [[120,184],[144,184],[184,224]]);
  add('bay-jamb', [[144,64],[144,80]]);
  add('bay-lower-jamb', [[144,160],[144,184]]);
  add('north-pillar', [[376,104],[376,160]]);
  add('north-L', [[304,224],[304,264],[344,264]]);
  add('outer-elbow', [[160,280],[160,320],[152,320],[120,352]]);
  add('inner-elbow', [[224,280],[256,312],[256,336],[312,336]]);
  add('side-L', [[184,352],[208,352],[208,368]]);
  add('side-pillar', [[296,376],[296,384]], 16);
  add('side-bar', [[280,416],[320,416]]);
  // A's four curved ring segments, sampled densely onto the physical grid.
  const arc = Array.from({ length: 13 }, (_, i) => {
    const angle = (200 + i * 36 / 12) * Math.PI / 180;
    return [512 + Math.cos(angle) * 156, 448 + Math.sin(angle) * 156];
  });
  add('core-arc', arc);
  add('diagonal', [[392,272],[416,296]]);
  add('axial-pillar', [[480,304],[480,344]]);
  add('core-flank', [[408,400],[408,416]]);
}
// The side-bar/pillar/core-flank definitions are already mirrored vertically;
// mirrored pairs form separated double bars, not joined L-shaped blockages.
stroke('inner-diagonal-sw', [[440,504],[456,520]]);
stroke('inner-diagonal-se', [[584,504],[568,520]]);
stroke('north-crossbar', [[472,240],[552,240]]);
stroke('core-top-bar', [[488,360],[536,360]]);
stroke('south-crossbar', [[472,656],[552,656]]);
stroke('core-bottom-bar', [[488,536],[536,536]]);
stroke('west-barrier', [[104,416],[104,480]], 16);
stroke('east-barrier', [[920,416],[920,480]], 16);

// Fill sub-body slits left by rasterized corners. A 1-2 cell gap is at most
// 16 units wide, below the 20-unit body; drawing it as floor suggests a route.
let changed = true;
while (changed) {
  changed = false; const fill = [];
  for (let row=1;row<rows-1;row++) for (let col=1;col<columns-1;col++) {
    if (tiles[row][col]) continue;
    for (const [dx,dy] of [[1,0],[0,1]]) {
      if (tiles[row-dy]?.[col-dx] !== 1) continue;
      for (let length=1;length<=2;length++) {
        if (tiles[row+dy*length]?.[col+dx*length] === 1) {
          for (let i=0;i<length;i++) fill.push([col+dx*i,row+dy*i]); break;
        }
      }
    }
  }
  for (const [col,row] of fill) if (!tiles[row][col]) { tiles[row][col]=1; changed=true; }
}

// Future procedural candidates remain opt-in. The reference layout always uses
// variant 0 so art review and traversal tests see the complete intended map.
const obstacleGroups = [];
for (const flipX of [false, true]) for (const flipY of [false, true]) {
  const point = mirror([312,336], flipX, flipY);
  const col = Math.floor(point[0] * PLAN_SCALE / tileSize); const row = Math.floor(point[1] * PLAN_SCALE / tileSize);
  obstacleGroups.push({ id: 'elbow-cap-' + Number(flipX) + Number(flipY), variants: [[], [[col + (flipX ? -2 : 2),row]]] });
}
const pickup = (id, x, y, spawnKind) => ({ id, type: 'shield', x: x * PLAN_SCALE, y: y * PLAN_SCALE, radius: GAME_CONFIG.match.pickupRadius, spawnKind });
const route = (id, points, clearance = 24) => ({ id, points: points.map(scalePoint), clearance });
const protectedRoutes = [
  route('core-east-west', [[296,448],[728,448]]),
  route('outer-west', [[64,208],[64,688]], 24),
  route('outer-east', [[960,208],[960,688]], 24),
];
for (const flipX of [false,true]) for (const flipY of [false,true]) {
  const suffix = Number(flipX) + '-' + Number(flipY);
  for (const [id, points, clearance] of [
    ['bay-horizontal', [[80,120],[208,120]], 24],
    ['bay-vertical', [[80,120],[80,248]], 24],
    ['north-route', [[256,192],[512,192]], 24],
    ['elbow-gap', [[208,240],[192,256],[192,320]], 24],
  ]) protectedRoutes.push(route(id+'-'+suffix, points.map((p)=>mirror(p,flipX,flipY)),clearance));
}
export const ARENA_TEMPLATE = {
  templateId: 'cardinal-sketch', templateVersion: 4, columns, rows, tileSize,
  tiles, protectedTiles: [], protectedRoutes, obstacleGroups, wallPaths, outline: floorOutline,
  nodes: [
    { id: 'center', x: 640, y: 560, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'north', x: 640, y: 180, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'east', x: 1060, y: 560, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'south', x: 640, y: 940, radius: GAME_CONFIG.match.nodeRadius },
    { id: 'west', x: 220, y: 560, radius: GAME_CONFIG.match.nodeRadius },
  ],
  spawnPoints: [
    { id: 'spawn-nw', x: 100, y: 150 }, { id: 'spawn-se', x: 1180, y: 970 },
    { id: 'spawn-ne', x: 1180, y: 150 }, { id: 'spawn-sw', x: 100, y: 970 },
  ],
  pickupSpawns: [
    pickup('R1',224,184,'initial'),pickup('R3',800,184,'initial'),
    pickup('R10',224,712,'initial'),pickup('R12',800,712,'initial'),
    pickup('R2',512,296,'random'),pickup('R4',264,384,'random'),
    pickup('R5',760,384,'random'),pickup('R8',264,512,'random'),
    pickup('R9',760,512,'random'),pickup('R11',512,600,'random'),
  ],
};
