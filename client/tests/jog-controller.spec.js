import {test,expect} from '@playwright/test';
import {JogController} from '../src/jog-controller.js';
test('held inputs repeat once per lease cadence without key repeat accumulation',async()=>{
 const sent=[],releases=[];const c=new JogController({canJog:()=>true,send:(pan,tilt)=>sent.push({pan,tilt}),release:()=>releases.push(1)});
 try{expect(c.start('right',1,0)).toBe(true);expect(c.start('right',1,0)).toBe(false);c.start('up',0,1);await new Promise(r=>setTimeout(r,230));expect(sent.length).toBeGreaterThanOrEqual(4);expect(sent.at(-1)).toEqual({pan:.25,tilt:.25});c.end('right');expect(sent.at(-1)).toEqual({pan:0,tilt:.25});c.end('up');expect(releases).toHaveLength(1);const count=sent.length;await new Promise(r=>setTimeout(r,120));expect(sent).toHaveLength(count)}finally{c.dispose()}
});
test('lost ability to jog clears ownership and cannot restart without new input',async()=>{
 let allowed=true;const sent=[];const c=new JogController({canJog:()=>allowed,send:(pan,tilt)=>sent.push({pan,tilt}),release:()=>{}});
 try{c.start('right',1,0);allowed=false;await new Promise(r=>setTimeout(r,130));expect(c.inputs.size).toBe(0);expect(c.timer).toBeNull();allowed=true;const count=sent.length;await new Promise(r=>setTimeout(r,130));expect(sent).toHaveLength(count);c.start('up',0,1);expect(sent.at(-1)).toEqual({pan:0,tilt:.25})}finally{c.dispose()}
});
test('opposing holds cancel rate and clear invokes only one release',()=>{
 const sent=[],release=[];const c=new JogController({canJog:()=>true,send:(pan,tilt)=>sent.push({pan,tilt}),release:()=>release.push(1)});
 try{c.start('right',1,0);c.start('left',-1,0);expect(sent.at(-1)).toEqual({pan:0,tilt:0});c.setFraction(5);expect(c.fraction).toBe(.25);c.clear();c.clear();expect(release).toHaveLength(1);expect(c.timer).toBeNull()}finally{c.dispose()}
});
test('repeated cleanup awaits the same pending release without duplicate requests',async()=>{
 let resolve;const calls=[];const c=new JogController({canJog:()=>true,send:()=>{},release:()=>{calls.push(1);return new Promise(r=>resolve=r)}});
 c.start('right',1,0);const first=c.clear();const second=c.clear();expect(first).toBe(second);expect(calls).toHaveLength(1);expect(c.timer).toBeNull();resolve();await first;expect(c.clear()).toBeNull();c.dispose();
});
