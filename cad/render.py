"""Deterministic headless mesh visualizations. Geometry, not AI renderings."""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from PIL import Image
COLORS={'base':'#263746','lid':'#526775','pan_arm':'#4293a1','camera_cradle':'#efb970','tilt_cover':'#3a586a','bearing_retainer':'#bbcbd6','spindle_keeper':'#bbcbd6','tripod_nut_retainer':'#bbcbd6'}

def mesh(shape):
 # STL exporter respects face orientation; use it rather than raw OCCT face triangulation.
 import tempfile,trimesh
 from build123d import export_stl
 with tempfile.NamedTemporaryFile(suffix='.stl') as f:
  export_stl(shape,f.name,tolerance=.2,angular_tolerance=.2)
  m=trimesh.load(f.name,force='mesh')
 return np.asarray(m.vertices),np.asarray(m.faces,dtype=int)

def render_scene(items,path,title,elev=22,azim=-58,formats=('png','svg','jpg','webp'),notes=None):
 fig=plt.figure(figsize=(11,10),facecolor='#f4f6f8');ax=fig.add_subplot(projection='3d');ax.set_facecolor('#f4f6f8')
 bounds=[];polygons=[];facecolors=[]
 for name,shape,offset in items:
  v,f=mesh(shape);v+=offset;bounds.append(v)
  color=COLORS.get(name,'#253849' if 'camera' in name else '#41649c' if 'servo' in name else '#9aaeb7' if 'bearing' in name else '#61a784')
  polygons.extend(v[f]);facecolors.extend([color]*len(f))
 ax.add_collection3d(Poly3DCollection(polygons,facecolors=facecolors,linewidths=0,alpha=1,zsort='average',shade=True,lightsource=matplotlib.colors.LightSource(azdeg=300,altdeg=55)))
 points=np.concatenate(bounds);lo=points.min(0);hi=points.max(0);center=(hi+lo)/2;span=max(hi-lo)*.61
 ax.set_xlim(center[0]-span,center[0]+span);ax.set_ylim(center[1]-span,center[1]+span);ax.set_zlim(max(-10,lo[2]-8),max(-10,lo[2]-8)+span*2)
 ax.set_box_aspect((1,1,1));ax.view_init(elev=elev,azim=azim);ax.set_axis_off();ax.set_proj_type('ortho')
 fig.suptitle(title,fontsize=22,fontweight='bold',color='#24394a',y=.94)
 fig.text(.08,.06,notes or 'CAMX • build123d parametric prototype • millimetres\nCheck component dimensions and load balance before printing.',fontsize=11,color='#526775')
 path=Path(path);fig.savefig(path.with_suffix('.png'),dpi=160,bbox_inches='tight',facecolor=fig.get_facecolor())
 if 'svg' in formats:fig.savefig(path.with_suffix('.svg'),bbox_inches='tight')
 if 'jpg' in formats or 'webp' in formats:
  im=Image.open(path.with_suffix('.png')).convert('RGB')
  if 'jpg' in formats:im.save(path.with_suffix('.jpg'),quality=92)
  if 'webp' in formats:im.save(path.with_suffix('.webp'),quality=92)
 plt.close(fig)

def render_all(parts,hardware,p,out):
 zero=np.zeros(3);printables=[(n,s,zero) for n,s in parts.items() if n!='fit_coupon']
 allitems=printables+[(n,s,zero) for n,s in hardware.items()]
 render_scene(allitems,out/'images/assembled','CAMX / single-arm pan & tilt')
 render_scene(allitems,out/'images/rear','CAMX / connector & servo access',elev=18,azim=115)
 render_scene(printables,out/'images/structure','CAMX / printed structure',elev=20,azim=-65)
 offsets={'tripod_nut_retainer':(0,0,0),'base':(0,0,-25),'lid':(0,0,10),'bearing_retainer':(0,0,22),'spindle_keeper':(0,0,25),'pan_arm':(0,0,45),'camera_cradle':(-32,0,62),'tilt_cover':(45,0,45)}
 exploded=[(n,s,np.array(offsets.get(n,(0,0,0)))) for n,s in parts.items() if n!='fit_coupon']
 render_scene(exploded,out/'images/exploded','CAMX / assembly order',notes='Base → lid + bearing → horn + spindle → curved cradle → servo cover\nExploded offsets are for visualization only.')
 for n,s in parts.items():render_scene([(n,s,zero)],out/'images'/n,n.replace('_',' ').title(),formats=('png','svg'))
 # Embedded previews; local HTML works without a server or external libraries.
 html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CAMX design gallery</title><style>body{font:17px system-ui;margin:40px;background:#f4f6f8;color:#24394a}main{max-width:1200px;margin:auto}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}img{width:100%}article{background:white;border-radius:16px;overflow:hidden;padding:12px}a{color:#24798b}</style><main><h1>CAMX · your sketch, in 3D</h1><p>Single upright arm, curved camera cradle, SG90 pan in the base, ESP32 beside it. USB-C flange and capacitor are inside the stationary enclosure.</p><p>Provisional component dimensions. Reference assembly includes hardware envelopes; print the individual parts or print_layout.3mf.</p><section>'''
 for n in ['assembled','rear','structure','exploded']:
  html+=f'<article><h2>{n.title()}</h2><a href="images/{n}.png"><img alt="{n} CAD visualization" src="images/{n}.png"></a></article>'
 html+='</section><h2>Printable parts</h2><section>'
 for n in parts:
  html+=f'<article><h3>{n.replace("_"," ").title()}</h3><img alt="{n}" src="images/{n}.png"><a href="parts/{n}.stl">STL</a> · <a href="parts/{n}.3mf">3MF</a> · <a href="parts/{n}.step">STEP</a> · <a href="drawings/{n}.svg">Vector drawing</a></article>'
 html+='</section><p><a href="assembly/camx.glb">3D GLB</a> · <a href="assembly/camx.step">Full STEP assembly</a> · <a href="assembly/print_layout.3mf">Print layout</a> · <a href="manifest.json">Dimensions and validation</a></p></main></html>'
 (out/'index.html').write_text(html,encoding='utf-8')
