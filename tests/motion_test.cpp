#include "motion.h"
#include <cassert>
#include <limits>
int main(){
 AxisConfig c;assert(c.valid());assert(pulseFor(0,c)==1500);
 assert(pulseFor(-60,c)==1000);assert(pulseFor(60,c)==2000);
 assert(pulseFor(100,c)==2000);c.invert=true;assert(pulseFor(60,c)==1000);
 c.minimum=-25;c.maximum=35;c.center=1520;c.low=1100;c.high=1900;
 assert(pulseFor(-25,c)==1900);assert(pulseFor(35,c)==1100);
 c.speed=std::numeric_limits<float>::quiet_NaN();assert(!c.valid());
 c=AxisConfig{};c.low=c.center;assert(!c.valid());
 Axis a;a.target=10;a.tick(.02f);assert(std::abs(a.current-.5f)<.001);
 for(int i=0;i<100;i++){a.tick(.02f);}assert(a.current==10);
 a.target=-10;a.tick(.02f);assert(a.current==9.5f);a.stop();a.tick(.02f);assert(a.current==9.5f);
 a.target=30;a.tick(10);assert(a.current==10.75f); // cap scheduler stall delta
}
