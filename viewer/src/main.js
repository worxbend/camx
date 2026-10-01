import './style.css';
import {renderIcons} from './icons.js';
import {CadStudio} from './scene.js';
renderIcons();
const $=id=>document.getElementById(id);const base=import.meta.env.BASE_URL;
const state=()=>({pan:Number($('pan').value),tilt:Number($('tilt').value),explode:Number($('explode').value),hardware:$('hardware').checked,wireframe:$('wireframe').checked});
let studio;
function update(){for(const id of ['pan','tilt','explode']){const el=$(id);$(id+'-value').value=el.value+(id==='explode'?'':'°');el.style.setProperty('--progress',`${100*(Number(el.value)-Number(el.min))/(Number(el.max)-Number(el.min))}%`);}studio?.update(state());}
function selectView(name){document.querySelectorAll('[data-view]').forEach(btn=>{btn.classList.toggle('selected',btn.dataset.view===name);btn.setAttribute('aria-pressed',String(btn.dataset.view===name));});studio?.view(name);}
for(const id of ['pan','tilt','explode','hardware','wireframe'])$(id).addEventListener('input',update);
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>selectView(btn.dataset.view)));
$('reset').addEventListener('click',()=>{for(const id of ['pan','tilt','explode'])$(id).value=0;$('hardware').checked=true;$('wireframe').checked=false;studio?.hidden.clear();document.querySelectorAll('#part-list input').forEach(el=>el.checked=true);update();selectView('perspective');});
try{
 const res=await fetch(`${base}models/manifest.json`);if(!res.ok)throw Error('CAD manifest unavailable');const manifest=await res.json();
 $('pan').min=-manifest.parameters.pan_limit_deg;$('pan').max=manifest.parameters.pan_limit_deg;$('tilt').min=-manifest.parameters.tilt_limit_deg;$('tilt').max=manifest.parameters.tilt_limit_deg;
 studio=new CadStudio($('viewport'),manifest);const names=await studio.load(`${base}models/camx.glb`);
 for(const name of names){const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=true;checkbox.dataset.part=name;checkbox.addEventListener('change',()=>{studio.togglePart(name,checkbox.checked);update();});label.append(checkbox,document.createTextNode(name.replaceAll('_',' ')));$('part-list').append(label);}
 $('loading').hidden=true;update();window.camxStudio=studio;
}catch(error){console.error(error);$('loading').textContent='3D preview unavailable. Download the CAD files above to inspect the design.';$('loading').setAttribute('role','alert');for(const id of ['pan','tilt','explode','hardware','wireframe','reset'])$(id).disabled=true;}
