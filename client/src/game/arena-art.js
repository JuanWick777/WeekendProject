// Generated from A's original Canvas functions by scripts/import-a-design.js.
export function createArenaArt(arena) {
const map = { width: arena.designWidth, height: arena.designHeight, spawns: [{"id":"S1","x":214.42673674602665,"y":147.5783941590986},{"id":"S2","x":1240.0503715467153,"y":148.55148996415008},{"id":"S3","x":218.3190655634702,"y":909.5086530151488},{"id":"S4","x":1241.9964594883272,"y":908.5355572100972}] };
const seeded=(x,y,z=0)=>{let n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453123;return n-Math.floor(n);};
const floorOutline=[
 [160,100],[280,100],[280,120],[300,140],[420,140],[480,80],[560,80],[560,60],
 [900,60],[900,80],[980,80],[1040,140],[1160,140],[1180,120],[1180,100],
 [1300,100],[1300,200],[1280,200],[1280,320],[1300,320],[1300,760],
 [1280,760],[1280,860],[1300,860],[1300,960],[1180,960],[1180,940],
 [1160,920],[1040,920],[980,980],[900,980],[900,1000],[560,1000],
 [560,980],[460,980],[420,920],[300,920],[280,940],[280,960],
 [160,960],[160,860],[180,860],[180,760],[160,760],[160,320],
 [180,320],[180,200],[160,200]
];
function pathFloor(c){
 c.beginPath();floorOutline.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
}
function drawOutside(c){
 const g=c.createLinearGradient(0,0,map.width,map.height);
 g.addColorStop(0,'#07131f');g.addColorStop(.5,'#132333');g.addColorStop(1,'#07111b');
 c.fillStyle=g;c.fillRect(0,0,map.width,map.height);
 c.save();c.strokeStyle='rgba(59,130,158,.17)';c.lineWidth=1;
 for(let x=0;x<map.width;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,map.height);c.stroke();}
 for(let y=0;y<map.height;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(map.width,y);c.stroke();}
 c.restore();
}
function drawFloor(c){
 c.save();
 c.shadowColor='#000';c.shadowBlur=38;c.shadowOffsetY=13;
 pathFloor(c);c.fillStyle='#111e29';c.fill();c.restore();
 c.save();pathFloor(c);c.clip();
 const grad=c.createLinearGradient(160,60,1250,1000);
 grad.addColorStop(0,'#34444f');grad.addColorStop(.46,'#2e3c47');grad.addColorStop(1,'#25333d');
 c.fillStyle=grad;c.fillRect(145,50,1170,960);
 // Losetas de acero con juntas, variación sutil y textura procedimental determinista.
 const tile=40;
 for(let y=60;y<=1000;y+=tile){for(let x=160;x<=1300;x+=tile){
   const r=seeded(x,y),shade=Math.floor(r*19);
   c.fillStyle=`rgba(${shade+5},${shade+10},${shade+13},${(.035+r*.055).toFixed(3)})`;
   c.fillRect(x+1,y+1,tile-2,tile-2);
   c.strokeStyle='rgba(6,17,26,.32)';c.lineWidth=1;c.strokeRect(x+.5,y+.5,tile,tile);
   c.strokeStyle='rgba(151,183,195,.10)';c.beginPath();c.moveTo(x+2,y+2);c.lineTo(x+tile-3,y+2);c.stroke();
   if(r>.44){c.fillStyle='rgba(5,14,21,.5)';c.fillRect(x+4,y+4,2,2);c.fillRect(x+tile-6,y+tile-6,2,2);}
   if(r>.85){c.strokeStyle='rgba(164,195,206,.18)';c.lineWidth=.8;c.beginPath();c.moveTo(x+11,y+24);c.lineTo(x+27,y+22);c.stroke();}
 }}
 // Zonas de mantenimiento integradas en las losetas, no agregan obstáculos.
 for(const [vx,vy,vw,vh] of [[474,170,32,88],[949,170,32,88],[474,825,32,88],[949,825,32,88],[230,468,30,124],[1198,468,30,124],[685,327,72,25],[685,733,72,25]]){
  c.fillStyle='#172730';c.fillRect(vx,vy,vw,vh);
  c.strokeStyle='#617481';c.lineWidth=2;c.strokeRect(vx+1,vy+1,vw-2,vh-2);
  c.save();c.beginPath();c.rect(vx+4,vy+4,vw-8,vh-8);c.clip();
  c.strokeStyle='rgba(99,143,159,.33)';c.lineWidth=2;
  for(let k=-vh;k<vw+vh;k+=8){c.beginPath();c.moveTo(vx+k,vy);c.lineTo(vx+k+vh,vy+vh);c.stroke();}
  c.restore();
 }
 // Plataforma industrial concéntrica del núcleo, por debajo del nodo central.
 c.save();c.translate(719,537);
 for(const [rad,col,width] of [[141,'rgba(5,16,23,.35)',14],[125,'rgba(130,154,166,.16)',3],[110,'rgba(6,17,26,.6)',5],[83,'rgba(151,171,177,.22)',2]]){
  c.beginPath();c.arc(0,0,rad,0,Math.PI*2);c.strokeStyle=col;c.lineWidth=width;c.stroke();
 }
 c.strokeStyle='rgba(58,198,225,.32)';c.lineWidth=3;
 for(let j=0;j<12;j++){
  const a=j*Math.PI/6+.08;c.beginPath();c.arc(0,0,131,a,a+.28);c.stroke();
 }
 c.restore();
 // Costuras de sector discretas: se leen sin tapar jugadores ni disparos.
 c.textAlign='center';c.textBaseline='middle';c.font='700 22px system-ui';
 for(const [name,x,y] of [['SECTOR A',719,109],['SECTOR B',1191,426],['SECTOR C',719,846],['SECTOR D',275,426]]){
  c.fillStyle='rgba(6,16,25,.55)';c.fillText(name,x+1,y+2);
  c.fillStyle='rgba(160,199,218,.70)';c.fillText(name,x,y);
 }
 // Pequeñas luces ambientales colocadas en suelo, no crean colisiones.
 for(const [lx,ly] of [[350,120],[1100,120],[350,922],[1100,922],[182,415],[1278,415],[182,658],[1278,658],[550,510],[900,510]]){
  c.fillStyle='#0a1c26';c.fillRect(lx-8,ly-5,16,10);
  c.fillStyle='#18728a';c.fillRect(lx-6,ly-2,12,4);
  c.fillStyle='#65e4ff';c.fillRect(lx-4,ly-2,8,2);
 }
 // Sombreado lateral mantiene aspecto de recinto iluminado desde arriba.
 const shade=c.createRadialGradient(719,533,150,719,533,735);
 shade.addColorStop(0,'rgba(5,14,22,0)');shade.addColorStop(1,'rgba(4,10,17,.42)');
 c.fillStyle=shade;c.fillRect(145,50,1170,960);
 c.restore();
 // Perfil del piso, separado de las colisiones reales.
 c.save();pathFloor(c);c.strokeStyle='#060f17';c.lineWidth=29;c.stroke();
 pathFloor(c);c.strokeStyle='#475563';c.lineWidth=18;c.stroke();
 pathFloor(c);c.strokeStyle='#91a9b7';c.lineWidth=4;c.stroke();
 c.restore();
}
function strokeSegment(c,w){
 // Cada segmento representa la misma pared del JSON: cambia solamente la apariencia.
 const dx=w.x2-w.x1,dy=w.y2-w.y1,len=Math.hypot(dx,dy);
 if(len<.1)return;
 c.save();c.translate(w.x1,w.y1);c.rotate(Math.atan2(dy,dx));
 c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=12;c.shadowOffsetY=5;
 c.fillStyle='#0a131c';c.fillRect(-5,-12,len+10,26);
 c.shadowBlur=0;c.shadowOffsetY=0;
 const g=c.createLinearGradient(0,-11,0,11);
 g.addColorStop(0,'#aab8c4');g.addColorStop(.13,'#687f8e');
 g.addColorStop(.21,'#253945');g.addColorStop(.78,'#1a2935');
 g.addColorStop(.91,'#758a99');g.addColorStop(1,'#0a151e');
 c.fillStyle=g;c.fillRect(-4,-11,len+8,22);
 c.fillStyle='#101d28';c.fillRect(0,-6,len,12);
 c.fillStyle='rgba(187,212,220,.38)';c.fillRect(-1,-9,len+2,2);
 c.fillStyle='rgba(0,0,0,.42)';c.fillRect(-1,8,len+2,2);
 // Banda de energía azulado/cobre: la categoría fixed/modify nunca se muestra.
 const salt=seeded(w.x1/20,w.y1/20,w.x2/20+w.y2/20);
 const glow=salt>.76?'#ffad43':'#2ebee3';
 c.shadowColor=glow;c.shadowBlur=6;c.fillStyle=glow;c.globalAlpha=.82;
 c.fillRect(5,-1,Math.max(0,len-10),2.5);
 c.shadowBlur=0;c.globalAlpha=1;
 // Tornillos y uniones de panel cada cierto tramo.
 c.fillStyle='#07121b';c.strokeStyle='#829aab';c.lineWidth=1;
 for(let x=12;x<len-6;x+=75){c.beginPath();c.arc(x,-7,2.3,0,Math.PI*2);c.fill();c.stroke();}
 c.restore();
}
function drawNode(c,n){
 c.save();c.translate(n.x,n.y);
 // Marcador apagado, la señal de nodo activo se superpone en render().
 const halo=c.createRadialGradient(0,0,8,0,0,57);
 halo.addColorStop(0,'rgba(37,147,187,.17)');halo.addColorStop(1,'rgba(37,147,187,0)');
 c.fillStyle=halo;c.fillRect(-57,-57,114,114);
 c.strokeStyle='#0b1720';c.lineWidth=8;c.beginPath();c.arc(0,0,42,0,Math.PI*2);c.stroke();
 c.setLineDash([9,7]);c.lineWidth=2.5;c.strokeStyle='rgba(81,220,246,.72)';
 c.beginPath();c.arc(0,0,43,0,Math.PI*2);c.stroke();c.setLineDash([]);
 c.lineWidth=2;c.strokeStyle='#718d9c';c.beginPath();c.arc(0,0,28,0,Math.PI*2);c.stroke();
 c.fillStyle='#142c38';c.strokeStyle='#37c8e7';c.lineWidth=3;c.beginPath();c.arc(0,0,19,0,Math.PI*2);c.fill();c.stroke();
 c.fillStyle='#b5f0fb';c.font='bold 15px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(n.id,0,0);
 c.restore();
}
function drawSpawn(c,s){
 const x=s.x,y=s.y;c.save();c.translate(x,y);
 // Hangar circular/elevador mecánico, no tapa el dron colocado encima.
 c.fillStyle='rgba(3,14,22,.55)';c.fillRect(-37,-37,74,74);
 c.strokeStyle='#718795';c.lineWidth=5;c.strokeRect(-36,-36,72,72);
 c.strokeStyle='#31c9e7';c.lineWidth=2.5;c.strokeRect(-30,-30,60,60);
 c.strokeStyle='rgba(39,218,246,.22)';c.lineWidth=1;
 for(let q=-18;q<=18;q+=12){c.beginPath();c.moveTo(-29,q);c.lineTo(29,q);c.stroke();}
 c.strokeStyle='#4b7584';c.lineWidth=3;c.beginPath();c.moveTo(-24,-24);c.lineTo(24,24);c.moveTo(-24,24);c.lineTo(24,-24);c.stroke();
 for(const q of [-31,31])for(const t of [-31,31]){c.fillStyle='#f5b34f';c.fillRect(q-3,t-3,6,6);}
 c.font='800 15px system-ui';c.textAlign='center';c.fillStyle='#c7e7f0';c.fillText('SPAWN '+s.id,-1,58);
 c.restore();
}
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
