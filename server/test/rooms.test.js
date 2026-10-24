import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoomManager } from '../src/rooms/room-manager.js';

const user = (id) => ({ id, displayName: 'Player ' + id });
let rooms;
let onStartMatch;

function twoPlayers() {
  rooms.setConnected('a', true);
  rooms.setConnected('b', true);
  const { code } = rooms.create(user('a'), { name: 'Grid' });
  rooms.join(user('b'), code);
  return code;
}

function ready(code) {
  rooms.setReady('a', code, true);
  rooms.setReady('b', code, true);
}

beforeEach(() => {
  vi.useFakeTimers();
  onStartMatch = vi.fn();
  rooms = createRoomManager({ onStartMatch });
});
afterEach(() => { rooms.dispose(); vi.useRealTimers(); });

describe('salas autoritativas sin dependencia de PostgreSQL', () => {
  it('mantiene una sola pertenencia y devuelve vistas sin referencias mutables', () => {
    const code = twoPlayers();
    expect(rooms.join(user('b'), code).players).toHaveLength(2);
    expect(() => rooms.create(user('a'), { name: 'Another' })).toThrow(expect.objectContaining({ code: 'ALREADY_IN_ROOM' }));
    const snapshot = rooms.getRoom(code, 'a');
    snapshot.players[0].displayName = 'Forged';
    expect(rooms.getRoom(code, 'a').players[0].displayName).toBe('Player a');
    expect(() => rooms.getRoom(code, 'outsider')).toThrow(expect.objectContaining({ code: 'NOT_IN_ROOM' }));
  });

  it('limita a cuatro, valida anfitrión y exige participantes conectados/listos', () => {
    const code = twoPlayers();
    expect(() => rooms.start('b', code)).toThrow(expect.objectContaining({ code: 'HOST_ONLY' }));
    expect(() => rooms.start('a', code)).toThrow(expect.objectContaining({ code: 'NOT_READY' }));
    rooms.join(user('c'), code); rooms.join(user('d'), code);
    expect(() => rooms.join(user('e'), code)).toThrow(expect.objectContaining({ code: 'ROOM_FULL' }));
    expect(() => rooms.setReady('c', code, true)).toThrow(expect.objectContaining({ code: 'NOT_CONNECTED' }));
  });

  it('cancela countdown al quitar Listo o desconectarse y no dispara un inicio tardío', () => {
    const code = twoPlayers(); ready(code);
    rooms.start('a', code);
    rooms.setReady('b', code, false);
    vi.advanceTimersByTime(3000);
    expect(onStartMatch).not.toHaveBeenCalled();
    expect(rooms.getRoom(code, 'a').status).toBe('lobby');
    ready(code); rooms.start('a', code);
    rooms.setConnected('b', false);
    vi.advanceTimersByTime(3000);
    expect(onStartMatch).not.toHaveBeenCalled();
    expect(rooms.getRoom(code, 'a').countdownEndsAtMs).toBeNull();
  });

  it('inicia una sola vez a los 3 s, impide altas y prepara una revancha nueva', () => {
    const code = twoPlayers(); ready(code);
    expect(rooms.start('a', code).status).toBe('countdown');
    expect(() => rooms.join(user('c'), code)).toThrow(expect.objectContaining({ code: 'ROOM_STARTED' }));
    vi.advanceTimersByTime(2999);
    expect(onStartMatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onStartMatch).toHaveBeenCalledTimes(1);
    expect(rooms.isPlaying('a')).toBe(true);
    const first = onStartMatch.mock.calls[0][0];
    expect(first.players.map((player) => player.id)).toEqual(['a', 'b']);
    expect(Number.isInteger(first.seed)).toBe(true);
    expect(() => rooms.rematch('a', code)).toThrow(expect.objectContaining({ code: 'INVALID_PHASE' }));
    expect(rooms.markFinished(code)).toBe(true);
    expect(rooms.markFinished(code)).toBe(false);
    expect(() => rooms.rematch('b', code)).toThrow(expect.objectContaining({ code: 'HOST_ONLY' }));
    expect(rooms.rematch('a', code).players.every((player) => !player.ready)).toBe(true);
    ready(code); rooms.start('a', code); vi.advanceTimersByTime(3000);
    expect(onStartMatch.mock.calls[1][0].matchId).not.toBe(first.matchId);
  });

  it('no inicia una partida vacía cuando la simulación B3 no está conectada', () => {
    rooms.dispose(); rooms = createRoomManager();
    const code = twoPlayers(); ready(code);
    expect(() => rooms.start('a', code)).toThrow(expect.objectContaining({ code: 'GAME_NOT_READY' }));
    expect(rooms.getRoom(code, 'a').status).toBe('lobby');
  });

  it('regresa a lobby y notifica un fallo del manejador de partida', () => {
    onStartMatch.mockImplementation(() => { throw new Error('Internal error'); });
    const events = []; rooms.subscribe((event) => events.push(event.type));
    const code = twoPlayers(); ready(code); rooms.start('a', code); vi.advanceTimersByTime(3000);
    const room = rooms.getRoom(code, 'a');
    expect(room.status).toBe('lobby');
    expect(room.players.every((player) => !player.ready)).toBe(true);
    expect(events).toContain('start-failed');
  });

  it('recupera al mismo jugador durante la gracia y transfiere host al vencerla', () => {
    const code = twoPlayers(); ready(code);
    rooms.setConnected('a', false); vi.advanceTimersByTime(14_999);
    rooms.setConnected('a', true); vi.advanceTimersByTime(1);
    expect(rooms.getRoom(code, 'a').players).toHaveLength(2);
    expect(rooms.getRoom(code, 'a').players[0].ready).toBe(false);
    rooms.setConnected('a', false); vi.advanceTimersByTime(15_000);
    expect(rooms.getUserRoomCode('a')).toBeNull();
    expect(rooms.getRoom(code, 'b').hostId).toBe('b');
  });

  it('libera salas creadas sin socket y respeta el límite de salas', () => {
    rooms.dispose(); rooms = createRoomManager({ maxRooms: 1 });
    const { code } = rooms.create(user('a'), { name: 'Orphan' });
    expect(() => rooms.create(user('b'), { name: 'Full' })).toThrow(expect.objectContaining({ code: 'ROOM_LIMIT' }));
    vi.advanceTimersByTime(15_000);
    expect(rooms.getUserRoomCode('a')).toBeNull();
    expect(() => rooms.getRoom(code, 'a')).toThrow(expect.objectContaining({ code: 'ROOM_NOT_FOUND' }));
    expect(rooms.create(user('b'), { name: 'Now available' }).hostId).toBe('b');
  });

  it('informa abandono al salir de playing y elimina una sala sin participantes', () => {
    const left = []; rooms.subscribe((event) => { if (event.type === 'left') left.push(event); });
    const code = twoPlayers(); ready(code); rooms.start('a', code); vi.advanceTimersByTime(3000);
    rooms.leave('a', code);
    expect(left[0]).toMatchObject({ userId: 'a', roomCode: code, wasPlaying: true });
    expect(rooms.getRoom(code, 'b').hostId).toBe('b');
    rooms.leave('b', code);
    expect(() => rooms.getRoom(code, 'b')).toThrow(expect.objectContaining({ code: 'ROOM_NOT_FOUND' }));
  });

  it('cierra timers y no inicia partidas después de dispose', () => {
    const code = twoPlayers(); ready(code); rooms.start('a', code);
    rooms.dispose(); vi.advanceTimersByTime(30_000);
    expect(onStartMatch).not.toHaveBeenCalled();
    expect(rooms.getUserRoomCode('a')).toBeNull();
  });
});
