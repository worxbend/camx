/** Stage the statically built client for the ESP32's LittleFS partition. */
import {cp,mkdir,readdir,rm,lstat,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'client/dist'),destination=path.join(root,'firmware/data/control');
if(!(await lstat(path.join(source,'index.html'))).isFile())throw Error('Client index must be a regular file');
const assets=await readdir(path.join(source,'assets'),{withFileTypes:true});
for(const asset of assets)if(!asset.isFile() || !/^[a-zA-Z0-9_.-]+$/.test(asset.name))throw Error(`Unsupported firmware asset: ${asset.name}`);
await mkdir(path.dirname(destination),{recursive:true});
await rm(destination,{recursive:true,force:true});
await mkdir(path.join(destination,'assets'),{recursive:true});
await cp(path.join(source,'index.html'),path.join(destination,'index.html'));
for(const asset of assets)await cp(path.join(source,'assets',asset.name),path.join(destination,'assets',asset.name));
let bytes=0;const files=[];
for(const name of ['index.html',...assets.map(a=>`assets/${a.name}`)]){
 const data=await readFile(path.join(destination,name));bytes+=data.length;
 files.push({name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
if(bytes>1024*1024)throw Error('Client exceeds the 1 MiB staging budget; inspect the default filesystem partition before upload');
await writeFile(path.join(root,'client/dist/firmware-files.json'),JSON.stringify({files,bytes},null,2)+'\n');
console.log(`Staged ${files.length} files (${bytes} bytes) into firmware/data/control/`);
