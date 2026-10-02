#include "motion_planner.h"
#include "jog_lease.h"
#include <fstream>
#include <iostream>
#include <random>
#include <cassert>
#include <limits>
int main(int argc,char **argv){
 AxisConfig c;assert(c.valid());assert(pulseFor(0,c)==1500);
 assert(pulseFor(-60,c)==1400);assert(pulseFor(60,c)==1600);
 c.low=1000;c.high=2000;assert(pulseFor(-60,c)==1000);assert(pulseFor(60,c)==2000);
 assert(pulseFor(100,c)==2000);c.invert=true;assert(pulseFor(60,c)==1000);
 c.invert=false;assert(std::abs(pulseFor(.036,c)-1500.3)<1e-8);
 assert(servoDutyFor(1500)==4915 && servoDutyFor(1500.3)==4916);
 assert(servoDutyFor(0)==0 && servoDutyFor(NAN)==0);
 c.invert=true;
 c.minimum=-25;c.maximum=35;c.center=1520;c.low=1100;c.high=1900;
 assert(pulseFor(-25,c)==1900);assert(pulseFor(35,c)==1100);
 c.speed=std::numeric_limits<float>::quiet_NaN();assert(!c.valid());
 c=AxisConfig{};c.low=c.center;assert(!c.valid());
 AxisConfig limits;assert(axisConfigSafe(0,limits));assert(!axisConfigSafe(1,limits));
 limits.minimum=-25;limits.maximum=25;assert(axisConfigSafe(1,limits));
 limits.maximum=26;assert(!axisConfigSafe(1,limits));assert(!axisConfigSafe(2,limits));
 // Rest-to-rest 30 degree move: synchronized, velocity/acceleration/jerk bounded.
 Axis axes[2];axes[1].config.minimum=-25;axes[1].config.maximum=25;axes[1].config.speed=15;
 MotionPlanner planner;assert(planner.plan(axes,30,15));
 const double duration=planner.duration();assert(std::abs(duration-2.4)<1e-7);
 std::ofstream csv;if(argc>1){csv.open(argv[1]);csv<<"time,pan,tilt,pan_velocity,tilt_velocity,pan_acceleration,tilt_acceleration\n";}
 double clock=0,peak=0;
 auto sample=[&](double dt){
   const double oldPosition[2]={axes[0].current,axes[1].current};
   const double oldVelocity[2]={axes[0].velocity,axes[1].velocity};
   const double oldAcceleration[2]={axes[0].acceleration,axes[1].acceleration};
   planner.tick(axes,dt);
   const double step=std::min(dt,.05);
   for(int i=0;i<2;i++) {
     const auto &a=axes[i];assert(a.current>=a.config.minimum-1e-7 && a.current<=a.config.maximum+1e-7);
     assert(std::abs(a.velocity)<=a.config.speed+1e-7);
     assert(std::abs(a.acceleration)<=accelerationLimit(a.config)+1e-7);
     assert(std::abs(a.current-oldPosition[i])<=a.config.speed*step+1e-7);
     assert(std::abs(a.velocity-oldVelocity[i])<=accelerationLimit(a.config)*step+1e-7);
     assert(std::abs(a.acceleration-oldAcceleration[i])<=jerkLimit(a.config)*step+1e-7);
   }
   clock+=step;
   if(csv)csv<<clock<<','<<axes[0].current<<','<<axes[1].current<<','<<axes[0].velocity<<','<<axes[1].velocity<<','<<axes[0].acceleration<<','<<axes[1].acceleration<<'\n';
 };
 if(csv)csv<<"0,0,0,0,0,0,0\n";
 sample(.02);assert(axes[0].current<.001 && axes[0].velocity<.02);
 for(int i=1;i<120;i++) {sample(.02);peak=std::max(peak,axes[0].velocity);if(i<119)assert(planner.moving());}
 assert(!planner.moving());assert(axes[0].current==30 && axes[1].current==15);
 assert(axes[0].velocity==0 && axes[1].velocity==0 && axes[0].acceleration==0);
 assert(peak>24.9);if(csv)csv.close();
 // Retarget/reverse from nonzero velocity and acceleration without a state jump.
 assert(planner.plan(axes,-30,-15));for(int i=0;i<30;i++)sample(.02);
 const double position=axes[0].current,velocity=axes[0].velocity,acceleration=axes[0].acceleration;
 assert(velocity<0);assert(planner.plan(axes,40,20));
 assert(axes[0].current==position && axes[0].velocity==velocity && axes[0].acceleration==acceleration);
 for(int i=0;planner.moving() && i<1000;i++)sample(.02);
 assert(!planner.moving() && axes[0].current==40 && axes[1].current==20);
 // Duplicate commands do not restart motion or reset velocity/acceleration.
 assert(planner.plan(axes,0,0));sample(.02);
 const double v=axes[0].velocity,a=axes[0].acceleration;
 assert(planner.plan(axes,0,0));assert(axes[0].velocity==v && axes[0].acceleration==a);sample(.02);
 assert(std::abs(axes[0].velocity)>std::abs(v));
 assert(!planner.plan(axes,61,0));assert(axes[0].target==0 && axes[1].target==0);
 assert(!planner.plan(axes,0,26));assert(!planner.plan(axes,NAN,0));
 // A safety stop holds now and discards every pending trajectory.
 planner.stop(axes);const double held=axes[0].current;
 assert(axes[0].target==held && axes[0].velocity==0 && axes[0].acceleration==0 && !planner.moving());
 sample(.02);assert(axes[0].current==held);
 assert(planner.plan(axes,30,15));sample(10); // cap a scheduler stall to 50 ms
 const double afterStall=axes[0].current;planner.tick(axes,NAN);planner.tick(axes,-1);assert(axes[0].current==afterStall);
 // Refuse a path whose braking excursion would exceed calibration bounds.
 planner.stop(axes);axes[0].current=60;axes[0].velocity=25;
 const double oldTarget=axes[0].target;assert(!planner.plan(axes,0,0));assert(axes[0].target==oldTarget);
 axes[0].current=0;planner.stop(axes);
 // Hold/release preserves p/v/a and brakes with bounded jerk to rest.
 axes[0].current=axes[1].current=0;planner.stop(axes);
 assert(planner.jog(axes,1,.5));
 for(int i=0;i<100;i++){if(i%5==0)assert(planner.jog(axes,1,.5));sample(.02);}
 const double releasePosition=axes[0].current,releaseVelocity=axes[0].velocity,releaseAcceleration=axes[0].acceleration;
 assert(releaseVelocity>20);assert(planner.jog(axes,0,0));
 assert(axes[0].current==releasePosition && axes[0].velocity==releaseVelocity && axes[0].acceleration==releaseAcceleration);
 sample(.02);assert(axes[0].velocity>0); // normal release is not immediate STOP
 for(int i=0;planner.moving()&&i<1000;i++)sample(.02);
 assert(!planner.moving() && axes[0].velocity==0 && axes[1].velocity==0);
 assert(axes[0].current>releasePosition && axes[0].current<60);
 // Reverse and diagonal rate changes, including one stationary axis.
 assert(planner.jog(axes,-.75,-1));for(int i=0;i<60;i++)sample(.02);
 assert(planner.jog(axes,.2,0));for(int i=0;i<60;i++)sample(.02);
 assert(planner.jog(axes,0,0));for(int i=0;planner.moving()&&i<1000;i++)sample(.02);
 assert(axes[0].velocity==0 && axes[1].velocity==0);
 // Long holds automatically decelerate at both calibrated limits.
 assert(planner.jog(axes,1,1));for(int i=0;planner.moving()&&i<1000;i++)sample(.02);
 assert(!planner.moving() && axes[0].current==60 && axes[1].current==25);
 assert(planner.jog(axes,1,1));sample(.02);assert(axes[0].current==60);
 assert(planner.jog(axes,0,0));sample(.02);
 assert(planner.jog(axes,-1,-1));for(int i=0;planner.moving()&&i<1000;i++)sample(.02);
 assert(axes[0].current==-60 && axes[1].current==-25);
 // Unsafe rates and impossible braking paths reject without changing state.
 const double targetBefore=axes[0].target;
 assert(!planner.jog(axes,1.1,0));assert(!planner.jog(axes,NAN,0));assert(axes[0].target==targetBefore);
 axes[0].current=60;axes[0].velocity=25;assert(!planner.jog(axes,0,0));
 planner.stop(axes);assert(!planner.moving() && axes[0].velocity==0);
 // Lease fencing: only newer sequence within current epoch; 500 ms timeout,
 // timestamp rollover, zero release disables short lease, STOP invalidates.
 JogLease lease;lease.seed(123456);assert(lease.epoch==123456 && !lease.active && lease.sequence==0);
 const auto epoch=lease.epoch;
 assert(lease.accepts(1,0,epoch,1,true,false,false));lease.accept(1,0,1,100);
 assert(!lease.accepts(1,0,epoch,1,true,false,false));assert(!lease.accepts(1,0,epoch,0,true,false,false));
 assert(!lease.accepts(1,0,epoch,2,false,false,false));assert(!lease.accepts(1,0,epoch,2,true,true,false));assert(!lease.accepts(1,0,epoch,2,true,false,true));
 assert(!lease.expired(599));assert(lease.expired(600));
 lease.accept(1,0,2,500);assert(!lease.expired(999));assert(lease.expired(1000));
 lease.accept(0,0,3,1000);assert(!lease.expired(100000));lease.invalidate();assert(lease.epoch!=epoch && lease.sequence==0);
 assert(!lease.accepts(1,0,epoch,4,true,false,false));
 lease.seed(654321);assert(!lease.accepts(1,0,epoch,1,true,false,false));
 lease.seed(0);assert(lease.epoch==1 && !lease.active && lease.sequence==0);
 lease.accept(1,0,1,UINT32_MAX-200);assert(!lease.expired(100));assert(lease.expired(299));
 // Repeated mid-move commands near boundaries, random time steps and speed settings.
 std::mt19937 rng(42);
 for(float speed:{1.f,5.f,25.f,60.f}) {
   planner.stop(axes);axes[0].current=axes[1].current=0;planner.stop(axes);
   axes[0].config.speed=speed;axes[1].config.speed=std::min(speed,15.f);
   for(int trial=0;trial<1000;trial++) {
     const double pan=double(int(rng()%12001)-6000)/100,tilt=double(int(rng()%5001)-2500)/100;
     const double before[6]={axes[0].current,axes[1].current,axes[0].velocity,axes[1].velocity,axes[0].acceleration,axes[1].acceleration};
     const double oldGoals[2]={axes[0].target,axes[1].target};
     if(!planner.plan(axes,pan,tilt))assert(axes[0].target==oldGoals[0] && axes[1].target==oldGoals[1]);
     assert(axes[0].current==before[0] && axes[1].current==before[1] && axes[0].velocity==before[2] && axes[1].velocity==before[3] && axes[0].acceleration==before[4] && axes[1].acceleration==before[5]);
     for(int t=0;t<10;t++)sample(double(1+rng()%50)/1000);
   }
 }
 // 4000 independent jog rate changes (including release and reversal) across
 // speed settings. Reduced requested rates may exceed new rate while braking,
 // but every sample remains within the calibrated global derivative limits.
 for(float speed:{1.f,5.f,25.f,60.f}){
   axes[0].current=axes[1].current=0;planner.stop(axes);
   axes[0].config.speed=speed;axes[1].config.speed=std::min(speed,15.f);
   for(int trial=0;trial<1000;trial++){
     const double rates[2]={double(int(rng()%9)-4)/4,double(int(rng()%9)-4)/4};
     const double before[6]={axes[0].current,axes[1].current,axes[0].velocity,axes[1].velocity,axes[0].acceleration,axes[1].acceleration};
     const double oldGoals[2]={axes[0].target,axes[1].target};
     if(!planner.jog(axes,rates[0],rates[1]))assert(axes[0].target==oldGoals[0]&&axes[1].target==oldGoals[1]);
     assert(axes[0].current==before[0]&&axes[1].current==before[1]&&axes[0].velocity==before[2]&&axes[1].velocity==before[3]&&axes[0].acceleration==before[4]&&axes[1].acceleration==before[5]);
     for(int t=0;t<10;t++)sample(.02);
   }
   assert(planner.jog(axes,0,0));for(int i=0;planner.moving()&&i<1000;i++)sample(.02);
   assert(!planner.moving()&&axes[0].velocity==0&&axes[1].velocity==0);
 }
 std::cout<<"S-curve: 30 degree pan + 15 degree tilt in "<<duration<<" s; synchronized, bounded derivatives, retargeting, STOP and 4000 absolute and 4000 jog commands, bounded release, limits and lease fencing passed\n";
}
