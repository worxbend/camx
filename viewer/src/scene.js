import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const moving=new Set(['pan_arm','spindle_keeper','tilt_cover','tilt_servo','camera_cradle','camera_envelope','camera_lens']);
const tilting=new Set(['camera_cradle','camera_envelope','camera_lens']);
const colors={base:0x303b45,lid:0x48525b,pan_arm:0x4b6268,tilt_cover:0x39444e,camera_cradle:0xd5aa67,bearing_retainer:0xaab6bf,spindle_keeper:0xaab6bf,camera_envelope:0x232a31,camera_lens:0x183f48};
const offsets={base:[0,0,0],tripod_nut_retainer:[0,15,0],lid:[0,32,0],bearing_retainer:[0,48,0],spindle_keeper:[0,10,0],pan_arm:[0,66,0],tilt_cover:[35,66,0],camera_cradle:[-35,95,0],camera_envelope:[-35,120,0],camera_lens:[-35,120,0],pan_servo:[0,12,0],tilt_servo:[35,66,0],bearing_6805:[0,39,0],esp32_envelope:[-35,0,0],capacitor_envelope:[30,0,20],usb_pcb_envelope:[0,0,-30],usb_flange_envelope:[0,0,-30]};
export class CadStudio{
 constructor(el,manifest){
  this.el=el;this.parts=new Map();this.hidden=new Set();this.manifest=manifest;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#0b1017');this.scene.fog=new THREE.Fog('#0b1017',550,1000);
  this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  el.append(this.renderer.domElement);this.camera=new THREE.PerspectiveCamera(33,1,.5,2000);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.minDistance=180;this.controls.maxDistance=750;this.controls.maxPolarAngle=Math.PI*.88;
  const pmrem=new THREE.PMREMGenerator(this.renderer);const env=new RoomEnvironment();this.scene.environment=pmrem.fromScene(env,.05).texture;env.dispose();pmrem.dispose();
  this.scene.add(new THREE.HemisphereLight(0xd9e9ff,0x334149,.5));
  const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-140,300,240);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-200;key.shadow.camera.right=200;key.shadow.camera.top=220;key.shadow.camera.bottom=-200;key.shadow.camera.near=1;key.shadow.camera.far=700;key.shadow.normalBias=.4;key.shadow.bias=-.0001;this.scene.add(key);
  const rim=new THREE.DirectionalLight(0xbdece0,1);rim.position.set(200,140,-130);this.scene.add(rim);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshStandardMaterial({color:0x080f16,roughness:1,envMapIntensity:.1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.5;ground.receiveShadow=true;this.scene.add(ground);
  const grid=new THREE.GridHelper(1500,75,0x273c45,0x1c2c36);grid.position.y=0;grid.material.transparent=true;grid.material.opacity=.42;this.scene.add(grid);
  this.pan=new THREE.Group();this.scene.add(this.pan);this.tilt=new THREE.Group();this.tilt.position.y=manifest.parameters.tilt_axis_z;this.pan.add(this.tilt);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(el);this.view('perspective');
  this.active=true;this.animate=()=>{if(!this.active)return;this.controls.update();this.renderer.render(this.scene,this.camera);requestAnimationFrame(this.animate)};this.animate();
 }
 resize(){const w=this.el.clientWidth,h=this.el.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 async load(url){
  const {scene:root}=await new GLTFLoader().loadAsync(url);root.scale.setScalar(1000);this.scene.add(root);this.scene.updateMatrixWorld(true);
  const assembly=root.getObjectByName('CAMX_complete_reference_assembly');if(!assembly)throw Error('CAD assembly group not found');
  for(const node of [...assembly.children]){
   const name=node.name;const holder=new THREE.Group();holder.name='part-'+name;this.scene.add(holder);holder.attach(node);this.scene.updateMatrixWorld(true);
   if(tilting.has(name))this.tilt.attach(holder);else if(moving.has(name))this.pan.attach(holder);
   holder.userData.original=holder.position.clone();holder.userData.name=name;holder.userData.hardware=!(name in this.manifest.parts);
   node.traverse(obj=>{if(!obj.isMesh)return;const original=Array.isArray(obj.material)?obj.material[0]:obj.material;
    obj.material=new THREE.MeshStandardMaterial({color:colors[name]??original?.color??0x47667f,roughness:name==='camera_cradle'?.4:.48,metalness:name==='camera_cradle'?.65:name.includes('bearing')?.75:.2,envMapIntensity:.65,side:THREE.DoubleSide});obj.castShadow=true;obj.receiveShadow=true;
   });this.parts.set(name,holder);
  }
  this.scene.remove(root);this.resize();return [...this.parts.keys()];
 }
 view(name){
  const target=new THREE.Vector3(0,72,0);this.controls.target.copy(target);
  const views={perspective:[235,175,305],front:[0,90,400],side:[400,90,0],top:[0,440,.01]};this.camera.position.fromArray(views[name]);this.camera.up.set(0,1,0);this.controls.update();
 }
 update({pan=0,tilt=0,explode=0,hardware=true,wireframe=false}){
  this.pan.rotation.y=-THREE.MathUtils.degToRad(pan);this.tilt.rotation.x=THREE.MathUtils.degToRad(tilt);
  for(const [name,holder]of this.parts){holder.position.copy(holder.userData.original);const off=new THREE.Vector3(...(offsets[name]??[0,0,0])).multiplyScalar(explode/100);holder.position.add(off);holder.visible=!this.hidden.has(name)&&(!holder.userData.hardware||hardware);
   holder.traverse(obj=>{if(obj.isMesh)obj.material.wireframe=wireframe;});
  }
  this.controls.target.y=72+explode*.35;this.controls.update();
 }
 togglePart(name,visible){visible?this.hidden.delete(name):this.hidden.add(name);}
}
