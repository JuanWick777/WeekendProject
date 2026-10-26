import pg from 'pg';
export default async function cleanup() {
  const schema=process.env.CG_E2E_SCHEMA;
  if(!process.env.TEST_DATABASE_URL||!/^cg_test_[a-f0-9]+$/.test(schema??''))return;
  const client=new pg.Client({connectionString:process.env.TEST_DATABASE_URL,connectionTimeoutMillis:5000});
  await client.connect();
  try{await client.query("SET lock_timeout='5s'");await client.query('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');}
  finally{await client.end();}
}
