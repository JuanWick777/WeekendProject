import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { SERVER_MESSAGES } from '@cybergrid/shared/protocol';
import { createMatch } from './match.js';
import { generateMap } from './maps/generate-map.js';

export function createGameManager({
  rooms, sockets, saveMatch = null, monotonicNow = () => performance.now(),
  mapFactory = generateMap, matchOptions, retentionMs = 300_000,
} = {}) {
  const entries = new Map();
  const pendingSaves = new Set();
  let closed = false;

  function storageError(entry) {
    console.warn('RESULT_NOT_SAVED', { matchId: entry.result.matchId, roomCode: entry.roomCode, persistence: entry.persistence });
    sockets.broadcast(entry.roomCode, SERVER_MESSAGES.ERROR, {
      code: 'RESULT_NOT_SAVED', message: 'La ronda terminó, pero su resultado todavía no pudo guardarse.',
    });
  }

  function publishPersistence(entry) {
    sockets.broadcast(entry.roomCode, SERVER_MESSAGES.MATCH_PERSISTENCE, {matchId:entry.result.matchId,status:entry.persistence});
  }

  function finish(entry) {
    if (entry.done) return;
    entry.done = true;
    entry.result = entry.match.getResult();
    entry.persistence = saveMatch ? 'pending' : 'unavailable';
    sockets.broadcast(entry.roomCode, SERVER_MESSAGES.STATE, entry.match.getSnapshot());
    sockets.broadcast(entry.roomCode, SERVER_MESSAGES.MATCH_END, entry.result);
    rooms.markFinished(entry.roomCode);
    publishPersistence(entry);
    entry.cleanupTimer = setTimeout(() => {
      if (entries.get(entry.roomCode) === entry) entries.delete(entry.roomCode);
    }, retentionMs);
    entry.cleanupTimer.unref?.();
    if (!saveMatch) { entry.persistence = 'unavailable'; storageError(entry); return; }
    entry.persistence = 'pending';
    const saving = Promise.resolve().then(() => saveMatch(structuredClone(entry.result))).then(
      () => { entry.persistence = 'saved'; publishPersistence(entry); },
      () => { entry.persistence = 'failed'; publishPersistence(entry); storageError(entry); },
    );
    pendingSaves.add(saving);
    void saving.finally(() => pendingSaves.delete(saving));
  }

  function pump() {
    for (const entry of entries.values()) {
      if (entry.done) continue;
      try {
        entry.match.advanceTo(Math.max(0, monotonicNow() - entry.startedClock));
        for (const event of entry.match.drainEvents()) sockets.broadcast(entry.roomCode, SERVER_MESSAGES.EVENT, event);
        if (entry.match.getResult()) { finish(entry); continue; }
        const snapshot = entry.match.getSnapshot();
        if (snapshot.tick - entry.lastSnapshotTick >= GAME_CONFIG.network.tickRate / GAME_CONFIG.network.snapshotRate) {
          sockets.broadcast(entry.roomCode, SERVER_MESSAGES.STATE, snapshot);
          entry.lastSnapshotTick = snapshot.tick;
        }
      } catch {
        console.error('MATCH_INTERRUPTED', { matchId: entry.match.getSnapshot().matchId, roomCode: entry.roomCode });
        for (const player of entry.match.getSnapshot().players) entry.match.forfeit(player.id);
        entry.match.advanceTo(0);
        finish(entry);
        sockets.broadcast(entry.roomCode, SERVER_MESSAGES.ERROR, { code: 'MATCH_INTERRUPTED', message: 'La ronda se interrumpió. Vuelve al lobby para reintentar.' });
      }
    }
  }

  const unsubscribe = rooms.subscribe((event) => {
    if (event.type !== 'lobby') return;
    const entry = entries.get(event.view.code);
    if (!entry || entry.done) return;
    for (const player of event.view.players) entry.match.setConnected(player.id, player.connected);
  });
  const timer = setInterval(pump, 1000 / GAME_CONFIG.network.tickRate);
  timer.unref();

  return Object.freeze({
    start(context) {
      if (closed) throw new Error('Game manager closed');
      const previous = entries.get(context.roomCode);
      if (previous && !previous.done) throw new Error('Room already has an active match');
      const map = mapFactory(context.seed);
      const match = createMatch({ ...context, map, rules: matchOptions });
      clearTimeout(previous?.cleanupTimer);
      const entry = { roomCode: context.roomCode, match, startedClock: monotonicNow(), lastSnapshotTick: 0, done: false, persistence: 'not-finished', cleanupTimer: null };
      entries.set(context.roomCode, entry);
      sockets.broadcast(context.roomCode, SERVER_MESSAGES.MATCH_START, match.getStartPayload());
    },
    acceptInput({ userId, roomCode, input }) {
      const entry = entries.get(roomCode);
      if (!entry || entry.done) return false;
      return entry.match.acceptInput(userId, input, Math.max(0, monotonicNow() - entry.startedClock));
    },
    reconnect({ userId, roomCode }) {
      const entry = entries.get(roomCode);
      if (!entry) return;
      if (entry.done) { sockets.sendToUser(userId, SERVER_MESSAGES.MATCH_END, entry.result); sockets.sendToUser(userId, SERVER_MESSAGES.MATCH_PERSISTENCE, {matchId:entry.result.matchId,status:entry.persistence}); return; }
      entry.match.setConnected(userId, true, true);
      sockets.sendToUser(userId, SERVER_MESSAGES.MATCH_START, entry.match.getStartPayload());
    },
    playerLeft({ userId, roomCode, wasPlaying }) {
      const entry = entries.get(roomCode);
      if (wasPlaying && entry && !entry.done) entry.match.forfeit(userId);
    },
    getStatus(roomCode) {
      const entry = entries.get(roomCode);
      return entry ? { done: entry.done, persistence: entry.persistence, state: entry.match.getSnapshot(), result: entry.match.getResult() } : null;
    },
    async close() {
      if (closed) return;
      closed = true; clearInterval(timer); unsubscribe();
      for (const entry of entries.values()) clearTimeout(entry.cleanupTimer);
      entries.clear();
      await Promise.allSettled([...pendingSaves]);
    },
  });
}
