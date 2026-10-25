import { PALETTE as P } from './palette.js';

function trace(c, points, close = false) {
  c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); if (close) c.closePath();
}

// Static art is baked once. Every wall face and light is clipped to solid tiles;
// no decorative bitmap can introduce an opening that the physics blocks.
export function createArenaArt(map) {
  const layer = document.createElement('canvas'); const s = map.tileSize;
  layer.width = map.columns * s; layer.height = map.rows * s;
  const c = layer.getContext('2d');
  c.fillStyle = '#080f17'; c.fillRect(0,0,layer.width,layer.height);
  c.strokeStyle = '#19303c66'; c.lineWidth = .6;
  for (let x = 0; x < layer.width; x += 32) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,layer.height); c.stroke(); }
  for (let y = 0; y < layer.height; y += 32) { c.beginPath(); c.moveTo(0,y); c.lineTo(layer.width,y); c.stroke(); }
  const floor = new Path2D(); const walls = new Path2D();
  const visible = map.tiles.map((row,y) => row.map((solid,x) => solid && [-2,-1,0,1,2].some((dy) =>
    [-2,-1,0,1,2].some((dx) => map.tiles[y+dy]?.[x+dx] === 0))));
  for (let y = 0; y < map.rows; y += 1) for (let x = 0; x < map.columns; x += 1) {
    if (!map.tiles[y][x]) floor.rect(x*s,y*s,s,s);
    if (visible[y][x]) walls.rect(x*s,y*s,s,s);
  }
  c.save(); c.clip(floor);
  c.fillStyle = '#303b43'; c.fillRect(0,0,layer.width,layer.height);
  for (let y = 0; y < layer.height; y += 32) for (let x = 0; x < layer.width; x += 32) {
    const noise = ((x / 32) * 71 + (y / 32) * 29) % 17;
    const g = c.createLinearGradient(x,y,x+32,y+32);
    g.addColorStop(0, `rgb(${48+noise/3},${58+noise/3},${66+noise/3})`); g.addColorStop(1,'#28343d');
    c.fillStyle = g; c.fillRect(x+1,y+1,30,30);
    c.strokeStyle = '#14212b'; c.lineWidth = 1; c.strokeRect(x+.5,y+.5,31,31);
    c.strokeStyle = '#71808c22'; c.beginPath(); c.moveTo(x+2,y+30); c.lineTo(x+30,y+30); c.stroke();
    c.fillStyle = '#a2b2bb44'; c.fillRect(x+3,y+3,1.4,1.4);
    if (noise === 2) { c.strokeStyle = '#8b99a522'; c.beginPath(); c.moveTo(x+6,y+8); c.lineTo(x+19,y+24); c.lineTo(x+17,y+28); c.stroke(); }
    if (noise === 6) {
      c.fillStyle = '#111c25'; c.fillRect(x+10,y+5,14,22);
      c.fillStyle = '#62717c55'; for (let i=0;i<7;i++) c.fillRect(x+11,y+7+i*2.7,12,1);
    }
  }
  // Recessed machinery, cable channels and warning strips are floor decals.
  c.strokeStyle = '#1a2b35'; c.lineWidth = 7;
  for (const x of [72,layer.width-72]) { c.beginPath(); c.moveTo(x,220); c.lineTo(x,layer.height-220); c.stroke(); }
  c.strokeStyle = '#4db9cb22'; c.lineWidth = 1;
  for (const x of [72,layer.width-72]) { c.beginPath(); c.moveTo(x,220); c.lineTo(x,layer.height-220); c.stroke(); }
  for (const [index,p] of map.spawnPoints.entries()) {
    c.save(); c.translate(p.x,p.y);
    c.fillStyle = '#152630'; c.fillRect(-35,-32,70,64);
    c.strokeStyle = '#738896'; c.lineWidth = 2; c.strokeRect(-35,-32,70,64);
    c.strokeStyle = '#0c151e'; c.lineWidth = 4; c.strokeRect(-29,-26,58,52);
    c.fillStyle = '#5debff44'; c.fillRect(-25,19,50,3);
    c.strokeStyle = '#53788a'; c.lineWidth = 1;
    for (const side of [-1,1]) { c.beginPath(); c.moveTo(side*29,-23); c.lineTo(-side*29,23); c.stroke(); }
    c.fillStyle = '#a7c7d5'; c.textAlign = 'center'; c.font = '600 10px system-ui'; c.fillText('SPAWN '+(index+1),0,49); c.restore();
  }
  c.restore();

  c.save(); c.shadowColor = '#000d'; c.shadowBlur = 8; c.shadowOffsetY = 5;
  c.fillStyle = '#040a10'; c.fill(walls); c.restore();
  c.fillStyle = '#465663'; c.fill(walls);
  c.save(); c.clip(walls);
  const edges = [];
  for (let y=0;y<map.rows;y++) for (let x=0;x<map.columns;x++) {
    if (!visible[y][x]) continue;
    const px=x*s,py=y*s;
    if (!visible[y-1]?.[x]) edges.push([[[px,py],[px+s,py]],'#b5c2ca']);
    if (!visible[y+1]?.[x]) edges.push([[[px,py+s],[px+s,py+s]],'#050b12']);
    if (!visible[y]?.[x-1]) edges.push([[[px,py],[px,py+s]],'#7f949f']);
    if (!visible[y]?.[x+1]) edges.push([[[px+s,py],[px+s,py+s]],'#09121b']);
  }
  for (const [points,color] of edges) { trace(c,points); c.strokeStyle = color; c.lineWidth=4; c.stroke(); }
  if (map.outline) {
    trace(c,map.outline,true); c.strokeStyle='#1c3342'; c.lineWidth=20; c.stroke();
    trace(c,map.outline,true); c.strokeStyle='#91a7b5'; c.lineWidth=13; c.stroke();
    trace(c,map.outline,true); c.strokeStyle='#172833'; c.lineWidth=9; c.stroke();
    trace(c,map.outline,true); c.strokeStyle='#45cbe7'; c.lineWidth=2; c.shadowColor=P.cyan; c.shadowBlur=5; c.stroke(); c.shadowBlur=0;
  }
  for (const wall of map.wallPaths ?? []) {
    const {points,thickness} = wall;
    trace(c,points); c.lineJoin='round'; c.lineCap='round'; c.lineWidth=thickness+3; c.strokeStyle='#a6b4bd'; c.stroke();
    trace(c,points); c.lineWidth=thickness; c.strokeStyle='#192831'; c.stroke();
    for (let i=1;i<points.length;i++) {
      const [x,y]=points[i-1], [tx,ty]=points[i]; const length=Math.hypot(tx-x,ty-y);
      c.save(); c.translate(x,y); c.rotate(Math.atan2(ty-y,tx-x));
      const bevel=c.createLinearGradient(0,-thickness/2,0,thickness/2);
      bevel.addColorStop(0,'#8d9fab'); bevel.addColorStop(.25,'#394c5b'); bevel.addColorStop(.7,'#21313d'); bevel.addColorStop(1,'#111d28');
      c.fillStyle=bevel; c.fillRect(0,-thickness/2,length,thickness);
      c.fillStyle='#050e19'; c.fillRect(0,-2.5,length,5);
      c.fillStyle='#35d1ef'; c.shadowColor=P.cyan; c.shadowBlur=5; c.fillRect(0,-1,length,2); c.shadowBlur=0;
      c.restore();
    }
    for (const endpoint of [points[0],points.at(-1)]) {
      c.fillStyle='#101b25'; c.fillRect(endpoint[0]-4,endpoint[1]-4,8,8);
      c.fillStyle='#96a9b5'; c.fillRect(endpoint[0]-3,endpoint[1]-3,6,1.3);
      c.fillStyle=wall.id.includes('arc')||wall.id.includes('elbow')?P.amber:'#829bab'; c.fillRect(endpoint[0]-2,endpoint[1]-1,4,2);
    }
  }
  c.restore();
  return layer;
}
