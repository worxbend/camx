"""CAMX v2: symmetrical U-yoke bearing-assisted gimbal based on the user's photos 7/8.
Millimetres. Z up, camera looks -Y, tilt about X, pan about Z.
Hardware dimensions in parameters.json are provisional measured-fit defaults.
Run from any directory: python cad/model.py [--params path] [--out path].
"""
import argparse,json,math
from copy import copy
from pathlib import Path
from build123d import (Box,Cylinder,Pos,Rot,Align,Part,Compound,Color,export_stl,
 export_step,export_brep,export_gltf,Mesher,ExportSVG,ExportDXF,GeomType)
ROOT=Path(__file__).resolve().parents[1]
MIN=(Align.CENTER,Align.CENTER,Align.MIN)

def box(w,d,h,x=0,y=0,z=0): return Pos(x,y,z)*Box(w,d,h,align=MIN)
def cyl(d,h,x=0,y=0,z=0): return Pos(x,y,z)*Cylinder(d/2,h,align=MIN)
def xhole(d,length,x,y,z): return Pos(x,y,z)*Rot(0,90,0)*Cylinder(d/2,length,align=MIN)
def yhole(d,length,x,y,z): return Pos(x,y,z)*Rot(-90,0,0)*Cylinder(d/2,length,align=MIN)
def rounded(w,d,h,r,x=0,y=0,z=0):
 s=Box(w,d,h,align=MIN)
 s=s.fillet(r,s.edges().filter_by(__import__('build123d').Axis.Z))
 horizontal=s.edges().filter_by(__import__('build123d').Axis.Z,reverse=True)
 s=s.fillet(min(.8,h/4,r/2),horizontal)
 return Pos(x,y,z)*s

def servo(p):
 s=box(p['servo_length'],p['servo_width'],p['servo_height'])
 s+=box(p['servo_flange_span'],p['servo_width'],2,z=p['servo_flange_z'])
 s+=cyl(10,p['servo_shaft_z']-2-p['servo_height'],x=p['servo_shaft_offset_x'],z=p['servo_height'])
 s+=cyl(4.8,2,x=p['servo_shaft_offset_x'],z=p['servo_shaft_z']-2)
 return s

def build(p):
 W,D,H,t=p['base_width'],p['base_depth'],p['base_height'],p['wall'];R=p.get('base_corner_radius',22)
 top=H+p['lid_thickness'];axis=p['tilt_axis_z'];ax=p['arm_inner_x'];at=p['arm_thickness'];ix=p['idler_arm_inner_x']
 # Fixed bearing shoulder at top+0.5, bearing top at top+7.5.
 bearing_bottom=top+.5;bearing_top=bearing_bottom+p['bearing_height']
 rotary_bottom=bearing_top+3;rotary_top=rotary_bottom+6
 stem_bottom=bearing_bottom-.2
 pan_origin_z=stem_bottom-p['servo_shaft_z']
 pan_body_x=-p['servo_shaft_offset_x']
 flange_top=pan_origin_z+p['servo_flange_z']
 screws=[(x,y) for x in [-W/2+20,W/2-20] for y in [-D/2+9.5,D/2-9.5]]
 parts={};hardware={}
 # Open base; detachable lid. Nonconductive rails capture the ESP32 by its PCB edges.
 base=rounded(W,D,H,R)-rounded(W-2*t,D-2*t,H,R-t,z=t)
 # Subtle perimeter seam and recessed front wordmark for a finished product look.
 base-=rounded(W+2,D+2,1.2,R,z=H-7)-rounded(W-1.2,D-1.2,2,R-.6,z=H-7.4)
 from build123d import Text,extrude
 word=extrude(Text('CAMX',font_size=7,font='DejaVu Sans',align=(Align.CENTER,Align.CENTER)),amount=.8)
 base-=Pos(0,-D/2+.6,23)*Rot(90,0,0)*word
 for x,y in screws:
  base+=cyl(9,H-t,x,y,t)
  base-=cyl(2.6,H-3,x,y,4) # M3 screws into pilot holes
 # SG90 mounting ears supported on two towers, with holes from above.
 for x in [pan_body_x-p['servo_mount_pitch']/2,pan_body_x+p['servo_mount_pitch']/2]:
  base+=box(7,p['servo_width']+5,flange_top-t,x,0,t)
  base-=cyl(2.1,12,x,0,flange_top-11)
 base-=box(p['servo_length']+.7,p['servo_width']+.7,flange_top-t+1,pan_body_x,0,t)
 # Servo body insertion corridor between towers.
 # ESP board vertical at left, long axis Y, USB toward -Y.
 ex=-W/2+t+7;elen=p['esp32_length'];ew=p['esp32_width'];ez=t+2
 for y in [-elen/2-2,elen/2+2]:
  base+=box(7,4,ew+3,ex,y,t)
  base-=box(2.2,5,ew+3,ex,y,ez)
 # Board foot rest; rail slots allow insulated header pins to face the roomy center.
 base+=box(7,elen+4,2,ex,0,t)
 base-=box(16,t+2,12,ex,-D/2,ez+ew/2-6)
 # Exterior flange sits 0.2 mm below the wall; PCB and receptacle body are inside.
 usb_x=22;usb_z=18;front=D/2
 recess=p['usb_flange_recess'];ft=p['usb_flange_thickness'];back=p['usb_mount_backing']
 assert recess>=ft and back>=3, 'USB flange must be flush/recessed with >=3 mm backing'
 usb_transform=Pos(W/2,p['usb_mount_y'],0)*Rot(0,0,-90)*Pos(-usb_x,-front,0)
 # Reinforce the locally thinned wall before cutting a rectangular flange pocket.
 base+=usb_transform*box(p['usb_flange_width']+8,recess+back,p['usb_flange_height']+8,usb_x,front-(recess+back)/2,usb_z-p['usb_flange_height']/2-4)
 base-=usb_transform*box(p['usb_flange_width']+2*p['fit_clearance'],recess+1,p['usb_flange_height']+2*p['fit_clearance'],usb_x,front-(recess-1)/2,usb_z-p['usb_flange_height']/2-p['fit_clearance'])
 for dx in [-p['usb_flange_hole_pitch']/2,p['usb_flange_hole_pitch']/2]:
  base-=usb_transform*yhole(p['usb_flange_hole_diameter'],recess+back+2,usb_x+dx,front-recess-back-1,usb_z)
 # Edge rails support the PCB without touching pads; secure with insulated zip ties.
 pcb_front=front-recess
 for x in [usb_x-p['usb_pcb_width']/2-1,usb_x+p['usb_pcb_width']/2+1]:
  base+=usb_transform*box(2,p['usb_pcb_depth'],usb_z-3-t,x,pcb_front-p['usb_pcb_depth']/2,t)
  for y in [pcb_front-5,pcb_front-p['usb_pcb_depth']+4]:
   base-=usb_transform*box(3,3,t+2,x,y,-1)
 # PCB body opening sized separately from the owner-specified flange, including clearance through rails.
 base-=usb_transform*box(p['usb_body_opening_width'],recess+back+2,p['usb_body_opening_height'],usb_x,front-(recess+back)/2,usb_z-p['usb_body_opening_height']/2)
 # Separate regulated PSU cable through right wall, away from the USB board.
 base-=xhole(p['power_cable_diameter']+1,t+4,W/2-t-1,-22,13)
 for y in [-28,-16]:base-=box(3,3,t+2,W/2-t-8,y,-1)
 # Capacitor cup with lead passage, plus two zip-tie floor slots.
 cx,cy=22,-22;cd=p['capacitor_diameter']+p['fit_clearance']*2
 base+=cyl(cd+4,8,cx,cy,t)-cyl(cd,9,cx,cy,t+1)
 base-=cyl(6,t+3,cx,cy,-1)
 for dx in [-cd/2-3,cd/2+3]:base-=box(2,5,t+2,cx+dx,cy,-1)
 # Rear stationary cable entry, below the rotating cowl. Feed connector
 # before closing the lid; two floor slots anchor an insulated zip tie.
 base-=box(12,t+4,8,0,D/2,H-12)
 for x in [-9,9]:base-=box(3,4,t+2,x,D/2-t-6,-1)
 # Steel tripod nut sits 1 mm above underside; separate cap prevents it floating.
 base+=cyl(20,3.6,0,0,t)
 base-=cyl(6.8,14,0,0,-1)
 nut=Pos(0,0,1)*__import__('build123d').extrude(__import__('build123d').RegularPolygon(11.5/math.sqrt(3),6),amount=7)
 base-=nut
 nutcap=cyl(19,2,z=6.6)-cyl(6.8,4,z=5.6)
 nutcap-=box(20,p['servo_width']+5,4,pan_body_x-p['servo_mount_pitch']/2+3.5-10,0,5.6)
 for y in [-7.3,7.3]:
  base-=cyl(1.8,6,0,y,1)
  nutcap-=cyl(2.3,4,0,y,5.6)
 parts['tripod_nut_retainer']=nutcap
 # Air slots on front, keeping electronics above the openings.
 for x in [-20,-10,0,10,20]:base-=box(5,t+4,3,x,-D/2,9)
 parts['base']=base
 lid=rounded(W,D,p['lid_thickness'],R,z=H)
 # Thin locating lip outside hardware, interrupted only by lid screw bosses.
 lip=rounded(W-2*t-.6,D-2*t-.6,2,R-t,z=H-2)-rounded(W-2*t-4.6,D-2*t-4.6,3,R-t-1,z=H-2.5)
 for x,y in screws:lip-=cyl(10,4,x,y,H-3)
 lid+=lip
 lid+=cyl(p['bearing_od']+8,p['bearing_height']+.5,z=top)
 lid-=cyl(p['bearing_id']+.8,25,z=H-3)
 lid-=cyl(p['bearing_id']+6.6,bearing_bottom-H+3,z=H-3)
 lid-=cyl(p['bearing_od']+p['fit_clearance'],p['bearing_height']+3,z=bearing_bottom)
 for x,y in screws:
  lid-=cyl(3.3,10,x,y,H-3);lid-=cyl(6.4,2.1,x,y,top-2)
 # Cable enters the rear base wall; keep the lid closed above the electronics.
 parts['lid']=lid
 # Outer bearing retainer: three screws into lid bearing-boss flange.
 rr=(p['bearing_od']+4)/2
 ret=cyl(p['bearing_od']+8,2,z=bearing_top+.2)-cyl(p['bearing_od']-2,4,z=bearing_top-1)
 for deg in [90,210,330]:
  x,y=rr*math.cos(math.radians(deg)),rr*math.sin(math.radians(deg))
  ret-=cyl(2.3,4,x,y,bearing_top-.5)
  lid-=cyl(1.8,12,x,y,top)
 parts['lid']=lid;parts['bearing_retainer']=ret
 # Bearing-supported rotating L arm. Stock horn sits in bottom pocket; no printed spline.
 pan_d=p['pan_platform_diameter']
 platform=cyl(pan_d,6,z=rotary_bottom)
 platform=platform.fillet(.8,platform.edges())
 cowl=cyl(pan_d,rotary_top-top-.8,z=top+.8)-cyl(pan_d-6,rotary_bottom-top+2,z=top+.5)
 cowl=cowl.fillet(.8,cowl.edges())
 cowl-=box(14,10,8,0,pan_d/2-1,top+4) # rear cable-loop exit, clear of bearing races
 platform+=cowl
 # Continuous open rear notch through cowl AND platform roof.
 platform-=box(14,16,rotary_top-top+2,0,pan_d/2-2,top+.5)
 for x in [-11,11]:platform-=box(3,4,8,x,pan_d/2-9,rotary_bottom-1)
 platform+=cyl(p['bearing_id']-.2,rotary_bottom-stem_bottom,z=stem_bottom)
 platform+=cyl(p['bearing_id']+6,rotary_bottom-bearing_top-.2,z=bearing_top+.2)
 platform-=box(p['horn_width']+.4,p['horn_length']+.4,p['horn_thickness']+.4,z=stem_bottom-.1)
 platform-=cyl(5,30,z=stem_bottom-1)
 for y in [-p['horn_screw_pitch']/2,p['horn_screw_pitch']/2]:
  platform-=cyl(2.2,25,0,y,stem_bottom-1);platform-=cyl(4.5,3,0,y,rotary_top-2.9)
 # Keeper screwed below inner race prevents lift, with .2 mm axial clearance.
 keeper=cyl(p['bearing_id']+6,2,z=bearing_bottom-2.2)-cyl(18,4,z=bearing_bottom-3)
 for x in [-10.5,10.5]:
  keeper-=cyl(2.3,5,x,0,bearing_bottom-3)
  platform-=cyl(1.8,10,x,0,stem_bottom-.1)
 parts['spindle_keeper']=keeper
 # Symmetric U-yoke: shared outer profile, mirrored shell; functional internals differ.
 from build123d import Plane,RectangleRounded,extrude
 def pod(x,width,inset=0):
  depth=40-2*inset;height=axis+26-rotary_top-2*inset
  profile=Plane.YZ*RectangleRounded(depth,height,min(18-inset,height/2-.1))
  shape=Pos(x,0,(rotary_top+axis+26)/2)*extrude(profile,amount=width)
  shape=shape.fillet(.8,[e for e in shape.edges() if e.geom_type==GeomType.CIRCLE])
  # Shallow lower spine and a component-sized upper pivot pod.
  stem=min(width,p['arm_stem_depth']-inset)
  shape &= box(stem,depth+2,height+2,x+stem/2,0,rotary_top-1)+xhole(40-2*inset,width+2,x-1,0,axis+4)
  return shape
 right=pod(ax,at)
 right+=rounded(14,40,8,5,ax+7,0,rotary_top-.1)
 # Integral outer-facing bosses bridge the shell cavity: short M2 screws,
 # rather than long screws across the entire servo housing.
 cover_x=ax+at;cover_len=p['servo_flange_z']+6
 screw_z=[rotary_top+15,axis+12]
 boss_end=cover_x+cover_len-3-.3
 cover_bosses=None
 for z in screw_z:
  local_len=p['arm_stem_depth'] if z==screw_z[0] else cover_len
  boss_end=cover_x+local_len-3-.3
  for y in [-10,10]:
   boss=xhole(6.5,boss_end-cover_x+.5,cover_x-.5,y,z)
   boss=boss.fillet(.4,boss.edges())
   boss-=xhole(1.8,7.2,boss_end-7,y,z)
   right+=boss
   cover_bosses=boss if cover_bosses is None else cover_bosses+boss
 # Matching rear tie eyes preserve the two-sided outer silhouette.
 tie_eyes=None
 for z in [axis-19,rotary_top+12]:
  eye=rounded(at,8,5,1,ax+at/2,20,z-2.5)
  eye-=box(2.5,3,7,ax+at/2,21,z-3.5)
  right+=eye
  tie_eyes=eye if tie_eyes is None else tie_eyes+eye
 platform+=right
 tilt_origin_x=ax+at+2+p['servo_flange_z']
 tilt_origin_z=axis-p['servo_shaft_offset_x'];body_center_z=tilt_origin_z
 platform-=box(at+4,p['servo_width']+.7,p['servo_length']+.7,ax+at/2,0,body_center_z-p['servo_length']/2-.35)
 for dz in [-p['servo_mount_pitch']/2,p['servo_mount_pitch']/2]:
  platform-=xhole(2.3,at+6,ax-2,0,body_center_z+dz)
  platform-=xhole(4.5,1.8,ax,0,body_center_z+dz)
 cover_x=ax+at;cover_len=p['servo_flange_z']+6
 screw_z=[rotary_top+15,axis+12]
 for z in screw_z:
  for y in [-10,10]:platform-=xhole(1.8,at+2,ax-1,y,z)
 drive=platform & right
 platform-=right
 for y in [-10,10]:
  platform-=cyl(2.6,8,ax+8,y,rotary_bottom-1)
  drive-=cyl(3.3,12,ax+8,y,rotary_top-1)
  drive-=cyl(6.4,2.1,ax+8,y,rotary_top+6)
 parts['drive_arm']=drive
 parts['pan_arm']=platform
 cover=pod(cover_x,cover_len)-pod(cover_x-.1,cover_len-3,3)
 # Identical circular pivot medallions on each outer cover.
 medallion=xhole(28,1.5,cover_x+cover_len-.2,0,axis)
 cover+=medallion.fillet(.4,medallion.edges())
 for z in screw_z:
  local_len=p['arm_stem_depth'] if z==screw_z[0] else cover_len
  for y in [-10,10]:
   cover-=xhole(2.3,cover_len+3,cover_x-1,y,z)
   cover-=xhole(4.5,2.2,cover_x+local_len-1.8,y,z)
 # Connector-sized rear exit from the pivot cavity, mirrored on passive side.
 cover-=box(12,30,10,cover_x+13,15,axis-12)
 cover-=right+Pos(0,0,.3)*right # identical interface relief on both shells
 parts['tilt_cover']=cover
 # Passive side has the exact same external shell, with no second motor.
 idler=pod(ax,at)+rounded(14,40,8,5,ax+7,0,rotary_top)+cover_bosses+tie_eyes
 idler=idler.mirror(Plane.YZ)
 bearing_x=-ax-at
 idler-=xhole(9,at+2,bearing_x-1,0,axis)
 idler-=xhole(p['idler_bearing_od']+.3,p['idler_bearing_width']+.1,bearing_x-.1,0,axis)
 for y in [-10,10]:
  platform-=cyl(2.6,8,-ax-8,y,rotary_bottom-1)
  idler-=cyl(3.3,12,-ax-8,y,rotary_top-1)
  idler-=cyl(6.4,2.1,-ax-8,y,rotary_top+6)
 for z in screw_z:
  for y in [-10,10]:idler-=xhole(1.8,at+2,bearing_x-1,y,z)
 for z in [axis-9,axis+9]:idler-=xhole(1.8,at+2,bearing_x-1,0,z)
 parts['pan_arm']=platform;parts['idler_arm']=idler
 parts['idler_cover']=cover.mirror(Plane.YZ)
 ir=xhole(24,2,bearing_x-2,0,axis)-xhole(p['idler_bearing_od']-2,4,bearing_x-3,0,axis)
 for z in [axis-9,axis+9]:ir-=xhole(2.3,4,bearing_x-3,0,z)
 parts['idler_bearing_retainer']=ir
 # Cradle shelf and swept quarter-round rib along one side: matches the curved sketch.
 shelfz=p['camera_bottom_z']-10;cw=p['camera_width'];depth=p['camera_depth']+4
 cradle=rounded(cw+8,depth,5,3,z=shelfz)
 cradle+=rounded(cw-8,depth-6,5,2,z=shelfz+5)
 # Small rounded elbow below the camera; straight web clears the camera body.
 inner_x=cw/2+3;radius=8;elbow_z=shelfz+13
 if axis < elbow_z+4:raise ValueError('tilt axis too low for the curved cradle')
 outer=Pos(inner_x-radius,-7,elbow_z)*Rot(-90,0,0)*Cylinder(radius+5,14,align=MIN)
 inner=Pos(inner_x-radius,-8,elbow_z)*Rot(-90,0,0)*Cylinder(radius,16,align=MIN)
 arc=(outer-inner)&box(radius+6,18,radius+6,inner_x-radius+(radius+6)/2,0,elbow_z-radius-6)
 cradle+=arc
 cradle+=rounded(5,14,axis-elbow_z+1,1,inner_x+2.5,0,elbow_z-.5)
 # Connect curve to tilt hub on inner side of upright, with stock horn recess facing +X.
 horn_plane=tilt_origin_x-p['servo_shaft_z']
 hubx=horn_plane-4
 cradle+=rounded(hubx+5-inner_x,14,6,1,(inner_x+hubx+5)/2,0,axis-3)
 cradle+=xhole(12,5,hubx,0,axis)
 right_cheek_blank=cradle & box(18,24,65,31,0,shelfz-1)
 for dz in [-p["horn_screw_pitch"]/2,p["horn_screw_pitch"]/2]:
  right_cheek_blank+=rounded(4,10,7,.8,hubx+1,0,axis+dz-3.5)
 cradle-=xhole(5,16,hubx-8,0,axis)
 for dz in [-p['horn_screw_pitch']/2,p['horn_screw_pitch']/2]:
  # Extend vertical web locally so horn attachment screws have printed material.
  cradle+=rounded(4,10,7,.8,hubx+1,0,axis+dz-3.5)
  cradle-=xhole(2.2,12,hubx-4,0,axis+dz)
 cradle-=box(p['horn_thickness']+.4,p['horn_width']+.4,p['horn_length']+.4,horn_plane-.8,0,axis-p['horn_length']/2-.2)
 # Matching curved cheeks: mirror the right outer cradle before interface cuts.
 right_cheek=right_cheek_blank
 cradle+=right_cheek.mirror(Plane.YZ)
 left_outer=-ax+.4
 cradle-=xhole(5.3,12,left_outer-1,0,axis)
 hexnut=Pos(-ax+4.4,0,axis)*Rot(0,90,0)*extrude(__import__('build123d').RegularPolygon(8.3/math.sqrt(3),6),amount=5.5)
 cradle-=hexnut
 # Camera bolt slot gives +/-8 mm fore-aft balance adjustment; underside head recess.
 ty=p['camera_thread_y']
 slot=box(6.8,16,14,0,ty,shelfz-1)+cyl(6.8,14,0,ty-8,shelfz-1)+cyl(6.8,14,0,ty+8,shelfz-1)
 cradle-=slot
 cradle-=box(12,27,2.5,0,ty,shelfz-.1)
 # Cable ties secure camera cable on cradle rear edge, outside lens/mic envelope.
 for x in [-15,15]:cradle-=box(3,3,8,x,depth/2-5,shelfz-1)
 cradle-=box(20,40,100,-ax-10+.4,0,shelfz-1)
 cradle-=box(20,40,100,ax+10-.4,0,shelfz-1) # maintain gap to the thicker upright
 parts['camera_cradle']=cradle
 # Small fit coupon: first print this to check bearing, servo cavity, horn, USB and cap.
 coupon=box(105,68,3)
 coupon+=cyl(p['bearing_od']+5,7,-29,7,3)-cyl(p['bearing_od']+.3,9,-29,7,2.5)
 coupon-=box(p['servo_length']+.7,p['servo_width']+.7,5,19,15,-1)
 coupon-=box(p['horn_width']+.4,p['horn_length']+.4,5,42,11,-1)
 coupon+=cyl(cd+4,7,10,-18,3)-cyl(cd,9,10,-18,2.5)
 coupon-=box(p['usb_flange_width']+2*p['fit_clearance'],p['usb_flange_height']+2*p['fit_clearance'],recess+1,-25,-23,3-recess)
 coupon-=box(p['usb_body_opening_width'],p['usb_body_opening_height'],5,-25,-23,-1)
 for dx in [-p['usb_flange_hole_pitch']/2,p['usb_flange_hole_pitch']/2]:coupon-=cyl(p['usb_flange_hole_diameter'],5,-25+dx,-23,-1)
 parts['fit_coupon']=coupon
 # Non-print hardware envelopes, intentionally simplified and labelled.
 hardware['pan_servo']=Pos(pan_body_x,0,pan_origin_z)*servo(p)
 hardware['tilt_servo']=Pos(tilt_origin_x,0,tilt_origin_z)*Rot(0,-90,0)*servo(p)
 hardware['bearing_6805']=cyl(p['bearing_od'],p['bearing_height'],z=bearing_bottom)-cyl(p['bearing_id'],p['bearing_height']+2,z=bearing_bottom-1)
 hardware['esp32_envelope']=box(1.6,elen,ew,ex,0,ez)+box(p['esp32_thickness_envelope']-2,elen-8,ew-4,ex+p['esp32_thickness_envelope']/2-1,0,ez+2)
 hardware['capacitor_envelope']=cyl(p['capacitor_diameter'],p['capacitor_height'],cx,cy,t+1)
 hardware['usb_pcb_envelope']=usb_transform*box(p['usb_pcb_width'],p['usb_pcb_depth'],2,usb_x,pcb_front-p['usb_pcb_depth']/2,usb_z-3)
 flange=box(p['usb_flange_width'],ft,p['usb_flange_height'],usb_x,front-recess+ft/2,usb_z-p['usb_flange_height']/2)
 flange-=box(p['usb_socket_width'],ft+2,p['usb_socket_height'],usb_x,front-recess+ft/2,usb_z-p['usb_socket_height']/2)
 for dx in [-p['usb_flange_hole_pitch']/2,p['usb_flange_hole_pitch']/2]:
  flange-=yhole(p['usb_flange_hole_diameter'],ft+2,usb_x+dx,front-recess-1,usb_z)
 hardware['usb_flange_envelope']=usb_transform*flange
 camera=Box(cw,p['camera_depth'],p['camera_height'],align=MIN)
 camera=camera.fillet(4,camera.edges())
 hardware['idler_bearing_625']=xhole(p['idler_bearing_od'],p['idler_bearing_width'],bearing_x,0,axis)-xhole(p['idler_bearing_id'],p['idler_bearing_width']+2,bearing_x-1,0,axis)
 hardware['idler_spacer']=xhole(7.5,p['idler_spacer_length'],bearing_x+p['idler_bearing_width'],0,axis)-xhole(5.2,p['idler_spacer_length']+2,bearing_x+p['idler_bearing_width']-1,0,axis)
 hardware['idler_outer_washers']=xhole(7.5,2,bearing_x-2,0,axis)-xhole(5.2,4,bearing_x-3,0,axis)
 hardware['idler_axle_M5']=xhole(5,16,bearing_x-2,0,axis)+xhole(8.5,3.5,bearing_x-5.5,0,axis)
 hardware['camera_envelope']=Pos(0,0,p['camera_bottom_z'])*camera
 # Illustrative neutral cable route, not a harness or motion-sweep simulation.
 from build123d import Sphere,Vector
 route=[(cover_x+20,0,axis),(cover_x+13,24,axis-8),(ax+at/2,27,axis-19),(ax+at/2,27,rotary_top+12),(22,37,rotary_top+3.5),(0,44,rotary_top+4),(0,49,rotary_top-3.5),(0,58,H),(0,D/2,H-8),(0,30,H-14)]
 cable_segments=[]
 for a,b in zip(route,route[1:]):
  v=Vector(b)-Vector(a)
  segment=Plane(origin=a,z_dir=v)*Cylinder(1.5,v.length,align=MIN)
  segment+=Pos(*a)*Sphere(1.5);segment+=Pos(*b)*Sphere(1.5)
  cable_segments.append(segment)
 hardware['tilt_cable_route']=Compound(children=cable_segments)
 hardware['camera_lens']=yhole(23,2,0,-p['camera_depth']/2-2,p['camera_bottom_z']+p['camera_height']/2)
 meta={'bearing_bottom_z':bearing_bottom,'bearing_top_z':bearing_top,'rotary_bottom_z':rotary_bottom,'tilt_axis':[0,0,axis], 'pan_servo_origin':[pan_body_x,0,pan_origin_z], 'tilt_servo_origin':[tilt_origin_x,0,tilt_origin_z], 'horn_plane_x':horn_plane}
 meta['profile_edge_fillet_mm']=.8
 meta['pivot_cap_fillet_mm']=.4
 return parts,hardware,meta

COLORS={'base':'#263746','lid':'#445b69','pan_arm':'#427f8c','camera_cradle':'#dbac65','tilt_cover':'#3a586a','bearing_retainer':'#acb9c1','spindle_keeper':'#acb9c1','fit_coupon':'#dbac65','tripod_nut_retainer':'#acb9c1','idler_arm':'#427f8c','idler_bearing_retainer':'#acb9c1','idler_cover':'#3a586a','drive_arm':'#427f8c'}
def colored(shape,name,color):
 result=copy(shape);result.label=name;result.color=Color(color);return result

def print_pose(name,shape):
 if name=='pan_arm':shape=Rot(180,0,0)*shape # flat upper face down; inspect spline-horn pocket supports
 if name in ['idler_arm','idler_bearing_retainer']:shape=Rot(0,90,0)*shape
 if name=='camera_cradle':shape=Rot(0,-90,0)*shape # curved rib on bed, shelf vertical
 if name=='drive_arm':shape=Rot(0,-90,0)*shape
 if name=='tilt_cover':shape=Rot(0,90,0)*shape
 if name=='idler_cover':shape=Rot(0,-90,0)*shape # closed outward face down
 bb=shape.bounding_box();return Pos(-bb.center().X,-bb.center().Y,-bb.min.Z)*shape

def projection(shape,path,eye,up=(0,0,1)):
 visible,hidden=Part(shape.wrapped).project_to_viewport(eye,viewport_up=up,look_at=shape.bounding_box().center())
 svg=ExportSVG(margin=5,line_weight=.18,line_color='#263746')
 edges=[]
 for edge in visible.edges():
  if edge.length<1e-5:continue
  # OCCT sometimes projects closed ellipses with identical SVG arc endpoints.
  if edge.geom_type==GeomType.ELLIPSE and (edge.position_at(0)-edge.position_at(1)).length<1e-5:
   edges.extend([edge.trim(0,.5),edge.trim(.5,1)])
  else:edges.append(edge)
 svg.add_layer('visible')
 for edge in edges:
  try:svg.add_shape(edge,'visible')
  except AssertionError:
   # Degenerate projected ellipse: preserve its outline as a sampled vector polyline.
   from build123d import Edge
   points=[edge.position_at(i/64) for i in range(65)]
   lines=[Edge.make_line(a,b) for a,b in zip(points,points[1:]) if (a-b).length>1e-6]
   if lines:svg.add_shape(Compound(children=lines),'visible')
 svg.write(path.with_suffix('.svg'))
 dxf=ExportDXF();dxf.add_layer('visible');dxf.add_shape(visible,'visible');dxf.write(path.with_suffix('.dxf'))

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--params',type=Path,default=ROOT/'cad/parameters.json');parser.add_argument('--out',type=Path,default=ROOT/'exports');args=parser.parse_args()
 p=json.loads(args.params.read_text());parts,hardware,meta=build(p);out=args.out
 for folder in ['parts','assembly','images','drawings']: (out/folder).mkdir(parents=True,exist_ok=True)
 report={'units':'mm','parameters':p,'datums':meta,'parts':{},'prototype_status':'BEARING-ASSISTED PROTOTYPE; DIMENSIONS UNCONFIRMED; BENCH FIT REQUIRED','hardware':list(hardware)}
 printing=[]
 for i,(name,shape) in enumerate(parts.items()):
  if not shape.is_valid or len(shape.solids())!=1:raise RuntimeError(f'{name}: invalid or disconnected solid ({len(shape.solids())})')
  s=colored(shape,name,COLORS[name]);placed=print_pose(name,s);dest=out/'parts'/name
  export_stl(placed,str(dest.with_suffix('.stl')),tolerance=.08,angular_tolerance=.15)
  mesh=Mesher();mesh.add_shape(placed,linear_deflection=.08,angular_deflection=.15);mesh.write(str(dest.with_suffix('.3mf')))
  export_step(s,str(dest.with_suffix('.step')));export_brep(s,str(dest.with_suffix('.brep')))
  bb=placed.bounding_box();report['parts'][name]={'volume_mm3':round(shape.volume,3),'print_bounds_mm':[round(v,3) for v in bb.size], 'solids':len(shape.solids()),'valid':bool(shape.is_valid)}
  projection(s,out/'drawings'/name,(180,-240,190))
  printing.append(Pos((i%3)*180,(i//3)*150,0)*placed)
  print('exported',name,flush=True)
 assembled=[colored(s,n,COLORS[n]) for n,s in parts.items() if n!='fit_coupon']
 for n,s in hardware.items(): assembled.append(colored(s,n,'#214063' if 'servo' in n else '#82949d' if 'bearing' in n else '#273139' if 'camera' in n else '#db8b4e' if n=='tilt_cable_route' else '#478365'))
 assembly=Compound(children=assembled,label='CAMX_complete_reference_assembly')
 printset=Compound(children=printing,label='CAMX_print_layout')
 export_step(assembly,str(out/'assembly/camx.step'));export_brep(assembly,str(out/'assembly/camx.brep'))
 export_gltf(assembly,str(out/'assembly/camx.glb'),binary=True,linear_deflection=.12,angular_deflection=.2)
 export_gltf(assembly,str(out/'assembly/camx.gltf'),binary=False,linear_deflection=.12,angular_deflection=.2)
 for name,comp in [('print_layout',printset),('reference_assembly_DO_NOT_PRINT',assembly)]:
  m=Mesher();m.add_shape(comp,linear_deflection=.08,angular_deflection=.15);m.write(str(out/'assembly'/f'{name}.3mf'))
 for view,eye,up in [('front',(0,-1000,axis_center(p)),(0,0,1)),('right',(1000,0,axis_center(p)),(0,0,1)),('top',(0,0,1000),(0,1,0)),('isometric',(300,-450,300),(0,0,1))]:
  projection(assembly,out/'drawings'/('assembly_'+view),eye,up)
 (out/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
 # Separate renderer imports only after CAD export; no GUI required.
 from render import render_all
 render_all(parts,hardware,p,out)
 from fasteners import export_axle
 export_axle(out)
 print('DONE',out)

def axis_center(p):return p['tilt_axis_z']/2
if __name__=='__main__':main()
