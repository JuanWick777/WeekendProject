import { skinPortrait } from '../game/drone-sprites.js';
import { PILOTS } from '../game/palette.js';

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const portrait = (index) => '<img class="pilot-portrait" src="'+skinPortrait(index)+'" width="64" height="64" alt="">';
export function menuTemplate() {
  return `<section class="menu-art" aria-label="Menú principal"><h1 class="mobile-logo">Cyber<span>Grid</span></h1>
    <button class="menu-action menu-play" data-action="play"><span>Jugar</span></button>
    <button class="menu-action menu-help" data-action="help"><span>Cómo jugar</span></button>
    <button class="menu-action menu-exit" data-action="logout"><span>Salir</span></button></section>
    <p class="menu-caption">CONTROL DE NODOS ROTATORIOS · 2–4 JUGADORES</p>
    ${import.meta.env.DEV?'<a class="practice-link" href="?practice=1">Abrir práctica local de diseño</a>':''}`;
}
export function authTemplate(register,draft={}) {
  return `<section class="panel auth-panel"><p class="eyebrow">ACCESO A LA RED</p><h1>${register?'CREAR CUENTA':'INICIAR SESIÓN'}</h1>
    <div class="auth-tabs"><button data-action="login-tab" aria-pressed="${!register}">Iniciar sesión</button><button data-action="register-tab" aria-pressed="${register}">Crear cuenta</button></div>
    <form id="auth-form"><label>Usuario<input name="username" autocomplete="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" required value="${escapeHtml(draft.username)}" placeholder="Tu usuario"></label>
    ${register?'<label>Nombre del piloto<input name="displayName" autocomplete="nickname" maxlength="20" required value="'+escapeHtml(draft.displayName)+'" placeholder="Nombre visible"></label>':''}
    <label>Contraseña<input name="password" type="password" minlength="8" maxlength="128" autocomplete="${register?'new-password':'current-password'}" required placeholder="Mínimo 8 caracteres"></label>
    <p class="form-note">Usuario de 3–20 letras, números o guiones bajos. Todas las apariencias comparten atributos.</p>
    <button class="neon-button" type="submit">${register?'REGISTRARME':'ENTRAR'}</button></form>
    <button class="text-button" data-action="menu">Volver al menú</button></section>`;
}
export function roomsTemplate(user) {
  return `<section class="panel"><p class="eyebrow">PILOTO · ${escapeHtml(user.displayName)}</p><h1>CREAR O UNIRSE A SALA</h1><div class="two-columns">
    <form id="create-form" class="inner-panel"><h2>CREAR SALA</h2><p>Inicia una partida con tus amigos.</p><div class="mode-emblem">⬡</div><h3>Control de nodos rotatorios</h3><p>2 a 4 jugadores · Ronda de 150 segundos</p>
      <label>Nombre de la sala<input name="name" maxlength="32" required placeholder="Ej. Red de los primos" autocomplete="off"></label>
      <button type="submit" class="neon-button" data-needs-net>CREAR SALA</button></form>
    <form id="join-form" class="inner-panel"><h2>UNIRSE A SALA</h2><p>Introduce el código que te compartan.</p><div class="mode-emblem">⌘</div>
      <label>Código de sala<input name="code" id="join-code" minlength="6" maxlength="6" pattern="[A-Z0-9]{6}" required placeholder="ABC123" autocapitalize="characters" autocomplete="off" spellcheck="false"></label><p class="form-note">Seis letras o números. No distingue mayúsculas.</p>
      <button type="submit" class="neon-button" data-needs-net>UNIRSE</button></form></div><button class="text-button" data-action="menu">‹ VOLVER AL MENÚ</button></section>`;
}
export function lobbyTemplate(room,user) {
  const me=room.players.find(p=>p.id===user.id),host=room.hostId===user.id;
  const canStart=room.status==='lobby'&&room.players.length>=2&&room.players.every(p=>p.ready&&p.connected);
  const slots=Array.from({length:4},(_,index)=>{
    const p=room.players[index];if(!p)return '<div class="lobby-player empty"><b>＋</b><span>ESPACIO DISPONIBLE</span></div>';
    return '<div class="lobby-player" style="--accent:'+PILOTS[index].color+'">'+portrait(index)+'<div><strong>'+escapeHtml(p.displayName)+'</strong><small>'+(p.id===user.id?'TÚ · ':'')+(p.id===room.hostId?'ANFITRIÓN':'PILOTO')+'</small></div><span class="ready-badge '+(p.ready&&p.connected?'is-ready':'')+'">'+(!p.connected?'SIN CONEXIÓN':p.ready?'LISTO':'NO LISTO')+'</span></div>';
  }).join('');
  return `<section class="panel"><p class="eyebrow">CONTROL DE NODOS</p><h1>LOBBY DE PARTIDA</h1><p class="room-name">${escapeHtml(room.name)}</p><div class="lobby-grid">
    <div class="inner-panel"><h2>JUGADORES EN LA SALA</h2><div class="lobby-players">${slots}</div></div>
    <aside class="inner-panel room-info"><h2>SALA PRIVADA</h2><label>Código de sala<div class="code-row"><input id="room-code" readonly value="${escapeHtml(room.code)}" aria-label="Código de sala"><button data-action="copy-code" aria-label="Copiar código de sala">▣</button></div></label>
      <p>⌘ Modo: Control de nodos</p><p>♟ Jugadores: ${room.players.length} / 4</p><p>◷ Ronda: 150 segundos</p>
      <p id="asset-status" role="status"></p><button class="text-button" data-action="assets" hidden>Reintentar carga</button>
      <output id="countdown" class="countdown" aria-live="polite"></output>
      ${['lobby','countdown'].includes(room.status)?'<button class="neon-button" data-action="ready" data-needs-net data-needs-art>'+ (me?.ready?'CANCELAR LISTO':'LISTO')+'</button>':''}
      ${host&&room.status==='lobby'?'<button class="neon-button secondary" data-action="start" data-needs-net data-needs-art data-blocked="'+!canStart+'">INICIAR PARTIDA</button>':''}
      ${host&&room.status==='finished'?'<button class="neon-button" data-action="rematch" data-needs-net>PREPARAR REVANCHA</button>':''}
      <p class="form-note">${room.status==='finished'?'Ronda finalizada. El anfitrión puede preparar otra.':room.status==='playing'?'Recuperando la partida…':host?'Para iniciar: al menos dos pilotos, todos listos y conectados.':'El anfitrión inicia cuando todos estén listos.'}</p>
    </aside></div><button class="text-button" data-action="leave" data-needs-net>‹ SALIR DE SALA</button></section>`;
}
export function helpTemplate() {
  const rules=[
    ['ENCUENTRA EL NODO','Hay cinco ubicaciones; solo una está activa.'],
    ['CONTROL INDIVIDUAL','Si eres el único jugador vivo en la zona, ganas 1 punto por segundo.'],
    ['ZONA DISPUTADA','Con dos o más jugadores vivos dentro, nadie obtiene puntos.'],
    ['ROTACIÓN','Centro → norte → este → sur → oeste. Cambia cada 30 s y se anuncia 5 s antes.'],
    ['DISPARA Y MUÉVETE','Muévete y apunta de forma independiente, también simultáneamente.'],
    ['GANA POR PUNTOS','La ronda dura 150 s. Desempates: bajas y después menos muertes. Si persiste, empate.'],
  ];
  return `<section class="panel help-panel"><h1>CÓMO JUGAR</h1><p class="eyebrow">CONTROL DE NODOS ROTATORIOS</p><div class="rules-grid">${rules.map(([title,body],i)=>'<article class="inner-panel"><b class="rule-number">0'+(i+1)+'</b><h2>'+title+'</h2><p>'+body+'</p></article>').join('')}</div>
    <div class="two-columns help-controls"><article class="inner-panel"><h2>⌨ PC</h2><p><kbd>WASD</kbd> / flechas para mover. Ratón para apuntar; clic izquierdo mantenido para disparar.</p></article><article class="inner-panel"><h2>◉ MÓVIL</h2><p>Pad izquierdo para mover; pad derecho para apuntar y disparar al arrastrar. Ambos funcionan a la vez.</p></article></div>
    <p class="help-foot">El escudo absorbe una bala, no caduca y se pierde al morir. Hay cuatro recogidas iniciales y después una aleatoria a la vez, con espera de 15 s. Reapareces a los 3 s y conservas tus puntos. El menú online no pausa la ronda.</p>
    <button class="neon-button compact" data-action="help-back">‹ REGRESAR</button></section>`;
}
export function resultsTemplate(result,room,user,slots) {
  const sorted=[...result.players].sort((a,b)=>Number(a.forfeited)-Number(b.forfeited)||b.score-a.score||b.kills-a.kills||a.deaths-b.deaths);
  const names=result.players.filter(p=>p.playerId===result.winnerId||result.drawPlayerIds.includes(p.playerId)).map(p=>p.displayName);
  const heading=result.status==='aborted'?'RONDA INTERRUMPIDA':result.winnerId?'¡GANADOR: '+names[0]+'!':'EMPATE · '+names.join(' / ');
  return `<section class="panel results-panel" data-match-id="${escapeHtml(result.matchId)}"><p class="eyebrow">RESULTADOS DE LA PARTIDA</p><h1>${escapeHtml(heading)}</h1>
    <p>${result.finishReason==='forfeit'?'Fin por abandono':'Clasificación por puntos de control'} · ${(result.durationMs/1000).toFixed(1)} segundos</p>
    <div class="final-ranks">${sorted.map((p,index)=>{
      const skin=slots[p.playerId];const color=PILOTS[skin??index%4].color;
      return '<article class="final-rank '+(p.won?'winning':'')+'" style="--accent:'+color+'"><b class="rank-place">'+(p.draw?'1':index+1)+'.º</b>'+ (skin===undefined?'<span class="unknown-portrait">⬡</span>':portrait(skin))+'<div><strong>'+escapeHtml(p.displayName)+'</strong><small>'+p.kills+' bajas · '+p.deaths+' muertes · '+(p.controlTimeMs/1000).toFixed(1)+' s de control'+(p.forfeited?' · ABANDONÓ':'')+'</small></div><b class="rank-score">'+p.score+' pts</b></article>';
    }).join('')}</div>
    <p id="persistence-status" data-testid="persistence-status" role="status"></p>
    <div class="result-actions">${room?.hostId===user.id?'<button class="neon-button danger" data-action="rematch" data-needs-net>NUEVA PARTIDA</button>':'<p class="waiting-host">Esperando que el anfitrión prepare la revancha.</p>'}
    <button class="neon-button" data-action="lobby">VOLVER AL LOBBY</button></div>
    <button class="text-button" data-action="leave" data-needs-net>SALIR DE SALA</button></section>`;
}
