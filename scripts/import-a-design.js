// Re-import after A intentionally changes her prototype. Originals stay untouched.
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('client/prototypes/a-canvas/index.html', root), 'utf8');
const data = JSON.parse(await readFile(new URL('client/prototypes/a-canvas/mapas/cybergrid_mapas.json', root), 'utf8'));
const start = html.indexOf('const seeded='); const end = html.indexOf('function rebuildBackground()', start);
if (start < 0 || end < 0 || data.format !== 'cybergrid-map-v1') throw new Error('Unexpected A prototype format; review import manually');
const drawing = html.slice(start, end).trim();
const outline = drawing.match(/const floorOutline=(\[[\s\S]*?\]);/);
if (!outline) throw new Error('Missing floor outline');
const design = { ...data }; delete design.editorState;
design.outline = JSON.parse(outline[1]);
await writeFile(new URL('shared/src/maps/a-design.json', root), JSON.stringify(design, null, 2) + '\n');
const art = `// Generated from A's original Canvas functions by scripts/import-a-design.js.
export function createArenaArt(arena) {
const map = { width: arena.designWidth, height: arena.designHeight, spawns: ${JSON.stringify(design.spawns)} };
${drawing}
const layer = document.createElement('canvas');
layer.width = arena.columns * arena.tileSize; layer.height = arena.rows * arena.tileSize;
const c = layer.getContext('2d');
c.fillStyle = '#07111b'; c.fillRect(0, 0, layer.width, layer.height);
drawOutside(c); drawFloor(c);
arena.nodes.forEach((n) => drawNode(c, { ...n, id: n.authorId }));
map.spawns.forEach((s) => drawSpawn(c, s));
for (const wall of arena.wallPaths) {
  for (let i = 1; i < wall.points.length; i += 1) {
    const [x1, y1] = wall.points[i - 1]; const [x2, y2] = wall.points[i];
    strokeSegment(c, { x1, y1, x2, y2 });
  }
}
return layer;
}
`;
await writeFile(new URL('client/src/game/arena-art.js', root), art);
console.log('Imported A design and original drawing functions; prototype files untouched.');
