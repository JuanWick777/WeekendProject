import { spawnSync } from 'node:child_process';

if (process.env.NODE_ENV !== 'test') throw new Error('Ejecutar con NODE_ENV=test.');
const result = spawnSync(process.execPath, [
  './node_modules/vitest/vitest.mjs','run','server/test/storage.test.js',...process.argv.slice(2),
], { stdio:'inherit',env:process.env });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
