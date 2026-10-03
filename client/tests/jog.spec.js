import {test,expect} from '@playwright/test';
import {initialStatus} from '../src/transport.js';
async function remoteDevice(page,{legacy=false,delay=0}={}){
 let state={...initialStatus(),control_epoch:100,jog_seq:0,jog_pan:0,jog_tilt:0,jog_active:false,jog_lease_ms:500};const calls=[];
 if(legacy)for(const key of ['control_epoch','jog_seq','jog_pan','jog_tilt','jog_active','jog_lease_ms'])delete state[key];
 await page.route(/\/(status|arm|stop|disarm|move|home|heartbeat|calibration|jog)(\?.*)?$/,async route=>{
 const req=route.request(),path=new URL(req.url()).pathname;let body;try{body=req.postDataJSON()}catch{}calls.push({path,body,time:Date.now()});
 if(delay&&path==='/jog'&&body.pan)await new Promise(r=>setTimeout(r,delay));
 let code=200;if(path==='/arm'){state.armed=true;state.stopped=false;if(!legacy){state.control_epoch++;state.jog_seq=0}}
 if(['/stop','/disarm','/move','/home'].includes(path)&&!legacy){state.control_epoch++;state.jog_active=false;state.jog_pan=state.jog_tilt=0}
 if(path==='/stop')state.stopped=true;if(path==='/disarm'){state.armed=false;state.stopped=true}
 if(path==='/jog'){
 if(legacy||!state.armed||state.stopped||body.epoch!==state.control_epoch||body.seq<=state.jog_seq)code=409;
 else {state.jog_seq=body.seq;state.jog_pan=body.pan;state.jog_tilt=body.tilt;state.jog_active=!!(body.pan||body.tilt)}
 }
 await route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(code===200?state:{error:'stale jog'})}).catch(()=>{});
 });Object.defineProperty(calls,'state',{value:state});return calls;
}
async function connectArm(page){await page.getByRole('button',{name:'Connection',exact:true}).first().click();await page.getByRole('button',{name:'Connect',exact:true}).click();await page.getByRole('button',{name:'Remote',exact:true}).click();await page.getByRole('button',{name:'Arm / resume',exact:true}).click();await expect(page.getByRole('button',{name:'Arm / resume',exact:true})).toBeEnabled()}
async function press(page,name){const locator=page.getByRole('button',{name,exact:true});const b=await locator.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();return locator}
const jogs=calls=>calls.filter(c=>c.path==='/jog');
test('sustained pointer hold repeats rates and release sends newer zero pair',async({page})=>{
 const calls=await remoteDevice(page);await page.goto('./');await connectArm(page);await press(page,'Hold pan right');await expect.poll(()=>jogs(calls).filter(c=>c.body.pan>0).length).toBeGreaterThanOrEqual(3);await page.mouse.up();
 await expect.poll(()=>jogs(calls).at(-1)?.body.pan).toBe(0);expect(jogs(calls).at(-1).body.tilt).toBe(0);
 const sent=jogs(calls);for(let i=1;i<sent.length;i++)expect(sent[i].body.seq).toBeGreaterThan(sent[i-1].body.seq);expect(sent[0].body.pan).toBe(.25);expect(calls.some(c=>c.path==='/move')).toBe(false);
 const count=sent.length;await page.waitForTimeout(350);expect(jogs(calls)).toHaveLength(count);
});
test('keyboard holds combine diagonals and focused inputs never jog',async({page})=>{
 const calls=await remoteDevice(page);await page.goto('./');await connectArm(page);await page.getByLabel('Keyboard arrows',{exact:true}).check();
 await page.locator('body').click({position:{x:2,y:2}});await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowUp');await expect.poll(()=>jogs(calls).some(c=>c.body.pan>0&&c.body.tilt>0)).toBe(true);
 await page.keyboard.up('ArrowRight');await expect.poll(()=>jogs(calls).at(-1)?.body.pan===0&&jogs(calls).at(-1)?.body.tilt>0).toBe(true);await page.keyboard.up('ArrowUp');await expect.poll(()=>jogs(calls).at(-1)?.body.pan===0&&jogs(calls).at(-1)?.body.tilt===0).toBe(true);const count=jogs(calls).length;await page.getByRole('button',{name:'+ Save current pose',exact:true}).click();await page.getByLabel('Preset name').focus();await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');expect(jogs(calls)).toHaveLength(count);
});
test('pointer cancellation and window blur terminate repeated intent',async({page})=>{
 const calls=await remoteDevice(page);await page.goto('./');await connectArm(page);const button=await press(page,'Hold tilt up');await expect.poll(()=>jogs(calls).length).toBeGreaterThan(0);
 await button.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await expect.poll(()=>jogs(calls).at(-1)?.body.tilt).toBe(0);
 await press(page,'Hold pan right');await expect.poll(()=>jogs(calls).at(-1)?.body.pan).toBeGreaterThan(0);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();await expect.poll(()=>jogs(calls).at(-1)?.body.pan).toBe(0);
 const count=jogs(calls).length;await page.waitForTimeout(350);expect(jogs(calls)).toHaveLength(count);
});
test('legacy firmware cannot expose usable hold controls',async({page})=>{
 await remoteDevice(page,{legacy:true});await page.goto('./');await connectArm(page);await expect(page.getByRole('button',{name:'Hold pan right',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Center / Home',exact:true})).toBeEnabled();
});
for(const event of ['lostpointercapture','hidden','navigation','disconnect','STOP'])test(`${event} clears held input and no timer replays motion`,async({page})=>{
 const calls=await remoteDevice(page);await page.goto('./');await connectArm(page);const button=await press(page,'Hold pan right');await expect.poll(()=>jogs(calls).filter(c=>c.body.pan>0).length).toBeGreaterThan(0);
 if(event==='lostpointercapture')await button.dispatchEvent('lostpointercapture',{pointerId:1});
 if(event==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'))});
 if(event==='navigation')await page.getByRole('button',{name:'Guides',exact:true}).dispatchEvent('click');
 if(event==='disconnect'){await page.getByRole('button',{name:'Connection',exact:true}).first().dispatchEvent('click');await page.getByRole('button',{name:'Disconnect',exact:true}).click()}
 if(event==='STOP')await page.getByRole('button',{name:'STOP · hold',exact:true}).first().click();
 await page.mouse.up();if(event!=='STOP'&&event!=='disconnect')await expect.poll(()=>jogs(calls).at(-1)?.body.pan).toBe(0);else await page.waitForTimeout(150);
 const sent=jogs(calls).length;await page.waitForTimeout(350);expect(jogs(calls)).toHaveLength(sent);
});
test('two finger directions combine and releasing touch ends the hold',async({page})=>{
 const calls=await remoteDevice(page);await page.goto('./');await connectArm(page);const right=page.getByRole('button',{name:'Hold pan right',exact:true}),up=page.getByRole('button',{name:'Hold tilt up',exact:true});
 const rb=await right.boundingBox(),ub=await up.boundingBox(),r={x:rb.x+rb.width/2,y:rb.y+rb.height/2,id:11},u={x:ub.x+ub.width/2,y:ub.y+ub.height/2,id:12};const touch=await page.context().newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r]});await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r,u]});await expect.poll(()=>jogs(calls).some(c=>c.body.pan>0&&c.body.tilt>0)).toBe(true);
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>jogs(calls).at(-1)?.body.pan===0&&jogs(calls).at(-1)?.body.tilt===0).toBe(true);
});
test('focused direction Space hold releases when focus leaves the button',async({page})=>{
 const calls=await remoteDevice(page);await page.goto('./');await connectArm(page);await page.getByRole('button',{name:'Hold pan right',exact:true}).focus();await page.keyboard.down('Space');await expect.poll(()=>jogs(calls).filter(c=>c.body.pan>0).length).toBeGreaterThanOrEqual(2);await page.getByLabel('Keyboard arrows',{exact:true}).focus();await page.keyboard.up('Space');await expect.poll(()=>jogs(calls).at(-1)?.body.pan).toBe(0);const count=jogs(calls).length;await page.waitForTimeout(250);expect(jogs(calls)).toHaveLength(count);
});
test('remote desktop and phone screenshots show primary directional pad and visible STOP',async({page})=>{
 const faults=[];page.on('pageerror',e=>faults.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))faults.push(m.text())});await page.setViewportSize({width:1536,height:1024});await page.goto('./?demo=1');await expect(page).toHaveTitle('CAMX / Control room');await connectArm(page);
 await press(page,'Hold pan right');await page.waitForTimeout(300);await page.mouse.up();await page.waitForTimeout(200);await press(page,'Hold tilt up');await page.waitForTimeout(200);await page.mouse.up();await page.waitForTimeout(200);
 await expect(page.getByRole('button',{name:'Hold pan right',exact:true})).toBeEnabled();expect(await page.locator('vite-error-overlay').count()).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/camx-remote-desktop.png',fullPage:false});await page.screenshot({path:'/tmp/camx-remote-desktop-full.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const stop=page.getByRole('button',{name:'STOP · hold',exact:true}).first();const bounds=await stop.boundingBox();expect(bounds.y+bounds.height).toBeLessThanOrEqual(844);await page.screenshot({path:'/tmp/camx-remote-mobile.png',fullPage:false});await page.screenshot({path:'/tmp/camx-remote-mobile-full.png',fullPage:true});await stop.click();
 await page.setViewportSize({width:1536,height:1024});await page.getByRole('button',{name:'Disable PWM',exact:true}).click();await page.getByRole('button',{name:'Calibration',exact:true}).click();await page.screenshot({path:'/tmp/camx-remote-calibration.png',fullPage:false});expect(faults).toEqual([]);
});
test('Connect cannot race an in-progress held-input disconnect cleanup',async({page})=>{
 const calls=await remoteDevice(page);await page.goto('./');await connectArm(page);await press(page,'Hold pan right');await expect.poll(()=>jogs(calls).some(c=>c.body.pan>0)).toBe(true);
 let releaseCleanup;await page.route('**/jog',async route=>{const body=route.request().postDataJSON();if(body.pan===0&&body.tilt===0){await new Promise(r=>releaseCleanup=r);await route.fallback()}else await route.fallback()});
 await page.getByRole('button',{name:'Connection',exact:true}).first().dispatchEvent('click');await page.getByRole('button',{name:'Disconnect',exact:true}).click();await expect(page.getByRole('button',{name:'Connect',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Disconnect',exact:true})).toBeDisabled();await expect.poll(()=>typeof releaseCleanup).toBe('function');releaseCleanup();await expect(page.getByRole('button',{name:'Connect',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Disconnect',exact:true})).toBeDisabled();
 const count=jogs(calls).length;await page.waitForTimeout(200);expect(jogs(calls)).toHaveLength(count);await page.getByRole('button',{name:'Connect',exact:true}).click();await expect(page.getByRole('button',{name:'Disconnect',exact:true})).toBeEnabled();expect(calls.filter(c=>c.path==='/arm')).toHaveLength(1);
});
test('new preset captures latest post-release commanded pose rather than stale precision draft',async({page})=>{
 const calls=await remoteDevice(page);await page.goto('./');await connectArm(page);await page.getByRole('button',{name:'Precision',exact:true}).click();await page.getByLabel('Pan offset',{exact:true}).fill('30');await page.getByLabel('Tilt offset',{exact:true}).fill('-10');await page.getByRole('button',{name:'Remote',exact:true}).click();await press(page,'Hold pan right');await expect.poll(()=>jogs(calls).some(c=>c.body.pan>0)).toBe(true);await page.mouse.up();await expect.poll(()=>jogs(calls).at(-1)?.body.pan).toBe(0);
 calls.state.pan=calls.state.pan_target=7.25;calls.state.tilt=calls.state.tilt_target=-3.5;await expect(page.getByText('7.3°',{exact:true}).first()).toBeVisible();await page.getByRole('button',{name:'+ Save current pose',exact:true}).click();await page.getByLabel('Preset name').fill('Settled after jog');await page.getByRole('button',{name:'+ Save current pose',exact:true}).click();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:true}).click();const download=await downloaded;const fs=await import('node:fs/promises');const data=JSON.parse(await fs.readFile(await download.path(),'utf8'));expect(data.presets.find(p=>p.name==='Settled after jog')).toEqual({name:'Settled after jog',pan:7.25,tilt:-3.5});expect(calls.some(c=>c.path==='/move')).toBe(false);
});
test('exhausted sequence release keeps explicit ARM guidance after status refresh without resuming holds',async({page})=>{
 const faults=[];page.on('pageerror',e=>faults.push(e.message));const calls=await remoteDevice(page);await page.goto('./');await connectArm(page);
 await page.route('**/jog',async route=>{const body=route.request().postDataJSON();calls.push({path:'/jog',body,time:Date.now()});calls.state.jog_seq=0xffffffff;calls.state.jog_pan=body.pan;calls.state.jog_tilt=body.tilt;calls.state.jog_active=!!(body.pan||body.tilt);await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(calls.state)})});
 const reads=calls.filter(c=>c.path==='/status').length;await press(page,'Hold pan right');await expect.poll(()=>calls.state.jog_seq).toBe(0xffffffff);await page.waitForTimeout(30);await page.mouse.up();await expect(page.getByRole('alert')).toContainText(/sequence exhausted.*ARM/i);await expect.poll(()=>calls.filter(c=>c.path==='/status').length).toBeGreaterThan(reads);
 const commands=jogs(calls).length;await page.waitForTimeout(1400);expect(jogs(calls)).toHaveLength(commands);expect(calls.filter(c=>c.path==='/arm')).toHaveLength(1);expect(faults).toEqual([]);await expect(page.getByRole('alert')).toContainText(/sequence exhausted.*ARM/i);
});

test('failed jog recovers automatically through repeated status failures without replaying motion',async({page})=>{
 const calls=await remoteDevice(page);await page.goto('./');await connectArm(page);
 let failStatus=3,failedJog=false,statusAttempts=0;
 await page.route('**/status',async route=>{
  if(failedJog){statusAttempts++;if(failStatus-->0)return route.abort('failed');}
  return route.fallback();
 });
 await page.route('**/jog',async route=>{
  if(!failedJog){failedJog=true;calls.state.control_epoch++;calls.state.jog_seq=0;calls.state.jog_active=false;calls.state.connection_paused=true;return route.abort('failed');}
  return route.fallback();
 });
 await press(page,'Hold pan right');
 await expect.poll(()=>failedJog).toBe(true);
 await expect(page.getByRole('button',{name:'Hold pan right',exact:true})).toBeDisabled();
 await page.mouse.up();
 await expect.poll(()=>statusAttempts,{timeout:12000}).toBeGreaterThanOrEqual(4);
 await expect(page.getByRole('button',{name:'Hold pan right',exact:true})).toBeEnabled();
 expect(calls.filter(c=>c.path==='/arm')).toHaveLength(1);
 expect(jogs(calls)).toHaveLength(0);
 await page.screenshot({path:'/tmp/camx-recovered-client.png'});
 await press(page,'Hold pan right');await expect.poll(()=>jogs(calls).some(c=>c.body.pan>0)).toBe(true);await page.mouse.up();
 await page.getByRole('button',{name:'Connection',exact:true}).first().click();
 await page.getByRole('button',{name:'Disconnect',exact:true}).click();
 const count=statusAttempts;await page.waitForTimeout(1400);expect(statusAttempts).toBe(count);
});
