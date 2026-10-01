import {test,expect} from '@playwright/test';
import {sanitizePresets,parseBackup} from '../src/storage.js';
const calibration=[0,1].map(axis=>({axis,center:1500,low:1400,high:1600,minimum:-10,maximum:10,invert:false,speed:5}));
test('preset import limits names counts finite angles and strips unknown fields',()=>{
 expect(sanitizePresets([{name:'  Center ',pan:0,tilt:0,token:'secret'}])).toEqual([{name:'Center',pan:0,tilt:0}]);
 for(const value of [null,{},Array(25).fill({name:'A',pan:0,tilt:0}),[{name:'',pan:0,tilt:0}],[{name:'A',pan:NaN,tilt:0}],[{name:'A',pan:61,tilt:0}],[{name:'A',pan:0,tilt:26}]])expect(sanitizePresets(value)).toBeNull();
});
test('backup requires known schema and both valid axes; private fields discarded',()=>{
 const input={schema:'camx-control-v1',presets:[{name:'Test',pan:0,tilt:0}],calibration,token:'private'};
 const parsed=parseBackup(JSON.stringify(input));expect(parsed).toEqual({presets:input.presets,calibration});expect(JSON.stringify(parsed)).not.toContain('private');
 for(const patch of [{schema:'unknown'},{calibration:[calibration[0]]},{calibration:[calibration[1],calibration[0]]},{presets:[{name:'Outside',pan:99,tilt:0}]}])expect(()=>parseBackup(JSON.stringify({...input,...patch}))).toThrow();
 expect(()=>parseBackup(' '.repeat(32769))).toThrow('32 KB');
});
