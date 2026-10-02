import {test,expect} from '@playwright/test';
import {Transport,initialStatus} from '../src/transport.js';
const reply=s=>({ok:true,status:200,json:async()=>s});
test('release outranks in-flight hold and unsent reversal with monotonic sequence',async()=>{
 const state={...initialStatus(),armed:true,stopped:false,control_epoch:42};const calls=[];
 const t=new Transport({fetcher:async(url,opts)=>{const body=opts.body&&JSON.parse(opts.body);calls.push({url,body});if(url==='/jog'&&body.pan!==0)return new Promise((_r,reject)=>opts.signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError'))));return reply({...state,jog_seq:body?.seq||0,jog_pan:body?.pan||0,jog_tilt:body?.tilt||0,jog_active:!!(body?.pan||body?.tilt)})}});
 await t.request('/status',undefined,'GET');const hold=t.jog(.25,0).catch(()=>{});await t.jog(-.25,.25);await t.releaseJog();await hold;
 expect(calls.filter(c=>c.url==='/jog').map(c=>c.body)).toEqual([{pan:.25,tilt:0,epoch:42,seq:1},{pan:0,tilt:0,epoch:42,seq:3}]);expect(t.jogPending).toBeNull();expect(t.jogSending).toBe(false);
});
test('old epochs do not return after cancelled session and sequence exhaustion requires ARM',async()=>{
 const t=new Transport();t.configure({demo:true});await t.request('/arm');const oldEpoch=t.jogEpoch;await t.jog(.25,0);await t.stop();expect(t.jogEpoch).not.toBe(oldEpoch);await expect(t.jog(.25,0)).rejects.toThrow();
 await t.request('/arm');expect(t.jogEpoch).not.toBe(oldEpoch);t.jogSeq=0xffffffff;await expect(t.jog(.25,0)).rejects.toThrow('sequence exhausted');
});
test('demo jog lease expiry latches STOP and invalidates epoch',async()=>{
 const t=new Transport();t.configure({demo:true});await t.request('/arm');await t.jog(.25,0);const oldEpoch=t.jogEpoch;t.demoJogLast=Date.now()-600;const state=await t.request('/status',undefined,'GET');expect(state.stopped).toBe(true);expect(state.jog_active).toBe(false);expect(state.control_epoch).not.toBe(oldEpoch);
});
test('legacy status disables jog API and malformed partial capabilities are rejected',async()=>{
 const legacy={...initialStatus()};for(const k of ['control_epoch','jog_seq','jog_pan','jog_tilt','jog_active','jog_lease_ms'])delete legacy[k];
 const t=new Transport({fetcher:async()=>reply(legacy)});await t.request('/status',undefined,'GET');await expect(t.jog(.25,0)).rejects.toThrow('newer firmware');
 const malformed=new Transport({fetcher:async()=>reply({...legacy,control_epoch:1})});await expect(malformed.request('/status',undefined,'GET')).rejects.toThrow();
});
test('exhausted release returns a rejection and cancels active queued jog intent',async()=>{
 const state={...initialStatus(),armed:true,stopped:false,control_epoch:99};const calls=[];
 const t=new Transport({fetcher:async(url,opts)=>{calls.push(url);if(url==='/jog')return new Promise((_r,reject)=>opts.signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError'))));return reply(state)}});
 await t.request('/status',undefined,'GET');const hold=t.jog(.25,0).catch(()=>{});await t.jog(-.25,0);t.jogSeq=0xffffffff;let release;expect(()=>release=t.releaseJog()).not.toThrow();await expect(release).rejects.toThrow('sequence exhausted');await hold;expect(t.jogPending).toBeNull();expect(t.jogSending).toBe(false);expect(t.jogControllers.size).toBe(0);expect(calls.filter(p=>p==='/jog')).toHaveLength(1);
});
