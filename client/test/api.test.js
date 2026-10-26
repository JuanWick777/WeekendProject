import { describe,it,expect,vi } from 'vitest';
import { createApi,ApiError } from '../src/net/api.js';

describe('API del navegador',()=>{
  it('envía sesión por cookie y usa rutas/métodos/campos reales',async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,status:200,json:async()=>({ok:true,data:{code:'ABC123'}})}));
    const api=createApi({fetchImpl});
    await api.createRoom('Red');await api.ready('ABC123',true);await api.joinRoom('A/B?');
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/rooms');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({method:'POST',credentials:'same-origin',body:'{"name":"Red"}'});
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/rooms/ABC123/ready');
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({method:'PATCH',body:'{"ready":true}'});
    expect(fetchImpl.mock.calls[2][0]).toBe('/api/rooms/A%2FB%3F/join');
  });
  it('mantiene códigos de error HTTP y distingue fallos de red',async()=>{
    const api=createApi({fetchImpl:async()=>({ok:false,status:409,json:async()=>({ok:false,error:{code:'ROOM_FULL',message:'La sala está llena.'}})})});
    await expect(api.joinRoom('ABC123')).rejects.toMatchObject({code:'ROOM_FULL',status:409});
    const broken=createApi({fetchImpl:async()=>{throw new Error('PRIVATE_TRANSPORT_DETAIL');}});
    await expect(broken.me()).rejects.toMatchObject({code:'NETWORK_ERROR',message:'No se pudo conectar con el servidor.'});
    expect(new ApiError('X','Y')).toBeInstanceOf(Error);
  });
});
