import { WebSocket } from 'ws';

export function createTestSocket(url, { cookie, origin = 'http://127.0.0.1:5173', ...options } = {}) {
  const ws = new WebSocket(url, { origin, headers: cookie ? { Cookie: cookie } : {}, ...options });
  const messages = [];
  const waiting = new Set();
  let closed;
  const closeResult = new Promise((resolve) => {
    ws.once('close', (code) => { closed = code; resolve(code); });
  });
  ws.on('error', () => {});
  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    messages.push(message);
    for (const waiter of waiting) {
      if (waiter.predicate(message)) { clearTimeout(waiter.timer); waiting.delete(waiter); waiter.resolve(message); }
    }
  });
  return {
    ws, messages, closeResult,
    waitFor(predicate, timeoutMs = 2000) {
      const found = messages.find(predicate);
      if (found) return Promise.resolve(found);
      if (closed !== undefined) return Promise.reject(new Error('Socket already closed: ' + closed));
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve };
        waiter.timer = setTimeout(() => { waiting.delete(waiter); reject(new Error('Timed out waiting for a WebSocket message')); }, timeoutMs);
        waiting.add(waiter);
      });
    },
  };
}
