import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1536,height:1024},deviceScaleFactor:2});
await page.goto(process.env.CAMX_QA_URL??'http://localhost:5173');await page.waitForFunction(()=>window.camxStudio?.parts.size===17);
await page.evaluate(()=>{document.querySelector('.intro').style.display='none';document.querySelector('.viewport-bottom').style.display='none';});
for(const name of ['assembled','rear','structure','exploded']){
 await page.evaluate(name=>{const s=window.camxStudio;s.update({pan:0,tilt:0,explode:name==='exploded'?65:0,hardware:name!=='structure',wireframe:false});s.view('perspective');if(name==='rear'){s.camera.position.set(235,175,-305);s.controls.update();}if(name==='exploded'){s.controls.target.set(0,110,0);s.camera.position.set(320,250,430);s.controls.update();}},name);
 await page.waitForTimeout(250);await page.locator('#viewport').screenshot({path:`../exports/images/${name}.png`});
}
await browser.close();console.log('Rendered four views from actual CAD GLB.');
