// Optional latency simulation for storage tests; no production imports.
import pg from 'pg';

const delayMs = Number(process.env.STORAGE_TEST_QUERY_DELAY_MS ?? 0);
if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 1000) throw new Error('Invalid STORAGE_TEST_QUERY_DELAY_MS');
if (delayMs > 0) {
  const original = pg.Client.prototype.query;
  pg.Client.prototype.query = function (...args) {
    if (typeof args.at(-1) === 'function') {
      setTimeout(() => original.apply(this,args),delayMs);
      return;
    }
    return new Promise((resolve,reject) => setTimeout(() => {
      try { Promise.resolve(original.apply(this,args)).then(resolve,reject); } catch (error) { reject(error); }
    },delayMs));
  };
}
