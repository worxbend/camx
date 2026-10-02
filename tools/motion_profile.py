"""Plot sampled output from the actual C++ motion planner (not an illustration)."""
from pathlib import Path
import csv,sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[1]
rows=list(csv.DictReader(Path(sys.argv[1]).open()))
values={key:[float(row[key]) for row in rows] for key in rows[0]}
plt.rcParams.update({'font.family':'DejaVu Sans','figure.facecolor':'#0b1017',
 'axes.facecolor':'#121c27','text.color':'#edf4f8','axes.labelcolor':'#aabdd0',
 'xtick.color':'#aabdd0','ytick.color':'#aabdd0','axes.edgecolor':'#283747'})
fig,axes=plt.subplots(3,1,figsize=(10,8),sharex=True,layout='constrained')
for ax,fields,label in zip(axes,[('pan','tilt'),('pan_velocity','tilt_velocity'),('pan_acceleration','tilt_acceleration')],['Position (degrees)','Velocity (degrees/s)','Acceleration (degrees/s²)']):
 for field,color in zip(fields,['#a6e8cf','#e4b36a']):
  ax.plot(values['time'],values[field],color=color,lw=2.2,label='Pan' if field.startswith('pan') else 'Tilt')
 ax.set_ylabel(label);ax.grid(color='#283747',alpha=.65);ax.spines[['top','right']].set_visible(False)
axes[0].legend(facecolor='#121c27',edgecolor='#283747',labelcolor='#edf4f8')
axes[-1].set_xlabel('Time (seconds)')
fig.suptitle('CAMX • smooth 30° pan + 15° tilt\nActual synchronized S-curve planner output',fontsize=17)
output=ROOT/'exports/images';output.mkdir(exist_ok=True)
for ext in ['png','svg']:fig.savefig(output/('motion-profile.'+ext),dpi=160)
print('Generated motion-profile.png and motion-profile.svg from C++ planner samples')
