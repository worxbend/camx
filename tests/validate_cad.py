"""Geometric prototype checks; no substitute for physical fit or cable testing."""
import sys,json,itertools,zipfile,xml.etree.ElementTree as ET
import numpy as np
from pathlib import Path
import trimesh
from build123d import Pos,Rot
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'cad'))
from model import build
p=json.loads((ROOT/'cad/parameters.json').read_text());parts,hw,meta=build(p)
checks=[]
def overlap(a,b):
 result=a&b
 return result.volume if result else 0

def clear(a,b,label):
 v=overlap(a,b);assert v<.01,f'{label}: intersection {v:.3f} mm3';checks.append(label)
for name,shape in parts.items():
 assert shape.is_valid and len(shape.solids())==1,name
 m=trimesh.load(ROOT/'exports/parts'/f'{name}.stl',force='mesh')
 assert m.is_watertight and m.is_winding_consistent,name
 assert len(m.split())==1,name
 assert m.volume>0,name
 assert m.bounds[0,2]>=-1e-4,name
 with zipfile.ZipFile(ROOT/'exports/parts'/f'{name}.3mf') as z:
  xml=ET.fromstring(z.read('3D/3dmodel.model'))
  assert xml.attrib.get('unit','millimeter')=='millimeter',name
  meshes=xml.findall('.//{*}mesh');assert len(meshes)==1,name
  vertices=[[float(v.attrib[k]) for k in ['x','y','z']] for v in meshes[0].findall('{*}vertices/{*}vertex')]
  faces=[[int(v.attrib[k]) for k in ['v1','v2','v3']] for v in meshes[0].findall('{*}triangles/{*}triangle')]
  mf=trimesh.Trimesh(vertices=vertices,faces=faces,process=True)
  assert mf.is_watertight and mf.is_winding_consistent,name+' 3MF'
  assert np.max(np.abs(mf.bounds-m.bounds))<.15,name+' STL/3MF bounds mismatch'

 checks.append(name+': CAD valid, one solid, STL + 3MF watertight/oriented/bed aligned, matching bounds')
# All printed pieces must have zero-volume mutual overlap at neutral assembly.
for a,b in itertools.combinations([n for n in parts if n!='fit_coupon'],2):clear(parts[a],parts[b],f'neutral parts {a}/{b}')
for a,b in [('base','pan_servo'),('base','esp32_envelope'),('base','usb_pcb_envelope'),('base','capacitor_envelope'),('lid','pan_servo'),('pan_arm','bearing_6805'),('pan_arm','tilt_servo'),('camera_cradle','camera_envelope'),('camera_cradle','tilt_servo'),('tilt_cover','tilt_servo')]:clear(parts[a],hw[b],f'neutral hardware {a}/{b}')
for angle in range(-25,26,5):
 transform=Pos(0,0,p['tilt_axis_z'])*Rot(angle,0,0)*Pos(0,0,-p['tilt_axis_z'])
 for name in ['camera_cradle','camera_envelope']:
  shape=transform*(parts[name] if name in parts else hw[name])
  for fixed in ['pan_arm','tilt_cover','lid','base']:clear(shape,parts[fixed],f'tilt {angle}: {name}/{fixed}')
for angle in range(-60,61,10):
 for name in ['pan_arm','camera_cradle','tilt_cover','spindle_keeper']:
  shape=Rot(0,0,angle)*parts[name]
  for fixed in ['lid','base','bearing_retainer']:clear(shape,parts[fixed],f'pan {angle}: {name}/{fixed}')
result={'passed':True,'checks':len(checks),'details':checks,'limits':{'tilt':[-25,25],'pan':[-60,60]},'limitations':['finite sampled poses, not continuous proof','hardware envelopes approximate','horns/fasteners/cables not collision modeled','dimensions unconfirmed','no physical load testing']}
(ROOT/'exports/validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(f'PASS: {len(checks)} CAD/mesh/clearance checks')
