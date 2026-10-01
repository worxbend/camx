// Contract test for the HTML actually embedded in the firmware; HTTP is mocked.
import {chromium} from '../viewer/node_modules/playwright-core/index.mjs';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../firmware/src/main.cpp',import.meta.url),'utf8');
const html=source.match(/R"HTML\(([\s\S]*?)\)HTML"/)[1];
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();const moves=[];
 let state={armed:false,stopped:true,estop:false,pan_min:-60,pan_max:60,tilt_min:-25,tilt_max:25,pan_target:0,tilt_target:0};
 await page.route('http://camx.test/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path==='/'){await route.fulfill({contentType:'text/html',body:html});return;}
  if(req.method()==='POST'){
   assert.equal(req.headers()['x-camx-request'],'1');assert.equal(req.headers().authorization,'Bearer test-token');
   if(path==='/arm')state={...state,armed:true,stopped:false};
   if(path==='/stop')state={...state,stopped:true};
   if(path==='/disarm')state={...state,armed:false,stopped:true};
   if(path==='/home')state={...state,pan_target:0,tilt_target:0};
   if(path==='/move'){
    assert.equal(req.headers()['content-type'],'application/json');
    const body=req.postDataJSON();moves.push(body);state={...state,pan_target:body.pan,tilt_target:body.tilt};
   }
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(state)});
 });
 await page.goto('http://camx.test/');
 await page.waitForFunction(()=>document.querySelector('#state').textContent==='PWM disabled');
 assert(await page.locator('#pan').isDisabled());
 await page.locator('#token').fill('test-token');await page.locator('#arm').click();
 await page.waitForFunction(()=>!document.querySelector('#pan').disabled);
 await page.evaluate(()=>{for(const [id,value] of [['pan',15],['tilt',-5]]){const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('input'));}});
 await page.waitForFunction(()=>document.querySelector('#pv').value==='15');
 await page.waitForTimeout(250);assert.deepEqual(moves,[{pan:15,tilt:-5}]);
 await page.locator('#home').click();await page.waitForFunction(()=>document.querySelector('#pan').value==='0');
 await page.locator('#stop').click();await page.waitForFunction(()=>document.querySelector('#pan').disabled);
 await page.locator('#off').click();await page.waitForFunction(()=>document.querySelector('#state').textContent==='PWM disabled');
 console.log('Embedded firmware UI: authenticated actions and combined JSON offsets passed');
}finally{await browser.close();}
