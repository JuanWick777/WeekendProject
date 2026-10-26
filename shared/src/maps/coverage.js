import { ARENA_TEMPLATE, createArenaTemplate, rebuildMapTiles } from './arena-template.js';

// Each zone contains whole cover assemblies in A's three drawings. Both flanks
// use the same choice; coordinates and angles always come from her source art.
function zone(wall) {
  const [[x1, y1], [x2, y2]] = wall.points;
  const x = (x1 + x2) / 2; const y = (y1 + y2) / 2;
  if (y >= 410 && y <= 650) return 'middle';
  return (y < 410 ? 'north' : 'south') + (x < 550 || x > 900 ? '-outer' : '-inner');
}
const zoneIds = ['north-outer', 'north-inner', 'middle', 'south-outer', 'south-inner'];
function signature(walls) {
  return walls.map((wall) => {
    const points = [JSON.stringify(wall.points), JSON.stringify([...wall.points].reverse())].sort()[0];
    return wall.category + ':' + points;
  }).sort().join('|');
}
const templates = [ARENA_TEMPLATE, createArenaTemplate('v2'), createArenaTemplate('v3')];
const groups = zoneIds.map((id) => {
  const seen = new Set();
  const options = templates.map((map) => ({
    variantId: map.variantId,
    walls: map.wallPaths.filter((wall) => wall.category !== 'fixed' && zone(wall) === id),
  })).filter((option) => {
    const key = signature(option.walls);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  return { id, options };
});

// Removing one paired assembly opens a route while keeping nearly all cover.
// Attached caps are removed with their bar, including A's alternative cap poses.
const removableGroups = ['edge-pillars', 'side-upper', 'side-lower', 'core-bars', 'node-bars'];
function removableGroup(wall) {
  const [[x1, y1], [x2, y2]] = wall.points;
  const x = (x1 + x2) / 2; const y = (y1 + y2) / 2;
  if ((x === 580 || x === 880) && (y < 200 || y > 850)) return 'edge-pillars';
  if (x < 600 || x > 900) return y < 540 ? 'side-upper' : 'side-lower';
  return y > 410 && y < 650 ? 'core-bars' : 'node-bars';
}

export function createProceduralArena(random) {
  const modules = {}; const walls = ARENA_TEMPLATE.wallPaths.filter((wall) => wall.category === 'fixed');
  for (const group of groups) {
    const option = group.options[Math.floor(random() * group.options.length)];
    modules[group.id] = option.variantId;
    walls.push(...option.walls.map((wall) => ({ ...wall, id: group.id + '-' + wall.id })));
  }
  const removedGroup = removableGroups[Math.floor(random() * (removableGroups.length + 1))] ?? null;
  const map = structuredClone({ ...ARENA_TEMPLATE, tiles: [], variantId: 'procedural',
    wallPaths: walls.filter((wall) => wall.category !== 'remove' || removableGroup(wall) !== removedGroup),
    generation: { modules, removedGroup },
  });
  return rebuildMapTiles(map);
}
