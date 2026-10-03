import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1536,height:1024},deviceScaleFactor:1});
async function capture(path){
 await page.evaluate(async()=>{const s=window.camxStudio;s.active=false;s.resize();s.view('perspective');s.renderer.render(s.scene,s.camera);const canvas=s.renderer.domElement;const img=document.createElement('img');img.id='camx-snapshot';img.src=canvas.toDataURL('image/png');img.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';canvas.replaceWith(img);await img.decode();});
 try{await page.screenshot({path,fullPage:true,timeout:60000});}
 finally{await page.evaluate(()=>document.getElementById('camx-snapshot').replaceWith(window.camxStudio.renderer.domElement));}
}
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.CAMX_QA_URL??'http://localhost:5173');
await page.waitForFunction(()=>window.camxStudio && window.camxStudio.parts.size===Object.keys(window.camxStudio.manifest.parts).length-1+window.camxStudio.manifest.hardware.length,null,{timeout:30000});
await page.locator('#loading').waitFor({state:'hidden'});
assert.ok(await page.evaluate(()=>window.camxStudio.parts.get('tilt_cable_route').visible),'neutral cable route shown');await page.waitForTimeout(700);
await mkdir('../docs/design',{recursive:true});
assert.equal(await page.locator('h1').textContent(),'Made to move.');
assert.ok(await page.evaluate(()=>window.camxStudio.parts.get('idler_axle_M5').parent===window.camxStudio.tilt && window.camxStudio.parts.get('idler_jam_nut_M5').parent===window.camxStudio.tilt),'printed axle and captive nut follow camera tilt');
assert.ok(await page.evaluate(()=>window.camxStudio.parts.get('idler_cover').parent===window.camxStudio.pan),'passive shell follows pan');
assert.ok(await page.evaluate(()=>window.camxStudio.parts.get('idler_cover').userData.hardware===false),'passive shell is printable');
for(const [id,value]of [['pan',35],['tilt',-20],['explode',70]])await page.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
assert.ok(await page.evaluate(()=>window.camxStudio.pan.rotation.y<0));
assert.ok(await page.evaluate(()=>window.camxStudio.tilt.rotation.x<0));
assert.equal(await page.locator('#pan-value').textContent(),'35°');
assert.equal(await page.evaluate(()=>window.camxStudio.parts.get('tilt_cable_route').visible),false,'static cable guide hidden in moving/exploded poses');
assert.ok(await page.evaluate(()=>window.camxStudio.parts.get('lid').position.y>10));
await page.locator('#hardware').uncheck();assert.equal(await page.evaluate(()=>window.camxStudio.parts.get('pan_servo').visible),false);
await page.locator('#wireframe').check();assert.equal(await page.evaluate(()=>{let v=false;window.camxStudio.parts.get('base').traverse(o=>{if(o.isMesh)v=o.material.wireframe;});return v;}),true);
await page.locator('summary').click();await page.locator('[data-part="lid"]').uncheck();assert.equal(await page.evaluate(()=>window.camxStudio.parts.get('lid').visible),false);
for(const v of ['front','side','top','perspective']){await page.locator(`[data-view="${v}"]`).click();assert.equal(await page.locator(`[data-view="${v}"]`).getAttribute('aria-pressed'),'true');}
await page.locator('#reset').click();assert.ok(await page.evaluate(()=>Math.abs(window.camxStudio.pan.rotation.y)<1e-8));assert.equal(await page.evaluate(()=>window.camxStudio.parts.get('lid').visible),true);
await page.locator('summary').click();await page.waitForTimeout(200);
for(const href of ['models/camx.glb','downloads/camx-files.zip','downloads/assembly/print_layout.3mf','downloads/assembly/camx.step','guide/build.html'])assert.equal((await page.request.get(new URL(href,page.url()).href)).status(),200,href);
await page.evaluate(()=>{const s=window.camxStudio;s.active=false;s.renderer.render(s.scene,s.camera);});
await capture('../docs/design/viewer-desktop.png');
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.evaluate(()=>{const s=window.camxStudio;s.renderer.render(s.scene,s.camera);});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
await capture('../docs/design/viewer-mobile.png');
await page.locator('a[href="guide/build.html"]').first().click();await page.locator('h1').waitFor();assert.match(await page.locator('h1').textContent(),/CAMX assembly/);
assert.deepEqual(errors,[]);
const result={passed:true,desktop:[1536,1024],mobile:[390,844],checks:['neutral cable guide visibility and moving/exploded hiding','all CAD part groups loaded','pan/tilt pivots','explode transforms','hardware visibility','wireframe','per-part visibility','four camera views','reset','download links HTTP 200','mobile no overflow','guide navigation','zero page errors'],method:'Playwright Chromium fallback; IAB unavailable'};
await writeFile('../docs/design/viewer-qa.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
