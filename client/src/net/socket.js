import { PROTOCOL_VERSION } from '@cybergrid/shared/protocol';

export function createConnection({ onMessage = () => {}, onStatus = () => {}, onExpired = () => {}, onRtt = () => {},
  url = new URL('/ws',globalThis.location.href).href.replace(/^http/,'ws'), Socket = WebSocket,
  now = () => performance.now(), retryWindowMs = 15000 } = {}) {
  let socket = null; let stopped = false; let ready = false; let seq = 0; let retry = null; let ping = null;
  let attempt = 0; let disconnectedAt = null; let pingId = 0; const pings = new Map();
  function status(value) { onStatus(value); }
  function clearTimers() { clearTimeout(retry); clearInterval(ping); retry = null; ping = null; pings.clear(); }
  function send(type,payload) {
    if (!ready || socket?.readyState !== 1 || socket.bufferedAmount > 65536) return false;
    socket.send(JSON.stringify({type,payload})); return true;
  }
  function stop() { stopped = true; ready = false; clearTimers(); const old = socket; socket = null; old?.close(); }
  function schedule() {
    if (stopped) return;
    disconnectedAt ??= now();
    if (now() - disconnectedAt >= retryWindowMs) { status('offline'); return; }
    status('reconnecting');
    retry = setTimeout(open,Math.min(500 * 2 ** attempt++,3000));
  }
  function open() {
    if (stopped) return;
    clearTimers(); ready = false; status(attempt ? 'reconnecting' : 'connecting');
    const ws = new Socket(url); socket = ws;
    ws.addEventListener('message',(event) => {
      if (socket !== ws || stopped) return;
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'welcome') {
        if (message.payload.protocolVersion !== PROTOCOL_VERSION) {
          stop(); onMessage({type:'error',payload:{code:'CLIENT_VERSION',message:'La versión cambió. Recarga esta página para continuar.'}}); status('offline'); return;
        }
        seq = message.payload.nextInputSeq; ready = true; attempt = 0; disconnectedAt = null;
        status('connected');
        ping = setInterval(() => { const id = pingId++; const at = now(); pings.set(id,at);
          if (pings.size > 5) pings.delete(pings.keys().next().value);
          send('ping',{id,sentAtMs:at});
        },2000);
      }
      if (message.type === 'pong') {
        const at = pings.get(message.payload.id); if (at !== undefined) { onRtt(Math.round(now() - at)); pings.delete(message.payload.id); }
      }
      onMessage(message);
    });
    ws.addEventListener('error',() => {});
    ws.addEventListener('close',(event) => {
      if (socket !== ws || stopped) return;
      socket = null; ready = false; clearTimers();
      if (event.code === 4401) { stop(); onExpired(); return; }
      if (event.code === 4001) { stopped = true; status('replaced'); return; }
      schedule();
    });
  }
  return {
    get ready() { return ready; },
    start() { if (socket || retry) return; stopped = false; attempt = 0; disconnectedAt = null; open(); },
    reconnect() { stop(); stopped = false; attempt = 0; disconnectedAt = null; open(); },
    stop,
    sendInput(input) { const current = seq; if (!send('input',{seq:current,...input})) return null; seq++; return current; },
  };
}
