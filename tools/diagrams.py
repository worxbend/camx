"""Source-backed dimension summary and circuit topology as SVG/PNG."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
ROOT=Path(__file__).resolve().parents[1];p=json.loads((ROOT/'cad/parameters.json').read_text());out=ROOT/'exports/drawings'
fig,ax=plt.subplots(figsize=(12,8));fig.patch.set_facecolor('#f4f6f8');ax.set_facecolor('#f4f6f8');ax.set_xlim(0,12);ax.set_ylim(0,8);ax.axis('off')
ax.text(.4,7.5,'CAMX / power & signal wiring',fontsize=23,weight='bold',color='#24394a')
ax.text(.4,7.05,'Regulated 5 V • common ground • 1000 µF capacitor • positional servos',fontsize=12,color='#526775')
labels=[('ESP32 DevKit',5.6,'VIN / 5V','GND'),('Pan SG90',4.2,'RED','BROWN'),('Tilt SG90',2.8,'RED','BROWN'),('1000 µF / ≥10 V',1.4,'+','−')]
ax.add_patch(FancyBboxPatch((.5,4.8),2.2,1.3,boxstyle='round,pad=.12',fc='#e3edf1',ec='#526775'))
ax.text(1.6,5.45,'5 V / 3 A\nregulated PSU',ha='center',va='center',fontsize=13)
ax.plot([2.7,3.4],[5.8,5.8],color='#d35848',lw=3);ax.plot([3.4,3.4],[6.1,1.4],color='#d35848',lw=3)
ax.plot([2.7,4.2],[5,5],color='#24394a',lw=3);ax.plot([4.2,4.2],[5.4,1.1],color='#24394a',lw=3)
for label,y,pos,neg in labels:
 ax.add_patch(FancyBboxPatch((6.2,y-.55),3.1,1.1,boxstyle='round,pad=.08',fc='#fff',ec='#a9bcc6'))
 ax.text(7.75,y+.08,label,ha='center',fontsize=14,weight='bold',color='#24394a')
 ax.text(6.5,y-.3,pos,color='#d35848',fontsize=11);ax.text(8.1,y-.3,neg,color='#24394a',fontsize=11)
 ax.plot([3.4,5.9,5.9,6.5],[y+.35,y+.35,y-.3,y-.3],color='#d35848',lw=2)
 ax.plot([4.2,5.5,5.5,8.1],[y-.35,y-.35,y-.46,y-.46],color='#24394a',lw=2)
 ax.plot(3.4,y+.35,'o',color='#d35848');ax.plot(4.2,y-.35,'o',color='#24394a')
ax.text(9.65,5.7,'GPIO18 → pan signal\nGPIO19 → tilt signal\nGPIO33 → STOP → GND',fontsize=11,color='#24798b',va='top')
ax.text(.5,.45,'USB-C panel: power input only if rated/CC-equipped; otherwise use direct PSU cable.\nCamera USB goes directly to PC. Avoid two unisolated 5 V sources on the ESP32.',fontsize=11,color='#526775')
fig.savefig(out/'wiring.svg',bbox_inches='tight');fig.savefig(out/'wiring.png',dpi=180,bbox_inches='tight');plt.close(fig)
fig,ax=plt.subplots(figsize=(10,7));ax.axis('off');fig.patch.set_facecolor('#f4f6f8')
ax.text(0,1,'CAMX / dimensions to verify',fontsize=24,weight='bold',color='#24394a',transform=ax.transAxes)
rows=[('Stationary base',f"{p['base_width']:g} × {p['base_depth']:g} × {p['base_height']:g} mm"),('Lid thickness',f"{p['lid_thickness']:g} mm"),('Camera envelope (assumed)',f"{p['camera_width']:g} × {p['camera_depth']:g} × {p['camera_height']:g} mm"),('Tilt axis above base underside',f"{p['tilt_axis_z']:g} mm"),('Camera bottom above base underside',f"{p['camera_bottom_z']:g} mm"),('Bearing',f"{p['bearing_id']:g} ID × {p['bearing_od']:g} OD × {p['bearing_height']:g} mm"),('SG90 body (assumed)',f"{p['servo_length']:g} × {p['servo_width']:g} × {p['servo_height']:g} mm"),('SG90 ear screw pitch (assumed)',f"{p['servo_mount_pitch']:g} mm"),('Stock horn pocket (assumed)',f"{p['horn_length']:g} × {p['horn_width']:g} × {p['horn_thickness']:g} mm"),('USB flange (assumed)',f"{p['usb_flange_width']:g} × {p['usb_flange_height']:g} mm; holes {p['usb_flange_hole_pitch']:g} mm"),('Capacitor envelope (assumed)',f"Ø{p['capacitor_diameter']:g} × {p['capacitor_height']:g} mm"),('Camera screw / base tripod socket','1/4-20 UNC; steel hardware'),('Travel used in clearance checks',f"Pan ±{p['pan_limit_deg']:g}°; tilt ±{p['tilt_limit_deg']:g}°")]
t=ax.table(cellText=rows,colLabels=['Feature','Default'],loc='center',cellLoc='left',colLoc='left',colWidths=[.53,.47]);t.auto_set_font_size(False);t.set_fontsize(11);t.scale(1,2)
for (r,c),cell in t.get_celld().items():cell.set_edgecolor('#d0dce3');cell.set_facecolor('#e3edf1' if r==0 else 'white');cell.get_text().set_color('#24394a')
ax.text(0,-.02,'Actual CAD projections are in assembly_front/right/top/isometric.svg. Defaults are not photo measurements.',fontsize=10,color='#526775',transform=ax.transAxes)
fig.savefig(out/'dimensions.svg',bbox_inches='tight');fig.savefig(out/'dimensions.png',dpi=180,bbox_inches='tight');plt.close(fig)
