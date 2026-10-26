import { test,expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const password='cybergrid-password-123';
const username=()=> 'e2e_'+randomUUID().replaceAll('-','').slice(0,10);
async function register(page,name) {
  const account=username();
  await page.goto('/');if(page.viewportSize().width>600)await page.screenshot({path:test.info().outputPath('menu.png'),fullPage:true});await page.getByRole('button',{name:'Jugar',exact:true}).click();
  await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();
  if(page.viewportSize().width>600)await page.screenshot({path:test.info().outputPath('auth.png'),fullPage:true});
  await page.getByLabel('Usuario',{exact:true}).fill(account);
  await page.getByLabel('Nombre del piloto').fill(name);
  await page.getByLabel('Contraseña',{exact:true}).fill(password);
  await page.getByRole('button',{name:'REGISTRARME',exact:true}).click();
  await expect(page.getByRole('heading',{name:'CREAR O UNIRSE A SALA'})).toBeVisible();
  if(page.viewportSize().width>600)await page.screenshot({path:test.info().outputPath('rooms.png'),fullPage:true});
  return account;
}
async function pair(browser,host,{mobile=false}={}) {
  const context=await browser.newContext({baseURL:test.info().project.use.baseURL,...(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:{width:1280,height:900}})});
  const guest=await context.newPage();const errors=[];host.on('pageerror',e=>errors.push(e.message));guest.on('pageerror',e=>errors.push(e.message));await register(host,'Alicia');await register(guest,'Beto');
  await host.getByLabel('Nombre de la sala').fill('Red de pruebas');
  await host.getByRole('button',{name:'CREAR SALA',exact:true}).click();
  await expect(host.getByRole('heading',{name:'LOBBY DE PARTIDA',exact:true})).toBeVisible();
  const codeField=host.locator('#room-code');
  await expect(codeField).toHaveValue(/^[A-Z0-9]{6}$/);
  const code=await codeField.inputValue();
  await guest.getByLabel('Código de sala',{exact:true}).fill(code.toLowerCase());
  await guest.getByRole('button',{name:'UNIRSE',exact:true}).click();
  await expect(host.locator('.lobby-player').filter({hasText:'Beto'})).toContainText('NO LISTO');
  await host.screenshot({path:test.info().outputPath('lobby.png'),fullPage:true});
  await host.getByRole('button',{name:'LISTO',exact:true}).click();await guest.getByRole('button',{name:'LISTO',exact:true}).click();
  await host.getByRole('button',{name:'INICIAR PARTIDA',exact:true}).click();
  await expect(host.locator('[data-testid=player-state]')).toHaveAttribute('data-match-id',/.+/);
  await expect(guest.locator('[data-testid=player-state]')).toHaveAttribute('data-match-id',/.+/);
  await host.screenshot({path:test.info().outputPath('game-desktop.png'),fullPage:true});
  if(mobile)await guest.bringToFront();
  if(mobile)await expect(guest.locator('#move-pad')).toBeVisible();
  if(mobile)await guest.screenshot({path:test.info().outputPath('game-mobile.png'),fullPage:true});
  return {context,guest,code,errors};
}
async function persisted(id) {
  const schema=process.env.TEST_DATABASE_SCHEMA;if(!/^cg_test_[a-f0-9]+$/.test(schema??''))throw new Error('Invalid E2E schema');
  const client=new pg.Client({connectionString:process.env.TEST_DATABASE_URL,options:'-c search_path='+schema+',public',connectionTimeoutMillis:5000});
  await client.connect();
  try{return (await client.query('SELECT m.*, (SELECT COUNT(*)::int FROM player_results p WHERE p.match_id=m.id) AS participants FROM matches m WHERE id=$1',[id])).rows[0];}
  finally{await client.end();}
}
test('registro, privacidad, cierre de sesión e inicio de sesión real',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const account=await register(page,'<b>Piloto</b>');
  await expect(page.locator('#session-label')).toContainText('<b>Piloto</b>');
  await expect(page.locator('#session-label b')).toHaveCount(0);
  const me=await (await page.request.get('/api/auth/me')).json();
  expect(Object.keys(me.data.user).sort()).toEqual(['displayName','id','username']);
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  await page.getByRole('button',{name:'Jugar',exact:true}).click();
  await page.getByLabel('Usuario',{exact:true}).fill(account);
  await page.getByLabel('Contraseña',{exact:true}).fill('wrong-password-123');
  await page.getByRole('button',{name:'ENTRAR',exact:true}).click();
  await expect(page.locator('#app-message')).toBeVisible();
  await page.getByLabel('Contraseña',{exact:true}).fill(password);
  await page.getByRole('button',{name:'ENTRAR',exact:true}).click();
  await expect(page.getByRole('heading',{name:'CREAR O UNIRSE A SALA'})).toBeVisible();expect(errors).toEqual([]);
});
test('dos cuentas juegan, móvil usa ambos pads, recarga recupera la ronda y abandono guarda resultado',async({page,browser})=>{
  const {context,guest,errors}=await pair(browser,page,{mobile:true});
  try {
    const id=await page.locator('#player-state').getAttribute('data-match-id');
    const y=Number(await page.locator('#player-state').getAttribute('data-player-y'));
    await page.locator('#game').focus();await page.keyboard.down('KeyS');await page.waitForTimeout(300);await page.keyboard.up('KeyS');
    await expect.poll(async()=>Number(await page.locator('#player-state').getAttribute('data-player-y'))).toBeGreaterThan(y+5);
    await guest.locator('#move-pad').scrollIntoViewIfNeeded();
    const positions=await guest.locator('#move-pad,#aim-pad').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};}));
    const touches=positions.map((p,i)=>({...p,id:i+1,radiusX:2,radiusY:2,force:1}));
    const cdp=await context.newCDPSession(guest);
    const before=Number(await guest.locator('#player-state').getAttribute('data-player-y'));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches.map((p,i)=>i?{...p,x:p.x-26}:{...p,y:p.y-26})});
    await expect(guest.locator('.control-pad[data-active=true]')).toHaveCount(2);
    await expect.poll(async()=>Number(await guest.locator('#player-state').getAttribute('data-player-y'))).toBeLessThan(before-5);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(guest.locator('.control-pad[data-active=true]')).toHaveCount(0);
    await page.reload();await expect(page.locator('#player-state')).toHaveAttribute('data-match-id',id);
    await guest.getByRole('button',{name:'Abrir menú de partida'}).click();
    await guest.getByRole('button',{name:'ABANDONAR RONDA',exact:true}).click();
    await expect(page.getByRole('heading',{name:'¡GANADOR: Alicia!'})).toBeVisible();
    await expect(page.getByTestId('persistence-status')).toHaveAttribute('data-status','saved');
    const row=await persisted(id);expect(row.source).toBe('live');expect(row.is_synthetic).toBe(false);expect(row.finish_reason).toBe('forfeit');expect(row.participants).toBe(2);expect(errors).toEqual([]);
  }finally{await context.close();}
});
test('fin natural, cinco nodos, empate, guardado PostgreSQL y revancha con otro matchId',async({page,browser})=>{
  const {context,guest,errors}=await pair(browser,page);
  try {
    const id=await page.locator('#player-state').getAttribute('data-match-id');const nodes=new Set();
    await expect.poll(async()=>{const labels=await page.locator('#active-node').allTextContents();for(const node of labels)nodes.add(node);return page.locator('.results-panel').count();},{timeout:22000,intervals:[150]}).toBe(1);
    expect([...nodes].sort()).toEqual(['NÚCLEO','SECTOR A','SECTOR B','SECTOR C','SECTOR D'].sort());
    await expect(page.getByRole('heading',{name:/EMPATE/})).toBeVisible();
    await expect(page.getByTestId('persistence-status')).toHaveAttribute('data-status','saved');
    await page.screenshot({path:test.info().outputPath('results.png'),fullPage:true});
    const row=await persisted(id);expect(row.status).toBe('completed');expect(Number(row.duration_ms)).toBe(15000);expect(row.draw_player_ids).toHaveLength(2);expect(row.participants).toBe(2);
    await page.getByRole('button',{name:'NUEVA PARTIDA',exact:true}).click();
    await expect(guest.getByRole('heading',{name:'LOBBY DE PARTIDA'})).toBeVisible();
    await expect(page.locator('.ready-badge.is-ready')).toHaveCount(0);
    await page.getByRole('button',{name:'LISTO',exact:true}).click();await guest.getByRole('button',{name:'LISTO',exact:true}).click();
    await page.getByRole('button',{name:'INICIAR PARTIDA',exact:true}).click();
    await expect(page.locator('#player-state')).toHaveAttribute('data-match-id',new RegExp('.+'));
    expect(await page.locator('#player-state').getAttribute('data-match-id')).not.toBe(id);
    await guest.getByRole('button',{name:'Abrir menú de partida'}).click();await guest.getByRole('button',{name:'ABANDONAR RONDA',exact:true}).click();
    await expect(page.getByTestId('persistence-status')).toHaveAttribute('data-status','saved');expect(errors).toEqual([]);
  }finally{await context.close();}
});
