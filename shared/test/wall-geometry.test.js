import { describe, expect, it } from 'vitest';
import { circleHitsMap, firstWallHit } from '../src/collision.js';
import { movePlayer } from '../src/movement.js';

function arena(points = [[100,100],[200,100]]) {
  return {collisionModel:'segments-v1',columns:50,rows:50,tileSize:8,
    outline:[[8,8],[392,8],[392,392],[8,392]],outlineThickness:18,
    wallPaths:[{id:'test',points,thickness:22,endPadding:4}]};
}
describe('colisión continua de paredes dibujadas por A', () => {
  it('coincide con metal de 22, extremos de 4 y omite sombras decorativas', () => {
    const map=arena();
    expect(circleHitsMap(map,150,89,1)).toBe(true);
    expect(circleHitsMap(map,150,87,1)).toBe(false);
    expect(circleHitsMap(map,96,100,1)).toBe(true);
    expect(circleHitsMap(map,94,100,1)).toBe(false);
    expect(circleHitsMap(map,150,79,10)).toBe(false);
    expect(circleHitsMap(map,150,79.1,10)).toBe(true);
  });
  it('mantiene diagonales continuas y detecta balas rápidas sin túneles', () => {
    const map=arena([[100,100],[200,200]]);
    const offset=Math.SQRT1_2*20;
    expect(circleHitsMap(map,150-offset,150+offset,10)).toBe(true);
    expect(circleHitsMap(map,150-offset*1.1,150+offset*1.1,10)).toBe(false);
    const hit=firstWallHit(map,50,150,250,0,3);
    expect(hit).toBeGreaterThan(0); expect(hit).toBeLessThan(1);
    const player={x:50,y:150}; movePlayer(player,{moveX:1,moveY:0},2,map);
    expect(player.x).toBeLessThan(150); expect(circleHitsMap(map,player.x,player.y,10)).toBe(false);
  });
  it('respeta esquinas redondeadas por el radio circular y la frontera del suelo', () => {
    const map=arena();
    expect(firstWallHit(map,85,78,0,20,10)).toBeNull();
    expect(firstWallHit(map,86.1,78,0,20,10)).not.toBeNull();
    expect(circleHitsMap(map,50,26,10)).toBe(true);
    expect(firstWallHit(map,50,50,0,-100,3)).toBeCloseTo(.3,6);
  });
});
