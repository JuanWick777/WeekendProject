import { describe, expect, it } from 'vitest';
import { generateMap } from '../src/game/maps/generate-map.js';
import { ARENA_TEMPLATE } from '../src/game/maps/arena-template.js';
import { validateMap } from '../src/game/maps/validate-map.js';
import { firstWallHit, circleHitsMap } from '@cybergrid/shared/collision';
import { movePlayer } from '@cybergrid/shared/movement';

describe('arena de referencia y variación opt-in', () => {
  it('mantiene el diseño de A fijo entre semillas, sin compartir ni mutar tiles', () => {
    const template = JSON.stringify(ARENA_TEMPLATE);
    const first = generateMap(0); const other = generateMap(0);
    expect(first).toEqual(other);
    const spawn = first.spawnPoints[0]; const col = Math.floor(spawn.x / first.tileSize); const row = Math.floor(spawn.y / first.tileSize);
    first.tiles[row][col] = 1; expect(other.tiles[row][col]).toBe(0);
    for (const seed of [1,42,4294967295]) expect(generateMap(seed).tiles).toEqual(other.tiles);
    expect(other.layout).toBe('reference'); expect(JSON.stringify(ARENA_TEMPLATE)).toBe(template);
  });

  it('mantiene radios/accesos y rutas anchas en 64 semillas procedurales opt-in', () => {
    const variants = new Set(); let fallbacks = 0;
    for (let seed=0;seed<64;seed++) {
      const map = generateMap(seed, { layout:'procedural', onFallback:()=>{ fallbacks++; } });
      expect(validateMap(map)).toEqual({ valid:true, errors:[] });
      variants.add(JSON.stringify(map.tiles));
    }
    expect(variants.size).toBeGreaterThan(1); expect(fallbacks).toBe(0);
  });

  it('recorre cada pasillo previsto con la física real y conserva holgura de 48 unidades', () => {
    const map = generateMap(42);
    for (const route of map.protectedRoutes) {
      expect(route.clearance).toBeGreaterThanOrEqual(24);
      const player = { x:route.points[0][0], y:route.points[0][1] };
      for (const [x,y] of route.points.slice(1)) {
        expect(firstWallHit(map,player.x,player.y,x-player.x,y-player.y,route.clearance-.01)).toBeNull();
        let steps=0;
        while (Math.hypot(x-player.x,y-player.y)>.001 && steps++<1000) {
          const distance=Math.hypot(x-player.x,y-player.y);
          movePlayer(player,{moveX:(x-player.x)/distance,moveY:(y-player.y)/distance},Math.min(1/30,distance/160),map);
        }
        expect(player.x).toBeCloseTo(x,3); expect(player.y).toBeCloseTo(y,3);
      }
    }
    for (const point of map.spawnPoints) {
      const dx=point.x<640?120:-120,dy=point.y<560?120:-120;
      expect(firstWallHit(map,point.x,point.y,dx,0,32)).toBeNull();
      expect(firstWallHit(map,point.x,point.y,0,dy,32)).toBeNull();
    }
  });

  it('detecta un paso de 32 unidades aunque quepa la hitbox y haya rutas alternativas', () => {
    const map=generateMap(42); const col=56;
    map.tiles[67][col]=1; map.tiles[72][col]=1;
    expect(circleHitsMap(map,452,560,10)).toBe(false);
    expect(validateMap(map).errors).toContain('Narrow or blocked route: core-east-west');
  });

  it('no presenta ranuras de una o dos casillas como suelo transitable', () => {
    const map=generateMap(42);
    for(let row=1;row<map.rows-1;row++) for(let col=1;col<map.columns-1;col++) {
      if(map.tiles[row][col])continue;
      for(const[dx,dy]of[[1,0],[0,1]]) if(map.tiles[row-dy][col-dx]) {
        expect(map.tiles[row+dy]?.[col+dx]).not.toBe(1);
        expect(map.tiles[row+dy*2]?.[col+dx*2]).not.toBe(1);
      }
    }
    expect(circleHitsMap(map,16,16,10)).toBe(true);
  });

  it('usa fallback validado y rechaza semillas o geometría inválidas', () => {
    const fallback=[]; const map=generateMap(42,{maxAttempts:0,onFallback:e=>fallback.push(e)});
    expect(validateMap(map).valid).toBe(true); expect(fallback).toHaveLength(1);
    for(const seed of[-1,NaN,.1,2**32])expect(()=>generateMap(seed)).toThrow();
    const blocked=generateMap(42); for(let row=1;row<blocked.rows-1;row++)blocked.tiles[row][blocked.columns/2]=1;
    expect(validateMap(blocked).valid).toBe(false);
    expect(()=>generateMap(42,{layout:'unknown'})).toThrow();
  });
});
