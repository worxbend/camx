import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createControlServer,privateAddress} from '../tools/serve_control.mjs';
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=server=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);});
test('private LAN policy excludes public and mapped IPv6 addresses',()=>{
 for(const ip of ['127.0.0.1','192.168.1.1','10.0.0.1','172.16.0.1','172.31.0.1','169.254.0.1','::1','fd12::1','fe80::1'])assert.ok(privateAddress(ip),ip);
 for(const ip of ['8.8.8.8','172.15.0.1','172.32.0.1','192.169.0.1','0.0.0.0','::ffff:127.0.0.1','2001:db8::1'])assert.equal(privateAddress(ip),false,ip);
});
test('bridge forwards complete motion/calibration requests without token leaks and rejects outside origins',async()=>{
 const requests=[];
 const device=http.createServer(async(req,res)=>{let body='';for await(const data of req)body+=data;requests.push({path:req.url,body,token:req.headers.authorization});res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({armed:false,stopped:true}));});
 const devicePort=await listen(device),directory=await mkdtemp(path.join(os.tmpdir(),'camx-bridge-'));
 await writeFile(path.join(directory,'index.html'),'<h1>CAMX</h1>');
 const bridge=await createControlServer({deviceUrl:`http://127.0.0.1:${devicePort}`,directory});const port=await listen(bridge),origin=`http://127.0.0.1:${port}`;
 try{
  const motion={pan:12.5,tilt:-4},calibration={axis:0,center:1500,low:1400,high:1600,minimum:-10,maximum:10,invert:false,speed:5};
  for(const [endpoint,payload] of [['/move',motion],['/jog',{pan:.25,tilt:-.25,epoch:123,seq:7}],['/jog',{pan:0,tilt:0,epoch:123,seq:8}],['/calibration',calibration]]){
   const res=await fetch(origin+endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-CAMX-Request':'1',Authorization:'Bearer local-test-token'},body:JSON.stringify(payload)});
   assert.equal(res.status,200);assert.equal(await res.text(),'{"armed":false,"stopped":true}');assert.deepEqual(JSON.parse(requests.at(-1).body),payload);assert.equal(requests.at(-1).token,'Bearer local-test-token');
  }
  let res=await fetch(origin+'/heartbeat',{method:'POST',headers:{'X-CAMX-Request':'1'},body:''});assert.equal(res.status,200);assert.equal(requests.at(-1).body,'');
  const wrongHostCode=await new Promise((resolve,reject)=>{const request=http.request(origin+'/status',{headers:{Host:'evil.example'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end();});
  assert.equal(wrongHostCode,403);
  const count=requests.length;
  for(const headers of [{Origin:'https://evil.example','X-CAMX-Request':'1'},{}]){res=await fetch(origin+'/move',{method:'POST',headers,body:'{}'});assert.ok([400,403].includes(res.status),JSON.stringify({headers,status:res.status}));}
  res=await fetch(origin+'/move',{method:'POST',headers:{'X-CAMX-Request':'1'},body:'x'.repeat(385)});assert.equal(res.status,413);
  res=await fetch(origin+'/move?token=oops',{method:'POST',headers:{'X-CAMX-Request':'1'},body:'{}'});assert.equal(res.status,400);
  assert.equal(requests.length,count);
  res=await fetch(origin+'/control/');assert.equal(res.status,200);assert.match(await res.text(),/CAMX/);
  res=await fetch(origin+'/control/%2e%2e%2fpackage.json');assert.equal(res.status,400);
  res=await fetch(origin+'/status',{method:'POST',headers:{'X-CAMX-Request':'1'},body:''});assert.equal(res.status,405);
 }finally{await close(bridge);await close(device);await rm(directory,{recursive:true,force:true});}
});
test('bridge does not forward to public addresses',async()=>{
 const bridge=await createControlServer({deviceUrl:'http://8.8.8.8'}),port=await listen(bridge);
 try{const response=await fetch(`http://127.0.0.1:${port}/status`);assert.equal(response.status,403);}finally{await close(bridge);}
});
