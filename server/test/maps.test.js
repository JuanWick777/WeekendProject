import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateMap } from '../src/game/maps/generate-map.js';
import { ARENA_TEMPLATE, createArenaTemplate } from '../src/game/maps/arena-template.js';
import { validateMap } from '../src/game/maps/validate-map.js';
import { firstWallHit, circleHitsMap } from '@cybergrid/shared/collision';
import { movePlayer } from '@cybergrid/shared/movement';

const design = JSON.parse(readFileSync(new URL('../../client/prototypes/a-canvas/mapas/cybergrid_mapas.json', import.meta.url), 'utf8'));

// Discover traversable routes, then actually walk them with the production mover.
function routesFromSpawn(map) {
  const size = map.tileSize; const cols = map.columns; const origin = map.spawnPoints[0];
  const index = (x,y) => y * cols + x;
  const center = (key) => [(key % cols + .5) * size, (Math.floor(key / cols) + .5) * size];
  const start = index(Math.floor(origin.x / size), Math.floor(origin.y / size));
  const parents = new Map([[start, null]]); const queue = [start];
  for (let at = 0; at < queue.length; at += 1) {
    const key = queue[at]; const col = key % cols; const row = Math.floor(key / cols); const [x,y] = center(key);
    for (const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nc = col + dc; const nr = row + dr; const next = index(nc,nr);
      if (nc < 0 || nr < 0 || nc >= cols || nr >= map.rows || parents.has(next)) continue;
      const [tx,ty] = center(next);
      if (circleHitsMap(map,tx,ty,10) || firstWallHit(map,x,y,tx-x,ty-y,10) !== null) continue;
      parents.set(next,key); queue.push(next);
    }
  }
  return [...map.nodes, ...map.spawnPoints.slice(1), ...map.pickupSpawns].map((point) => {
    const col = Math.floor(point.x / size); const row = Math.floor(point.y / size); let end;
    for (let dy=-1;dy<=1 && end===undefined;dy++) for(let dx=-1;dx<=1;dx++) {
      const key=index(col+dx,row+dy); const [x,y]=center(key);
      if (parents.has(key) && firstWallHit(map,point.x,point.y,x-point.x,y-point.y,10) === null) { end=key;break; }
    }
    expect(end, 'No route to ' + point.id).toBeDefined();
    const path = [[point.x,point.y]];
    while(end !== null) { path.push(center(end));end=parents.get(end); }
    path.push([origin.x,origin.y]);
    return path.reverse();
  });
}

describe('integración fiel de la arena de A', () => {
  it('conserva exactamente todos los segmentos base y coordenadas de A', () => {
    const map = generateMap(42, { layout: 'reference' });
    expect(map.wallPaths.map((w) => [...w.points[0], ...w.points[1]])).toEqual(
      design.variants[0].walls.map((w) => [w.x1,w.y1,w.x2,w.y2]));
    for (const node of map.nodes) expect(design.nodes.find((n) => n.id === node.authorId)).toMatchObject({x:node.x,y:node.y});
    for (const spawn of map.spawnPoints) expect(design.spawns.find((s) => s.id === spawn.authorId)).toMatchObject({x:spawn.x,y:spawn.y});
    for (const pickup of map.pickupSpawns) expect(design.shields.find((s) => s.id === pickup.id)).toMatchObject({x:pickup.x,y:pickup.y});
    expect(map.spawnPoints.map((s) => s.authorId)).toEqual(['S1','S4','S2','S3']);
    expect(map).toMatchObject({columns:181,rows:136,tileSize:8,designWidth:1448,designHeight:1086,collisionModel:'segments-v1'});
  });

  it('mantiene terreno fijo entre semillas, copias independientes y plantilla intacta', () => {
    const before = JSON.stringify(ARENA_TEMPLATE);
    const a = generateMap(0, { layout: 'reference' }); const b = generateMap(0, { layout: 'reference' });
    expect(a).toEqual(b); a.wallPaths[0].points[0][0] += 50; a.tiles[10][10] = 0;
    expect(a.wallPaths).not.toEqual(b.wallPaths);
    for (const seed of [1,42,4294967295]) {
      const other = generateMap(seed, { layout: 'reference' }); expect(other.wallPaths).toEqual(b.wallPaths); expect(other.tiles).toEqual(b.tiles);
    }
    expect(JSON.stringify(ARENA_TEMPLATE)).toBe(before);
  });

  it('genera cobertura variada, válida y fiel a A en 64 semillas sin fallback', () => {
    const geometry = (walls) => walls.map(w => JSON.stringify([w.category, w.points])).sort().join('|');
    const authored = new Set(['base','v2','v3'].flatMap(id => {
      const map = createArenaTemplate(id);
      expect(validateMap(map).valid).toBe(true);
      return map.wallPaths.map(w => JSON.stringify([w.category,w.points]));
    }));
    const seen = new Set(); const fallback = [];
    const fixed = ARENA_TEMPLATE.wallPaths.filter(w => w.category === 'fixed');
    for (let seed=0;seed<64;seed++) {
      const map = generateMap(seed,{onFallback:(e)=>fallback.push(e)});
      expect(validateMap(map)).toEqual({valid:true,errors:[]});
      expect(map).toMatchObject({layout:'procedural',variantId:'procedural',generatorVersion:4});
      expect(map.wallPaths.filter(w => w.category === 'fixed')).toEqual(fixed);
      expect(map.wallPaths.every(w => authored.has(JSON.stringify([w.category,w.points])))).toBe(true);
      expect(new Set(map.wallPaths.map(w => w.id)).size).toBe(map.wallPaths.length);
      expect(map.wallPaths.length).toBeGreaterThanOrEqual(140);
      expect(map.wallPaths.length).toBeLessThanOrEqual(160);
      expect(map.nodes).toEqual(ARENA_TEMPLATE.nodes);
      expect(map.spawnPoints).toEqual(ARENA_TEMPLATE.spawnPoints);
      expect(map.pickupSpawns).toEqual(ARENA_TEMPLATE.pickupSpawns);
      expect(map.outline).toEqual(ARENA_TEMPLATE.outline);
      seen.add(geometry(map.wallPaths));
    }
    expect(seen.size).toBeGreaterThan(32); expect(fallback).toHaveLength(0);
  }, 40_000);

  it('reproduce geometría y metadatos para uint32, sin compartir objetos ni alterar fuentes', () => {
    const before = JSON.stringify(ARENA_TEMPLATE);
    for (const seed of [0,1,42,4294967295]) {
      const a = generateMap(seed); const b = generateMap(seed);
      expect(a).toEqual(b);
      a.wallPaths[0].points[0][0] += 50; a.tiles[10][10] = 0;
      expect(a.wallPaths).not.toEqual(b.wallPaths);
      expect(generateMap(seed)).toEqual(b);
    }
    expect(JSON.stringify(ARENA_TEMPLATE)).toBe(before);
  });

  it('retira cobertura también de colisiones, balas y cuadrícula auxiliar', () => {
    let map;
    for (let seed=0;seed<24;seed++) {
      const candidate = generateMap(seed);
      if (candidate.generation.removedGroup==='node-bars') { map=candidate; break; }
    }
    expect(map).toBeDefined();
    const reference = generateMap(map.seed,{layout:'reference'});
    const x=720,y=260;
    expect(circleHitsMap(reference,x,y,3)).toBe(true);
    expect(circleHitsMap(map,x,y,3)).toBe(false);
    expect(firstWallHit(reference,x,y-30,0,60,3)).not.toBeNull();
    expect(firstWallHit(map,x,y-30,0,60,3)).toBeNull();
    expect(reference.tiles[32][90]).toBe(1);
    expect(map.tiles[32][90]).toBe(0);
  });

  it('camina con la hitbox real hasta todos los objetivos en distintas combinaciones', () => {
    for (const seed of [0,1,42,4294967295]) {
      const map = generateMap(seed);
      for (const points of routesFromSpawn(map)) {
        const player = {x:points[0][0],y:points[0][1]};
        for (const [x,y] of points.slice(1)) {
          expect(firstWallHit(map,player.x,player.y,x-player.x,y-player.y,10)).toBeNull();
          let steps=0;
          while (Math.hypot(x-player.x,y-player.y)>.001 && steps++<50) {
            const distance=Math.hypot(x-player.x,y-player.y);
            movePlayer(player,{moveX:(x-player.x)/distance,moveY:(y-player.y)/distance},Math.min(1/30,distance/160),map);
          }
          expect(player.x).toBeCloseTo(x,3); expect(player.y).toBeCloseTo(y,3);
          expect(circleHitsMap(map,player.x,player.y,10)).toBe(false);
        }
      }
    }
  });

  it('rechaza nodos y apariciones bloqueados aunque la caché se haya usado antes', () => {
    const map=generateMap(42); const node=map.nodes[0];
    expect(circleHitsMap(map,node.x,node.y,64)).toBe(false);
    map.wallPaths.push({id:'blocked',points:[[node.x-80,node.y],[node.x+80,node.y]],thickness:22,endPadding:4});
    expect(validateMap(map).errors).toContain('Node obstructed: center');
    const spawn=generateMap(42); const s=spawn.spawnPoints[0];
    spawn.wallPaths.push({id:'spawn-block',points:[[s.x-30,s.y],[s.x+30,s.y]],thickness:22,endPadding:4});
    expect(validateMap(spawn).errors).toContain('Spawn obstructed');
  });

  it('detecta una aparición aislada aunque su centro siga libre', () => {
    const map=generateMap(42);const spawn=map.spawnPoints[1];const {x,y}=spawn;const r=42;
    map.wallPaths.push({id:'sealed',points:[[x-r,y-r],[x+r,y-r],[x+r,y+r],[x-r,y+r],[x-r,y-r]],thickness:22,endPadding:4});
    expect(validateMap(map).errors).toContain('Unreachable point');
    expect(circleHitsMap(map,x,y,10)).toBe(false);
  });

  it('usa fallback validado y rechaza entradas/segmentos inválidos', () => {
    const fallback=[]; const map=generateMap(42,{maxAttempts:0,onFallback:e=>fallback.push(e)});
    expect(validateMap(map).valid).toBe(true); expect(fallback).toHaveLength(1);
    expect(map.generation).toMatchObject({fallback:true,attempts:0});
    expect(map.wallPaths).toEqual(ARENA_TEMPLATE.wallPaths);
    for(const seed of[-1,NaN,.1,2**32])expect(()=>generateMap(seed)).toThrow();
    expect(()=>generateMap(42,{layout:'unknown'})).toThrow();
    expect(()=>generateMap(42,{maxAttempts:-1})).toThrow();
    const invalid=generateMap(42); invalid.wallPaths[0].thickness=NaN;
    expect(validateMap(invalid)).toEqual({valid:false,errors:['Invalid wall geometry']});
    expect(circleHitsMap(map,16,16,10)).toBe(true);
    expect(firstWallHit(map,214,148,-300,0,3)).not.toBeNull();
  });
});
