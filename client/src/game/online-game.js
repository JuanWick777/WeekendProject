import { createRenderer } from './renderer.js';
import { preloadSkins } from './drone-sprites.js';
import { createControls } from '../input/controls.js';
import { createSnapshotBuffer } from './snapshot-buffer.js';
import { createGameShell } from '../ui/game-shell.js';

export async function createOnlineGame(root,{payload,userId,connection,onMenu}) {
  await preloadSkins();
  let zoom=(matchMedia('(pointer: coarse)').matches||(navigator.maxTouchPoints>0&&innerWidth<=900))?2:1;let menu=false;let network='connected';let rtt=null;
  let running=true;let raf;let effects=[];let hudAt=0;let fpsAt=performance.now();let frameCount=0;
  const seen=new Set();const abort=new AbortController();const options={signal:abort.signal};
  const shell=createGameShell(root,{onMenu,onCamera:()=>{zoom=zoom===1?2:1;}});
  const renderer=createRenderer(shell.canvas,payload.map);
  const controls=createControls(shell.canvas,shell.movePad,shell.aimPad);
  const buffer=createSnapshotBuffer(payload.map,userId);
  const enabled=()=>!menu&&!document.hidden&&network==='connected'&&connection.ready;
  const neutral={moveX:0,moveY:0,aimX:1,aimY:0,attack:false};
  buffer.push(payload.state,performance.now());shell.authoritative(payload.state,userId);
  function read() {
    const local=buffer.latest.players.find((p)=>p.id===userId);
    return enabled()&&local?.alive&&!local.forfeited?controls.read(local,renderer.viewport):neutral;
  }
  function stopInput() {controls.clear();buffer.clear();connection.sendInput(neutral);}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInput();},options);
  window.addEventListener('blur',stopInput,options);
  const inputTimer=setInterval(()=>{
    if(!connection.ready)return;
    const input=read();const at=performance.now();const seq=connection.sendInput(input);
    if(seq!==null)buffer.record(seq,input,at);
  },50);
  function frame(at) {
    if(!running)return;
    const current=buffer.latest;const input=read();const visual=buffer.render(at,input,enabled());
    effects=effects.filter((e)=>at-e.bornAt<800);
    renderer.draw(visual,{localId:userId,time:at,zoom,effects,nodeDurationMs:payload.config.nodeDurationMs});
    if(at>=hudAt){shell.update(current,userId,current.serverTimeMs,network,rtt);hudAt=at+100;}
    frameCount++;
    if(at-fpsAt>=1000){shell.$('fps').textContent=Math.round(frameCount*1000/(at-fpsAt))+' FPS';frameCount=0;fpsAt=at;}
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);shell.canvas.focus();
  return {
    snapshot(state){buffer.push(state,performance.now());shell.authoritative(state,userId);},
    event(event){if(seen.has(event.eventId))return;seen.add(event.eventId);if(seen.size>1024)seen.delete(seen.values().next().value);effects.push({...event,bornAt:performance.now()});effects=effects.slice(-80);},
    setNetwork(value){network=value;if(value!=='connected')stopInput();},
    setRtt(value){rtt=value;},
    setMenu(value){menu=value;stopInput();if(!value)shell.canvas.focus();},
    close(){if(!running)return;running=false;controls.clear();buffer.clear();clearInterval(inputTimer);cancelAnimationFrame(raf);controls.destroy();abort.abort();root.replaceChildren();},
  };
}
