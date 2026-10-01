import {mkdir,copyFile,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const pub=path.join(root,'viewer/public');
await mkdir(path.join(pub,'models'),{recursive:true});
await copyFile(path.join(root,'exports/assembly/camx.glb'),path.join(pub,'models/camx.glb'));
await copyFile(path.join(root,'exports/manifest.json'),path.join(pub,'models/manifest.json'));
await cp(path.join(root,'exports'),path.join(pub,'downloads'),{recursive:true});
await cp(path.join(root,'docs'),path.join(pub,'guide'),{recursive:true});
await cp(path.join(root,'exports/firmware'),path.join(pub,'firmware'),{recursive:true});
console.log('Synced CAD, firmware and build guide.');

await rm(path.join(pub,'control'),{recursive:true,force:true});
await cp(path.join(root,'exports/control'),path.join(pub,'control'),{recursive:true});
