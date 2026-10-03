"""Geometric prototype checks; no substitute for physical fit or cable testing."""
import sys,json,itertools,zipfile,xml.etree.ElementTree as ET
import numpy as np
from pathlib import Path
import trimesh
from build123d import Pos,Rot,Plane,Box,Align
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'cad'))
from model import build,print_pose
p=json.loads((ROOT/'cad/parameters.json').read_text());parts,hw,meta=build(p)
checks=[]
def overlap(a,b):
 result=a&b
 return result.volume if result else 0

def clear(a,b,label):
 v=overlap(a,b);assert v<.01,f'{label}: intersection {v:.3f} mm3';checks.append(label)
for name,shape in parts.items():
 assert shape.is_valid and len(shape.solids())==1,name
 printed=print_pose(name,shape).bounding_box()
 assert printed.size.X<180 and printed.size.Y<150,name+' exceeds print-layout spacing'
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
mirrored=parts['tilt_cover'].mirror(Plane.YZ)
assert abs(mirrored.volume-parts['idler_cover'].volume)<1e-5
assert overlap(mirrored,parts['idler_cover'])>mirrored.volume-.01
checks.append('left/right outer covers are exact mirrored solids')
# Probe the new standoff bodies near the shell wall on both sides.
from build123d import Cylinder,Align
boss_tip=p['arm_inner_x']+p['arm_thickness']+p['servo_flange_z']+6-3-.3
for z in [meta['rotary_bottom_z']+6+15,p['tilt_axis_z']+12]:
 local_len=p['arm_stem_depth'] if z==meta['rotary_bottom_z']+6+15 else p['servo_flange_z']+6
 boss_tip=p['arm_inner_x']+p['arm_thickness']+local_len-3-.3
 for y in [-10,10]:
  probe=Pos(boss_tip-2,y+2,z)*Rot(0,90,0)*Cylinder(.3,1,align=(Align.CENTER,Align.CENTER,Align.MIN))
  assert overlap(parts['drive_arm'],probe)>probe.volume-.001
  assert overlap(parts['idler_arm'],probe.mirror(Plane.YZ))>probe.volume-.001
checks.append('both arms contain four near-cover standoffs for short screws')
# All printed pieces must have zero-volume mutual overlap at neutral assembly.
for a,b in itertools.combinations([n for n in parts if n!='fit_coupon'],2):clear(parts[a],parts[b],f'neutral parts {a}/{b}')
for a,b in [('base','pan_servo'),('base','esp32_envelope'),('base','usb_pcb_envelope'),('base','usb_flange_envelope'),('base','capacitor_envelope'),('lid','pan_servo'),('pan_arm','bearing_6805'),('drive_arm','tilt_servo'),('camera_cradle','camera_envelope'),('camera_cradle','tilt_servo'),('tilt_cover','tilt_servo'),('idler_arm','idler_bearing_625'),('idler_arm','idler_spacer'),('camera_cradle','idler_axle_M5'),('idler_cover','idler_bearing_625'),('idler_cover','idler_axle_M5')]:clear(parts[a],hw[b],f'neutral hardware {a}/{b}')
for n in ['idler_axle_M5','idler_jam_nut_M5']:
 clear(hw[n],hw['camera_envelope'],f'narrow cradle camera/{n}')
clear(parts['camera_cradle'],hw['idler_jam_nut_M5'],'jam nut fits captive pocket')
assert abs(parts['camera_cradle'].bounding_box().size.X-57.2)<.01
checks.append('cradle narrowed exactly 5 mm per side to 57.2 mm')
flange_bounds=hw['usb_flange_envelope'].bounding_box()
assert abs(flange_bounds.max.X-(p['base_width']/2-p['usb_flange_recess']+p['usb_flange_thickness']))<1e-6
assert flange_bounds.max.X<=p['base_width']/2
checks.append('USB flange is recessed within exterior wall; PCB is internal')
# Packed electronics must remain clear of each other and the lid/cowl.
for a,b in itertools.combinations(['pan_servo','esp32_envelope','usb_pcb_envelope','capacitor_envelope'],2):clear(hw[a],hw[b],f'packed electronics {a}/{b}')
for n in ['esp32_envelope','usb_pcb_envelope','capacitor_envelope']:
 for fixed in ['lid','pan_arm']:clear(hw[n],parts[fixed],f'packed enclosure {n}/{fixed}')
# Connector-sized cable passages remain open in the assembled printed geometry.
clear(parts['base'],Pos(0,p['base_depth']/2,p['base_height']-10)*Box(8,6,3,align=(Align.CENTER,Align.CENTER,Align.MIN)),'rear base cable entry open')
clear(parts['pan_arm'],Pos(0,p['pan_platform_diameter']/2-2,p['base_height']+p['lid_thickness']+1)*Box(8,6,20,align=(Align.CENTER,Align.CENTER,Align.MIN)),'rear pan notch open through platform roof')
clear(parts['tilt_cover'],Pos(p['arm_inner_x']+p['arm_thickness']+13,15,p['tilt_axis_z']-10)*Box(8,10,4,align=(Align.CENTER,Align.CENTER,Align.MIN)),'rear servo shell exit open')
for name in parts:
 if name!='fit_coupon':clear(hw['tilt_cable_route'],parts[name],f'neutral illustrative cable/{name}')
clear(parts['base'],Pos(p['base_width']/2-2.5,p['usb_mount_y'],18-p['usb_body_opening_height']/2)*Box(5,p['usb_body_opening_width'],p['usb_body_opening_height'],align=(Align.CENTER,Align.CENTER,Align.MIN)),'configured USB body opening unobstructed through wall and PCB rails')
clear(parts['fit_coupon'],Pos(-25,-23,-1)*Box(p['usb_body_opening_width'],p['usb_body_opening_height'],5,align=(Align.CENTER,Align.CENTER,Align.MIN)),'fit coupon matches configured USB body opening')
for angle in range(-25,26,5):
 transform=Pos(0,0,p['tilt_axis_z'])*Rot(angle,0,0)*Pos(0,0,-p['tilt_axis_z'])
 for name in ['camera_cradle','camera_envelope']:
  shape=transform*(parts[name] if name in parts else hw[name])
  for fixed in ['pan_arm','drive_arm','tilt_cover','idler_arm','idler_bearing_retainer','idler_cover','lid','base']:clear(shape,parts[fixed],f'tilt {angle}: {name}/{fixed}')
for angle in range(-60,61,10):
 for name in ['pan_arm','drive_arm','camera_cradle','tilt_cover','spindle_keeper','idler_arm','idler_bearing_retainer','idler_cover']:
  shape=Rot(0,0,angle)*parts[name]
  for fixed in ['lid','base','bearing_retainer']:clear(shape,parts[fixed],f'pan {angle}: {name}/{fixed}')
result={'passed':True,'checks':len(checks),'details':checks,'limits':{'tilt':[-25,25],'pan':[-60,60]},'limitations':['finite sampled poses, not continuous proof','hardware envelopes approximate','actual cables, deformation and motion sweep not collision modeled','dimensions unconfirmed','no physical load testing']}
(ROOT/'exports/validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(f'PASS: {len(checks)} CAD/mesh/clearance checks')
