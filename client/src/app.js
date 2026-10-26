import { createApi } from './net/api.js';
import { createConnection } from './net/socket.js';
import { preloadSkins } from './game/drone-sprites.js';
import { createOnlineGame } from './game/online-game.js';
import { menuTemplate,authTemplate,roomsTemplate,lobbyTemplate,helpTemplate,resultsTemplate } from './ui/templates.js';

export async function startApp(root) {
  const api=createApi();let game=null;let gameEpoch=0;let sessionEpoch=0;let closed=false;let busy=false;
  let assetsReady=false;let assetsFailed=false;
  let view='menu';let helpReturn='menu';let register=false;let draft={};let user=null;let room=null;let match=null;let result=null;
  let network='closed';let rtt=null;let slots={};let effects=[];const persistence=new Map();
  root.innerHTML=`<header class="app-chrome"><button class="wordmark" data-action="menu" aria-label="Menú principal">Cyber<span>Grid</span></button><span id="session-label"></span><nav><button class="text-button" data-action="help">Cómo jugar</button><button class="text-button" data-action="account">Entrar</button></nav></header>
    <p id="app-message" class="app-message" role="alert" hidden></p><main id="screen"><p class="loading">Conectando con CyberGrid…</p></main>
    <footer class="app-footer"><span id="connection-status" role="status">Comprobando conexión…</span><button class="text-button" data-action="reconnect" hidden>RECONECTAR</button><small>DISEÑO DE A · CYBERGRID</small></footer>
    <dialog id="game-menu" aria-labelledby="game-menu-title"><div class="dialog-panel"><p class="eyebrow">CONEXIÓN EN TIEMPO REAL</p><h2 id="game-menu-title">MENÚ DE PARTIDA</h2><p>La ronda continúa. Tu dron queda quieto y puede recibir daño.</p><p>WASD/flechas y ratón, o los dos pads táctiles. El escudo bloquea un impacto.</p><button class="neon-button" data-action="resume">CONTINUAR</button><button class="text-button danger-text" data-action="abandon">ABANDONAR RONDA</button></div></dialog>`;
  const screen=root.querySelector('#screen');const message=root.querySelector('#app-message');const dialog=root.querySelector('#game-menu');
  const abort=new AbortController();const options={signal:abort.signal};
  const connection=createConnection({
    onMessage:receive,
    onStatus(value){network=value;game?.setNetwork(value);chrome();if(view==='lobby'||view==='rooms')refreshButtons();},
    onExpired(){guest('Tu sesión terminó. Inicia sesión para continuar.');},
    onRtt(value){rtt=value;game?.setRtt(value);chrome();},
  });
  function notice(text='') {message.textContent=text;message.hidden=!text;}
  function stopGame() {gameEpoch++;game?.close();game=null;effects=[];if(dialog.open)dialog.close();}
  function refreshButtons() {
    for(const button of root.querySelectorAll('[data-action],button[type="submit"]')) {
      button.disabled=busy||(button.hasAttribute('data-needs-net')&&(!connection.ready||button.dataset.blocked==='true'))||(button.hasAttribute('data-needs-art')&&!assetsReady);
    }
    root.setAttribute('aria-busy',String(busy));
    const preparing=root.querySelector('#asset-status');if(preparing){preparing.hidden=assetsReady;preparing.textContent=assetsFailed?'No se pudo preparar la arena. Reintenta la carga.':'Preparando arena…';}
    const retryArt=root.querySelector('[data-action="assets"]');if(retryArt)retryArt.hidden=!assetsFailed;
  }
  function chrome() {
    const playing=view==='game';
    root.querySelector('.app-chrome').hidden=playing;root.querySelector('.app-footer').hidden=playing;
    root.querySelector('#session-label').textContent=user?'PILOTO · '+user.displayName:'CONTROL DE NODOS ROTATORIOS';
    root.querySelector('[data-action="account"]').textContent=user?'Cerrar sesión':'Entrar';
    const text={connected:'ONLINE',connecting:'Conectando…',reconnecting:'Reconectando…',offline:'Sin conexión',replaced:'Cuenta abierta en otra pestaña',closed:user?'Sin conexión':'Inicia sesión para jugar'};
    root.querySelector('#connection-status').textContent=(text[network]??network)+(rtt===null?'':' · '+rtt+' ms');
    root.querySelector('[data-action="reconnect"]').hidden=!user||!['offline','replaced'].includes(network);
    document.body.dataset.screen=view;refreshButtons();
  }
  function showPersistence() {
    const output=root.querySelector('#persistence-status');if(!output||!result)return;
    const value=persistence.get(result.matchId)??'pending';
    const labels={pending:'Guardando resultado…',saved:'✓ Resultado guardado en la base de datos',failed:'No se pudo guardar el resultado.',unavailable:'Guardado no disponible.'};
    output.textContent=labels[value]??'Guardando resultado…';output.dataset.status=value;
  }
  function render() {
    if(closed)return;
    if(view==='menu')screen.innerHTML=menuTemplate();
    if(view==='auth')screen.innerHTML=authTemplate(register,draft);
    if(view==='rooms')screen.innerHTML=user?roomsTemplate(user):authTemplate(register,draft);
    if(view==='lobby')screen.innerHTML=room&&user?lobbyTemplate(room,user):roomsTemplate(user);
    if(view==='help')screen.innerHTML=helpTemplate();
    if(view==='results'&&result&&user)screen.innerHTML=resultsTemplate(result,room,user,slots);
    chrome();countdown();showPersistence();
  }
  function countdown() {
    const output=root.querySelector('#countdown');
    if(output)output.textContent=room?.status==='countdown'?'INICIA EN '+Math.max(0,Math.ceil((room.countdownEndsAtMs-Date.now())/1000)):room?.status==='playing'?'ENTRANDO A LA ARENA…':'';
  }
  function guest(text='') {
    sessionEpoch++;stopGame();connection.stop();network='closed';rtt=null;user=null;room=null;match=null;result=null;slots={};view=text?'auth':'menu';register=false;
    try{sessionStorage.removeItem('cybergrid-slots');}catch{/* Storage can be disabled. */}
    render();notice(text);
  }
  function acceptRoom(value) {
    const previous=room;room=value;
    if(!room){stopGame();match=null;result=null;view=user?'rooms':'menu';render();return;}
    if(room.status==='lobby'&&(previous?.status==='finished'||result)){result=null;match=null;stopGame();view='lobby';}
    if(['menu','rooms','lobby','auth'].includes(view))view='lobby';
    if(view!=='game'&&view!=='help'&&view!=='results')render();
  }
  function restoreSlots(id) {
    try {
      const saved=JSON.parse(sessionStorage.getItem('cybergrid-slots')??'null');
      if(saved?.matchId===id&&saved.slots&&Object.values(saved.slots).every(i=>Number.isInteger(i)&&i>=0&&i<4))slots=saved.slots;
    } catch {/* Cosmetic metadata only. */}
  }
  async function startMatch(payload) {
    stopGame();const ticket=gameEpoch;
    match=payload;result=null;view='game';notice();
    slots=Object.fromEntries(payload.state.players.map((p,i)=>[p.id,i]));
    try{sessionStorage.setItem('cybergrid-slots',JSON.stringify({matchId:payload.matchId,slots}));}catch{/* No credentials are stored. */}
    screen.innerHTML='<p class="loading">Cargando arena…</p>';chrome();
    try {
      await preloadSkins();if(ticket!==gameEpoch||view!=='game'||closed)return;
      const mounted=await createOnlineGame(screen,{payload,userId:user.id,connection,onMenu:()=>{game?.setMenu(true);dialog.showModal();}});
      if(ticket!==gameEpoch||view!=='game'||closed){mounted.close();return;}
      game=mounted;game.setNetwork(network);game.setRtt(rtt);
      if(match?.state)game.snapshot(match.state);
      for(const event of effects)game.event(event);effects=[];
    }catch{if(ticket===gameEpoch){notice('No se pudo cargar el arte del juego. Recarga para reintentar.');view='lobby';render();}}
  }
  function receive({type,payload}) {
    if(closed||!user)return;
    if(type==='welcome'){
      const epoch=sessionEpoch;user=payload.user;chrome();
      if(payload.roomCode&&!room)void api.getRoom(payload.roomCode).then(value=>{if(epoch===sessionEpoch&&!room)acceptRoom(value);}).catch(error=>{if(epoch===sessionEpoch)notice(error.message);});
    }
    if(type==='lobby')acceptRoom(payload);
    if(type==='match:start')void startMatch(payload);
    if(type==='state'&&match?.matchId===payload.matchId){match.state=payload;game?.snapshot(payload);}
    if(type==='event'){if(game)game.event(payload);else{effects.push(payload);effects=effects.slice(-80);}}
    if(type==='match:end'){stopGame();result=payload;restoreSlots(result.matchId);view='results';render();}
    if(type==='match:persistence'){persistence.set(payload.matchId,payload.status);if(persistence.size>10)persistence.delete(persistence.keys().next().value);showPersistence();}
    if(type==='error'){
      if(payload.code==='RESULT_NOT_SAVED'&&result){persistence.set(result.matchId,'failed');showPersistence();}
      if(payload.code==='INVALID_PHASE'&&view!=='game')return;
      notice(payload.message);
    }
  }
  async function request(task) {
    if(busy)return;busy=true;notice();refreshButtons();
    try{await task();}catch(error){if(error.status===401&&view!=='auth')guest('Tu sesión terminó. Inicia sesión para continuar.');else notice(error.message);}
    finally{busy=false;refreshButtons();}
  }
  function prepareArt() {
    if(assetsReady)return;assetsFailed=false;refreshButtons();
    void preloadSkins().then(()=>{if(!closed){assetsReady=true;assetsFailed=false;refreshButtons();}},()=>{if(!closed){assetsFailed=true;refreshButtons();}});
  }
  function authenticated(value) {prepareArt();sessionEpoch++;user=value;view='rooms';room=null;result=null;match=null;connection.stop();connection.start();render();}
  async function leave() {
    if(!room)return;const code=room.code;
    await api.leaveRoom(code);if(room?.code===code)acceptRoom(null);
  }
  root.addEventListener('submit',(event)=>{
    const form=event.target;if(!form.matches('form'))return;event.preventDefault();
    if(!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form));
    void request(async()=>{
      if(form.id==='auth-form'){
        draft={username:values.username,displayName:values.displayName};
        const response=await (register?api.register(values):api.login(values));form.reset();authenticated(response.user);
      }
      if(form.id==='create-form'){const response=await api.createRoom(values.name.trim());if(!room)acceptRoom(response);}
      if(form.id==='join-form'){const response=await api.joinRoom(values.code.toUpperCase());if(!room)acceptRoom(response);}
    });
  },options);
  root.addEventListener('input',(event)=>{
    if(event.target.id==='join-code')event.target.value=event.target.value.replace(/[^a-z0-9]/gi,'').toUpperCase();
  },options);
  root.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    const action=button.dataset.action;
    if(action==='assets')prepareArt();
    if(action==='menu'){view='menu';notice();render();}
    if(action==='play'){view=!user?'auth':room?(result?'results':'lobby'):'rooms';notice();render();}
    if(action==='help'){helpReturn=view;view='help';notice();render();}
    if(action==='help-back'){view=helpReturn;render();}
    if(action==='login-tab'||action==='register-tab'){register=action==='register-tab';view='auth';notice();render();}
    if(action==='account'&&!user){view='auth';notice();render();return;}
    if(action==='logout'||(action==='account'&&user)){
      if(!user){view='menu';render();notice('Ya estás en el menú. Puedes cerrar esta pestaña.');return;}
      void request(async()=>{if(room)await leave();await api.logout();guest();});
    }
    if(action==='ready'&&room)void request(()=>api.ready(room.code,!room.players.find(p=>p.id===user.id)?.ready));
    if(action==='start'&&room)void request(()=>api.start(room.code));
    if(action==='rematch'&&room)void request(()=>api.rematch(room.code));
    if(action==='lobby'){view='lobby';notice();render();}
    if(action==='leave')void request(leave);
    if(action==='copy-code'&&room)void navigator.clipboard.writeText(room.code).then(()=>notice('Código copiado: '+room.code),()=>{root.querySelector('#room-code')?.select();notice('Selecciona y copia el código de sala.');});
    if(action==='reconnect')void request(async()=>{await api.me();connection.reconnect();});
    if(action==='resume'){dialog.close();game?.setMenu(false);}
    if(action==='abandon')void request(async()=>{await leave();if(dialog.open)dialog.close();});
  },options);
  dialog.addEventListener('cancel',()=>{game?.setMenu(false);},options);
  window.addEventListener('keydown',(event)=>{if(event.code==='Escape'&&view==='game'&&!dialog.open){event.preventDefault();game?.setMenu(true);dialog.showModal();}},options);
  window.addEventListener('online',()=>{if(user&&network!=='replaced'&&!connection.ready)connection.reconnect();},options);
  const timer=setInterval(countdown,100);
  const close=()=>{if(closed)return;closed=true;stopGame();connection.stop();clearInterval(timer);abort.abort();};
  window.addEventListener('pagehide',close,{...options,once:true});
  render();
  const bootEpoch=sessionEpoch;
  try{const response=await api.me();if(!closed&&bootEpoch===sessionEpoch){authenticated(response.user);if(response.roomCode){const value=await api.getRoom(response.roomCode);if(!room)acceptRoom(value);}}}
  catch(error){if(error.status!==401&&!closed)notice(error.message);}
  return close;
}
