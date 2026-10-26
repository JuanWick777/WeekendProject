import { describe,it,expect } from 'vitest';
import { createSnapshotBuffer } from '../src/game/snapshot-buffer.js';
function map(){return{columns:30,rows:30,tileSize:8,tiles:Array.from({length:30},(_,y)=>Array.from({length:30},(_,x)=>Number(x===0||y===0||x===29||y===29)))};}
function state(tick,time,x,ack=-1){return{matchId:'m',tick,serverTimeMs:time,players:[{id:'a',x:60,y:60,alive:true,forfeited:false,lastProcessedSeq:ack},{id:'b',x,y:100,alive:true}],projectiles:[]};}
const idle={moveX:0,moveY:0,aimX:1,aimY:0,attack:false};
describe('presentación de snapshots y predicción',()=>{
  it('interpola rivales y conserva el estado autoritativo separado',()=>{
    const buffer=createSnapshotBuffer(map(),'a');buffer.push(state(0,0,60),0);buffer.push(state(6,200,80),200);
    const visual=buffer.render(200,idle,false);
    expect(visual.players[1].x).toBe(70);expect(buffer.latest.players[1].x).toBe(80);
  });
  it('reconcilia comandos pendientes y detiene predicción al perder conexión',()=>{
    const buffer=createSnapshotBuffer(map(),'a');buffer.push(state(0,0,60),0);
    buffer.record(0,{...idle,moveX:1},0);buffer.record(1,{...idle,moveX:1},50);
    buffer.push(state(3,100,60,0),100);
    expect(buffer.render(100,{...idle,moveX:1},true).players[0].x).toBeCloseTo(68);
    expect(buffer.render(100,idle,false).players[0].x).toBe(60);expect(buffer.latest.players[0].x).toBe(60);
  });
  it('predice contra paredes reales y no interpola una reaparición',()=>{
    const arena=map();for(let y=1;y<29;y++)arena.tiles[y][12]=1;
    const buffer=createSnapshotBuffer(arena,'a');buffer.push(state(0,0,60),0);buffer.record(0,{...idle,moveX:1},0);
    expect(buffer.render(100,{...idle,moveX:1},true).players[0].x).toBeLessThanOrEqual(86);
    const first=state(1,0,50);first.players[1].alive=false;buffer.push(first,0);
    buffer.push(state(2,100,150),100);expect(buffer.render(100,idle,false).players[1].x).toBe(150);
  });
});
