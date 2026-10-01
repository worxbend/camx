import {test,expect} from '@playwright/test';
import {Transport,initialStatus,validCalibration,validStatus} from '../src/transport.js';
const reply=s=>({ok:true,status:200,json:async()=>s});
test('combined offsets and auth contract never serialize token into logs',async()=>{
 const calls=[],logs=[];let state=initialStatus();
 const t=new Transport({fetcher:async(url,opts)=>{calls.push({url,...opts});return reply(state)},onLog:x=>logs.push(x)});
 t.configure({token:'test-private-token'});await t.request('/status',undefined,'GET');await t.request('/arm');await t.move(12,-4);
 expect(calls[0].headers.Authorization).toBeUndefined();expect(calls[1].body).toBeUndefined();
 expect(calls[2].headers).toMatchObject({'X-CAMX-Request':'1',Authorization:'Bearer test-private-token','Content-Type':'application/json'});
 expect(JSON.parse(calls[2].body)).toEqual({pan:12,tilt:-4});expect(JSON.stringify(logs)).not.toContain('test-private-token');
});
test('STOP aborts active request and discards coalesced movement',async()=>{
 const calls=[],states=[];const t=new Transport({onStatus:s=>states.push(s),fetcher:(url,opts)=>{
 calls.push(url);if(url==='/move')return new Promise((resolve,reject)=>{opts.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')))});return Promise.resolve(reply({...initialStatus(),stopped:true}));
 }});const first=t.move(1,2).catch(()=>{});await t.move(3,4);await t.stop();await first;
 expect(calls).toEqual(['/move','/stop']);expect(t.pending).toBeNull();expect(t.moving).toBe(false);expect(states).toHaveLength(1);
});
test('session changes ignore delayed old response',async()=>{
 let resolve;const states=[];const t=new Transport({onStatus:s=>states.push(s),fetcher:()=>new Promise(r=>resolve=r)});
 const old=t.request('/arm').catch(()=>{});t.configure({demo:true});resolve(reply({...initialStatus(),armed:true}));await old;
 expect(states).toEqual([]);await t.request('/status',undefined,'GET');expect(states.at(-1).armed).toBe(false);
});
test('network failure cancels queued moves and signals connection fault',async()=>{
 const faults=[];const t=new Transport({onError:s=>faults.push(s),fetcher:async()=>{throw new TypeError('network')}});
 await expect(t.move(3,4)).rejects.toThrow('network');expect(t.pending).toBeNull();expect(t.moving).toBe(false);expect(faults[0]).toContain('never arms automatically');
});
test('demo requires explicit arm and disarmed calibration',async()=>{
 const t=new Transport();t.configure({demo:true});await expect(t.move(1,2)).rejects.toThrow('Arm explicitly');
 await t.request('/arm');await t.move(1,2);await expect(t.request('/calibration',{axis:0})).rejects.toThrow('Disable PWM');
 await t.stop();await expect(t.move(2,3)).rejects.toThrow('Arm explicitly');await t.request('/disarm');
 expect((await t.request('/status',undefined,'GET')).armed).toBe(false);
});
test('calibration validates finite ordered pulses and axis limits',()=>{
 const c={axis:0,center:1500,low:1400,high:1600,minimum:-10,maximum:10,invert:false,speed:5};expect(validCalibration(c)).toBe(true);
 for(const patch of [{center:1700},{low:1500},{low:699},{high:2301},{maximum:61},{minimum:0},{speed:NaN},{speed:61},{high:Infinity},{invert:1},{axis:2},{axis:-1},{axis:1,maximum:26}])expect(validCalibration({...c,...patch})).toBe(false);
});
test('missing response expires and clears active motion state',async()=>{
 const faults=[];const t=new Transport({onError:s=>faults.push(s),fetcher:(_url,opts)=>new Promise((_resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(new DOMException('Timeout','AbortError'))))});
 await expect(t.move(8,2)).rejects.toThrow('Timeout');expect(t.pending).toBeNull();expect(t.moving).toBe(false);expect(t.controllers.size).toBe(0);expect(faults).toHaveLength(1);
});
test('malformed device status never enables a client session',async()=>{
 expect(validStatus(initialStatus())).toBe(true);for(const patch of [{armed:'true'},{pan:NaN},{pan_target:61},{tilt_max:26},{pan_low:0},{firmware:undefined}])expect(validStatus({...initialStatus(),...patch})).toBe(false);
 const states=[],faults=[];const t=new Transport({onStatus:s=>states.push(s),onError:e=>faults.push(e),fetcher:async()=>reply({armed:true})});await expect(t.request('/status',undefined,'GET')).rejects.toThrow();expect(states).toHaveLength(0);expect(faults).toHaveLength(1);
});
test('older status response cannot overwrite newer STOP confirmation',async()=>{
 let resolveOld;const states=[];const t=new Transport({onStatus:s=>states.push(s),fetcher:(url)=>url==='/status'?new Promise(r=>resolveOld=r):Promise.resolve(reply({...initialStatus(),armed:true,stopped:true}))});
 const old=t.request('/status',undefined,'GET').catch(()=>{});await t.request('/stop');resolveOld(reply({...initialStatus(),armed:true,stopped:false}));await old;expect(states).toHaveLength(1);expect(states[0].stopped).toBe(true);
});
