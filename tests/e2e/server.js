import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createServerRuntime } from '../../server/src/runtime.js';
import { loadPostgresServices } from '../../server/src/postgres-services.js';

if(process.env.NODE_ENV!=='test'||!process.env.TEST_DATABASE_URL||!/^cg_test_[a-f0-9]+$/.test(process.env.TEST_DATABASE_SCHEMA??'')) {
  throw new Error('E2E requiere NODE_ENV=test, TEST_DATABASE_URL y un TEST_DATABASE_SCHEMA aislado.');
}
const schema=process.env.TEST_DATABASE_SCHEMA;const port=Number(process.env.E2E_PORT??4176);
const admin=new pg.Client({connectionString:process.env.TEST_DATABASE_URL,connectionTimeoutMillis:5000});
await admin.connect();
await admin.query('CREATE SCHEMA "'+schema+'"');
await admin.query('SET search_path TO "'+schema+'",public');
await admin.query(await readFile(new URL('../../server/src/storage/schema.sql',import.meta.url),'utf8'));
await admin.end();
const services=await loadPostgresServices();
const runtime=createServerRuntime({...services,nodeEnv:'test',appOrigin:'http://127.0.0.1:'+port,
  roomOptions:{countdownMs:300},gameOptions:{matchOptions:{durationMs:15000,nodeDurationMs:3000,nodePreviewMs:600}}});
runtime.server.listen(port,'127.0.0.1',()=>console.log('Servidor E2E aislado: '+port));
let closing=false;
async function close(){
  if(closing)return;closing=true;
  await runtime.close();await services.close();
  const cleanup=new pg.Client({connectionString:process.env.TEST_DATABASE_URL,connectionTimeoutMillis:5000});
  await cleanup.connect();await cleanup.query('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await cleanup.end();
}
process.once('SIGINT',()=>void close());process.once('SIGTERM',()=>void close());
