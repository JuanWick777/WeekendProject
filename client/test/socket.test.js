import { afterEach,describe,it,expect,vi } from 'vitest';
import { createConnection } from '../src/net/socket.js';
import { PROTOCOL_VERSION } from '@cybergrid/shared/protocol';
class Socket {
  static instances=[];
  constructor(){this.listeners=new Map();this.readyState=1;this.bufferedAmount=0;this.sent=[];Socket.instances.push(this);}
  addEventListener(type,fn){this.listeners.set(type,fn);}
  emit(type,value){this.listeners.get(type)?.(value);}
  welcome(nextInputSeq=0){this.emit('message',{data:JSON.stringify({type:'welcome',payload:{protocolVersion:PROTOCOL_VERSION,nextInputSeq}})});}
  send(value){this.sent.push(JSON.parse(value));}
  close(){this.readyState=3;this.emit('close',{code:1000});}
}
const input={moveX:1,moveY:0,aimX:1,aimY:0,attack:false};
afterEach(()=>{vi.useRealTimers();Socket.instances=[];});
describe('conexión y secuencias',()=>{
  it('espera welcome y reinicia secuencias al recuperar la conexión',async()=>{
    vi.useFakeTimers();const connection=createConnection({url:'ws://local/ws',Socket});connection.start();
    const first=Socket.instances[0];expect(connection.sendInput(input)).toBeNull();first.welcome(7);
    expect(connection.sendInput(input)).toBe(7);expect(first.sent[0].payload.seq).toBe(7);
    first.emit('close',{code:1006});expect(connection.ready).toBe(false);
    await vi.advanceTimersByTimeAsync(500);const next=Socket.instances[1];next.welcome(0);
    expect(connection.sendInput(input)).toBe(0);connection.stop();
    await vi.advanceTimersByTimeAsync(20000);expect(Socket.instances).toHaveLength(2);
  });
  it('evita pelear con otra pestaña y notifica sesión caducada',async()=>{
    vi.useFakeTimers();const onStatus=vi.fn(),onExpired=vi.fn();
    const connection=createConnection({url:'ws://local/ws',Socket,onStatus,onExpired});connection.start();Socket.instances[0].welcome();
    Socket.instances[0].emit('close',{code:4001});await vi.advanceTimersByTimeAsync(20000);
    expect(onStatus).toHaveBeenLastCalledWith('replaced');expect(Socket.instances).toHaveLength(1);
    connection.reconnect();Socket.instances[1].welcome();Socket.instances[1].emit('close',{code:4401});
    expect(onExpired).toHaveBeenCalledTimes(1);connection.stop();
  });
});
