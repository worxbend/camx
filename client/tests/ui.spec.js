import {test,expect} from '@playwright/test';
import {initialStatus} from '../src/transport.js';
async function device(page){let state=initialStatus();const calls=[];await page.route(/\/(status|arm|stop|disarm|move|home|heartbeat|calibration)(\?.*)?$/,async route=>{
 const req=route.request(),path=new URL(req.url()).pathname;let body;try{body=req.postDataJSON()}catch{}calls.push({path,body,headers:req.headers()});
 if(path==='/arm'){state.armed=true;state.stopped=false}if(path==='/stop')state.stopped=true;if(path==='/disarm'){state.armed=false;state.stopped=true}
 if(path==='/move'){state.pan=state.pan_target=body.pan;state.tilt=state.tilt_target=body.tilt}
 if(path==='/home'){state.pan=state.pan_target=state.tilt=state.tilt_target=0}
 if(path==='/calibration'){const a=body.axis===0?'pan':'tilt';for(const [k,v]of Object.entries({center:'center',low:'low',high:'high',minimum:'min',maximum:'max',invert:'invert',speed:'speed'}))state[`${a}_${v}`]=body[k]}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(state)});
 });return calls;}
async function connect(page){await page.getByRole('button',{name:'Connection',exact:true}).first().click();await page.getByRole('button',{name:'Connect',exact:true}).click();await page.getByRole('button',{name:'Precision',exact:true}).click();await expect(page.getByRole('button',{name:'Arm / resume',exact:true})).toBeEnabled();}
test('real connection requires explicit arm; commands contain both offsets and stop disables intent',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const calls=await device(page);await page.goto('./');
 await page.getByRole('button',{name:'Connection',exact:true}).first().click();await page.getByLabel('Connection token').fill('private-ui-token');await connect(page);expect(calls.filter(c=>c.path==='/arm')).toHaveLength(0);
 await page.getByRole('button',{name:'Arm / resume',exact:true}).click();await page.getByLabel('Pan offset',{exact:true}).fill('12');await page.getByLabel('Tilt offset',{exact:true}).fill('-4');
 await page.getByRole('button',{name:/Send offsets|Apply offsets|Move camera/}).click();await expect.poll(()=>calls.filter(c=>c.path==='/move').length).toBeGreaterThan(0);
 expect(calls.filter(c=>c.path==='/move').at(-1).body).toEqual({pan:12,tilt:-4});
 await page.getByRole('button',{name:'STOP · hold',exact:true}).first().click();await expect.poll(()=>calls.some(c=>c.path==='/stop')).toBe(true);
 await page.getByRole('button',{name:'Disable PWM',exact:true}).click();await expect.poll(()=>calls.some(c=>c.path==='/disarm')).toBe(true);
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('private-ui-token');expect(errors).toEqual([]);
});
test('calibration saves exact schema only when disarmed and rereads status',async({page})=>{
 const calls=await device(page);await page.goto('./');await connect(page);await page.getByRole('button',{name:'Calibration',exact:true}).click();
 await page.getByLabel('Pan speed',{exact:true}).fill('5');await page.getByLabel('Pan minimum angle',{exact:true}).fill('-10');await page.getByLabel('Pan maximum angle',{exact:true}).fill('10');
 await page.getByRole('button',{name:'Save Pan calibration',exact:true}).click();await expect.poll(()=>calls.some(c=>c.path==='/calibration')).toBe(true);
 expect(calls.find(c=>c.path==='/calibration').body).toEqual({axis:0,center:1500,low:1400,high:1600,minimum:-10,maximum:10,invert:false,speed:5});await expect.poll(()=>calls.slice(calls.findIndex(c=>c.path==='/calibration')+1).some(c=>c.path==='/status')).toBe(true);
 await page.getByRole('button',{name:'Precision',exact:true}).click();await page.getByRole('button',{name:'Arm / resume',exact:true}).click();await page.getByRole('button',{name:'Calibration',exact:true}).click();await expect(page.getByRole('button',{name:'Save Pan calibration',exact:true})).toBeDisabled();
});
test('demo presets and guides work without device requests; mobile has no horizontal overflow',async({page})=>{
 const requests=[];page.on('request',r=>{if(/\/(arm|move|calibration)$/.test(new URL(r.url()).pathname))requests.push(r.url())});
 await page.setViewportSize({width:390,height:844});await page.goto('./?demo=1');await connect(page);await page.getByRole('button',{name:'Arm / resume',exact:true}).click();
 await page.getByRole('button',{name:'Presets',exact:true}).click();await page.getByRole('button',{name:'+ Save current pose',exact:true}).click();await page.getByLabel('Preset name').fill('My test pose');await page.getByRole('button',{name:'+ Save current pose',exact:true}).click();await expect(page.getByRole('button',{name:/My test pose/}).first()).toBeVisible();
 await page.getByRole('button',{name:'Guides',exact:true}).click();await expect(page.getByText(/calibrat/i).first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(requests).toEqual([]);
});
test('desktop and mobile control calibration and guide visual evidence',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});
 await page.setViewportSize({width:1536,height:1024});await page.goto('./?demo=1');await expect(page).toHaveTitle('CAMX / Control room');await connect(page);
 await page.getByRole('button',{name:'Arm / resume',exact:true}).click();await page.getByLabel('Pan offset',{exact:true}).fill('12');await page.getByLabel('Tilt offset',{exact:true}).fill('-4');await page.getByRole('button',{name:'Send offsets',exact:true}).click();await expect(page.getByLabel('Maintain control',{exact:true})).not.toBeChecked();
 await page.screenshot({path:'/tmp/camx-precision-desktop.png',fullPage:false});await page.screenshot({path:'/tmp/camx-precision-desktop-full.png',fullPage:true});
 await page.getByRole('button',{name:'Disable PWM',exact:true}).click();await page.getByRole('button',{name:'Calibration',exact:true}).click();await expect(page.getByRole('button',{name:'Save Pan calibration',exact:true})).toBeEnabled();await page.screenshot({path:'/tmp/camx-precision-calibration.png',fullPage:false});await page.screenshot({path:'/tmp/camx-precision-calibration-full.png',fullPage:true});
 await page.getByRole('button',{name:'Guides',exact:true}).click();await page.screenshot({path:'/tmp/camx-precision-guides.png',fullPage:false});
 for(const name of ['Presets','Connection','Precision'])await page.getByRole('button',{name,exact:true}).first().click();
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Precision',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'/tmp/camx-precision-mobile.png',fullPage:false});await page.screenshot({path:'/tmp/camx-precision-mobile-full.png',fullPage:true});
 await page.getByRole('button',{name:'STOP · hold',exact:true}).first().scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'STOP · hold',exact:true}).first()).toBeVisible();await page.getByRole('button',{name:'STOP · hold',exact:true}).first().click();
 expect(await page.locator('vite-error-overlay').count()).toBe(0);expect(errors).toEqual([]);
});
test('bounds and focused form fields prevent unintended keyboard motion',async({page})=>{
 const calls=await device(page);await page.goto('./');await connect(page);await page.getByRole('button',{name:'Arm / resume',exact:true}).click();
 await page.getByLabel('Pan offset',{exact:true}).fill('61');await expect(page.getByRole('button',{name:'Send offsets',exact:true})).toBeDisabled();
 await page.getByLabel('Pan offset',{exact:true}).fill('0');await page.getByRole('button',{name:'Remote',exact:true}).click();await page.getByLabel('Keyboard arrows',{exact:true}).check();await page.getByRole('button',{name:'Precision',exact:true}).click();
 await page.getByRole('button',{name:'+ Save current pose',exact:true}).click();await page.getByLabel('Preset name').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);expect(calls.filter(c=>c.path==='/move')).toHaveLength(0);
 await page.getByRole('application',{name:'Pan and tilt aiming pad'}).focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);expect(calls.filter(c=>c.path==='/move')).toHaveLength(0);
 await page.keyboard.press('Escape');await expect.poll(()=>calls.some(c=>c.path==='/stop')).toBe(true);
});
test('maintain-control is explicit and STOP ends the heartbeat lease',async({page})=>{
 const calls=await device(page);await page.goto('./');await connect(page);await page.getByRole('button',{name:'Arm / resume',exact:true}).click();
 await expect(page.getByLabel('Maintain control',{exact:true})).not.toBeChecked();await page.getByLabel('Maintain control',{exact:true}).check();
 await expect.poll(()=>calls.filter(c=>c.path==='/heartbeat').length,{timeout:5000}).toBeGreaterThan(0);
 await page.getByRole('button',{name:'STOP · hold',exact:true}).first().click();await expect(page.getByLabel('Maintain control',{exact:true})).not.toBeChecked();
 const count=calls.filter(c=>c.path==='/heartbeat').length;await page.waitForTimeout(2200);expect(calls.filter(c=>c.path==='/heartbeat')).toHaveLength(count);
});
test('lost status connection cancels control and reconnect never emits ARM or movement',async({page})=>{
 const calls=await device(page);await page.goto('./');await connect(page);await page.getByRole('button',{name:'Arm / resume',exact:true}).click();
 let broken=true;await page.route('**/status',async route=>{if(broken)await route.abort('connectionfailed');else await route.fallback()});
 await expect(page.getByRole('button',{name:'Arm / resume',exact:true})).toBeDisabled();await expect(page.getByLabel('Pan offset',{exact:true})).toBeDisabled();
 const armed=calls.filter(c=>c.path==='/arm').length,moves=calls.filter(c=>c.path==='/move').length;broken=false;await connect(page);
 expect(calls.filter(c=>c.path==='/arm')).toHaveLength(armed);expect(calls.filter(c=>c.path==='/move')).toHaveLength(moves);
});
test('backup export excludes token and import changes editors without motor commands',async({page})=>{
 const calls=await device(page);await page.goto('./');await page.getByRole('button',{name:'Connection',exact:true}).click();await page.getByLabel('Connection token').fill('export-private-token');await connect(page);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:true}).click();const download=await downloadPromise;
 const fs=await import('node:fs/promises');const raw=await fs.readFile(await download.path(),'utf8');expect(raw).not.toContain('export-private-token');const backup=JSON.parse(raw);expect(backup.schema).toBe('camx-control-v1');
 backup.presets=[{name:'Imported center',pan:3,tilt:2}];await page.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await expect(page.getByRole('button',{name:/^Imported center/})).toBeVisible();expect(calls.filter(c=>['/arm','/move','/calibration'].includes(c.path))).toHaveLength(0);
 await page.getByRole('button',{name:'Edit Imported center',exact:true}).click();await page.getByLabel('Preset name').fill('Cancelled edit');await expect(page.getByRole('button',{name:/^Imported center/})).toBeVisible();await page.getByRole('button',{name:'Cancel preset edit',exact:true}).click();await expect(page.getByRole('button',{name:/^Imported center/})).toBeVisible();await page.getByRole('button',{name:'Edit Imported center',exact:true}).click();await page.getByLabel('Preset name').fill('Edited center');await page.getByRole('button',{name:'Save preset changes',exact:true}).click();await expect(page.getByRole('button',{name:/Edited center/}).first()).toBeVisible();
 await page.getByRole('button',{name:'Delete Edited center',exact:true}).click();await expect(page.getByRole('button',{name:/Edited center/})).toHaveCount(0);
});
