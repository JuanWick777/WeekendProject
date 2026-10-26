import { PILOTS, NODE_NAMES } from '../game/palette.js';
import { skinPortrait } from '../game/drone-sprites.js';

export const formatClock = (ms) => {
  const seconds = Math.ceil(Math.max(0,ms)/1000);
  return Math.floor(seconds/60).toString().padStart(2,'0') + ':' + (seconds%60).toString().padStart(2,'0');
};
export function createGameShell(root,{onMenu,onCamera}) {
  root.innerHTML = `<section class="online-arena">
    <header class="game-topbar"><div class="brand-logo">Cyber<b>Grid</b><small>BREACH & SYNC</small></div>
      <div class="match-strip"><div class="metric"><span>PARTIDA</span><strong id="round-time"></strong><small>CONTROL DE NODOS</small></div>
      <div class="metric"><span>NODO ACTIVO</span><strong id="active-node"></strong><small id="next-node"></small></div>
      <div class="metric"><span>ROTACIÓN</span><strong id="rotation-time"></strong><small id="node-status"></small></div></div>
      <div class="game-actions"><button type="button" data-game-menu aria-label="Abrir menú de partida">☰</button><button type="button" data-camera aria-label="Cambiar encuadre">Vista</button></div>
    </header>
    <div class="playfield"><aside class="score-panel"><div class="score-head">PILOTOS <span>PUNTOS</span></div><div id="online-roster"></div>
      <div class="player-detail"><strong id="local-name"></strong><div class="hud-label">VIDA <span id="local-hp"></span></div><div class="hud-track"><div id="hp-fill"></div></div>
      <div class="hud-label">ESCUDO <span id="local-shield"></span></div><div class="hud-track"><div id="shield-fill"></div></div><p id="local-stats"></p></div>
      <p class="mode-note">Todos los drones comparten atributos.<br>Una carga bloquea un impacto.</p></aside>
      <div class="arena-column"><div class="game-stage"><canvas id="game" tabindex="0" aria-label="Arena online. WASD o flechas para mover; ratón para apuntar y clic para disparar."></canvas>
      <div id="game-status" class="game-status" role="status"></div><div id="respawn-status" class="respawn-status" hidden></div>
      <div class="touch-controls"><button id="move-pad" class="control-pad" aria-label="Arrastrar para moverse"><span class="stick"></span><span class="pad-label">MOVER</span></button>
      <button id="aim-pad" class="control-pad" aria-label="Arrastrar para apuntar y disparar"><span class="stick"></span><span class="pad-label">APUNTAR / DISPARAR</span></button></div></div>
      <div class="controls-legend"><span class="desktop-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / flechas · Mover</span><strong id="capture-status"></strong><span class="desktop-hint">Ratón · Apuntar / Clic · Disparar</span><span class="touch-hint">Pad izquierdo: mover · Pad derecho: apuntar y disparar</span></div>
    </div></div>
    <details class="diagnostics"><summary>Conexión y diagnóstico</summary><span id="net-diagnostic"></span> · <span id="fps"></span> · <output id="player-state" data-testid="player-state"></output></details>
  </section>`;
  root.querySelector('.online-arena').dataset.touch=String(matchMedia('(pointer: coarse)').matches||(navigator.maxTouchPoints>0&&innerWidth<=900));
  const $ = (id) => root.querySelector('#'+id); let rosterIds = '';
  root.querySelector('[data-game-menu]').addEventListener('click',onMenu);
  root.querySelector('[data-camera]').addEventListener('click',onCamera);
  function update(state,userId,serverTime,network,rtt) {
    const ids = state.players.map((p) => p.id).join(',');
    if (ids !== rosterIds) {
      rosterIds = ids; $('online-roster').replaceChildren();
      state.players.forEach((p,index) => {
        const row = document.createElement('div'); row.className = 'rival'; row.style.setProperty('--accent',PILOTS[index%4].color);
        const img = document.createElement('img'); img.src = skinPortrait(index); img.alt = ''; img.width = 48; img.height = 48;
        const content = document.createElement('div');content.className='rival-main';
        content.innerHTML='<div class="rival-top"><strong></strong><b></b></div><span class="rival-name"></span><div class="rival-life"><i></i></div><small></small>';
        row.append(img,content);$('online-roster').append(row);
      });
    }
    state.players.forEach((p,index) => {
      const row = $('online-roster').children[index]; const content=row.querySelector('.rival-main');
      row.classList.toggle('is-player',p.id===userId);row.classList.toggle('eliminated',p.forfeited);
      content.querySelector('strong').textContent='P'+(index+1)+(p.id===userId?' · TÚ':'');
      content.querySelector('b').textContent=p.score+' pts';
      content.querySelector('.rival-name').textContent=p.displayName;
      content.querySelector('i').style.width=p.hp+'%';
      content.querySelector('small').textContent=p.forfeited?'ABANDONÓ':!p.connected?'SIN CONEXIÓN':!p.alive?'REAPARECIENDO':p.hp+' HP'+(p.shieldCharges?' · ◈ ESCUDO':'');
    });
    const local=state.players.find((p)=>p.id===userId);
    $('round-time').textContent=formatClock(state.remainingMs-Math.max(0,serverTime-state.serverTimeMs));
    $('active-node').textContent=NODE_NAMES[state.objective.activeNodeId];
    $('rotation-time').textContent=formatClock(state.objective.changesAtMs-serverTime);
    $('next-node').textContent=state.objective.nextNodeId?'Siguiente: '+NODE_NAMES[state.objective.nextNodeId]:'1 PUNTO / SEGUNDO';
    const owner=state.players.find((p)=>p.id===state.objective.controllerId);
    const status=state.objective.status==='contested'?'DISPUTADO · SIN PUNTOS':owner?'CONTROLA '+owner.displayName:'VACÍO · ENTRA AL NODO';
    $('node-status').textContent=status;$('capture-status').textContent=status;
    $('game-status').textContent=network!=='connected'?'SIN CONEXIÓN · REINTENTANDO':state.remainingMs<=0?'ESPERANDO RESULTADO DEL SERVIDOR':status;
    $('net-diagnostic').textContent=network+' · '+(rtt===null?'RTT pendiente':rtt+' ms');
    if (local) {
      $('local-name').textContent=local.displayName;$('local-hp').textContent=local.hp+' / 100';
      $('hp-fill').style.width=local.hp+'%';$('local-shield').textContent=local.shieldCharges?'1 IMPACTO':'SIN ESCUDO';
      $('shield-fill').style.width=local.shieldCharges?'100%':'0%';
      $('local-stats').textContent=local.score+' puntos · '+local.kills+' bajas · '+local.deaths+' muertes';
      $('respawn-status').hidden=local.alive;
      $('respawn-status').textContent=local.forfeited?'HAS ABANDONADO':'REAPARECES EN '+(local.respawnRemainingMs/1000).toFixed(1)+' s';
    }
  }
  return {$,canvas:$('game'),movePad:$('move-pad'),aimPad:$('aim-pad'),update,
    authoritative(state,userId) {
      const p=state.players.find((p)=>p.id===userId);if(!p)return;
      Object.assign($('player-state').dataset,{playerX:p.x,playerY:p.y,hp:p.hp,shield:p.shieldCharges,alive:p.alive,matchId:state.matchId,seq:p.lastProcessedSeq});
      $('player-state').textContent='x '+p.x.toFixed(1)+' · y '+p.y.toFixed(1)+' · HP '+p.hp;
    }};
}
