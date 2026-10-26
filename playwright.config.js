import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';

try { process.loadEnvFile(); } catch (error) { if(error.code!=='ENOENT')throw error; }
process.env.CG_E2E_SCHEMA ??= 'cg_test_' + randomUUID().replaceAll('-','');
process.env.TEST_DATABASE_SCHEMA = process.env.CG_E2E_SCHEMA;
const port = Number(process.env.E2E_PORT ?? 4176);
export default defineConfig({
  globalTeardown:'./tests/e2e/cleanup.js',
  testDir:'./tests/e2e',testMatch:'**/*.spec.js',timeout:45000,expect:{timeout:10000},
  fullyParallel:false,workers:1,retries:0,reporter:'list',
  use:{baseURL:'http://127.0.0.1:'+port,viewport:{width:1440,height:960},trace:'retain-on-failure',screenshot:'only-on-failure',
    browserName:'chromium',...(process.env.E2E_BROWSER_CHANNEL?{channel:process.env.E2E_BROWSER_CHANNEL}:{})},
  webServer:{command:'node --env-file-if-exists=.env tests/e2e/server.js',url:'http://127.0.0.1:'+port+'/api/health',reuseExistingServer:false,timeout:30000,
    env:{NODE_ENV:'test',E2E_PORT:String(port),TEST_DATABASE_SCHEMA:process.env.TEST_DATABASE_SCHEMA}},
});
