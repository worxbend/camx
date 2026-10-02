#pragma once
#include "motion.h"
#include <ruckig/ruckig.hpp>

// Degrees and seconds. At full configured speed, acceleration ramps over
// 0.4 s and the complete zero-to-top-speed transition takes 1.2 s.
// Limits scale with the existing calibration speed; no schema/NVS migration.
inline double accelerationLimit(const AxisConfig &c) {return c.speed / 0.8;}
inline double jerkLimit(const AxisConfig &c) {return accelerationLimit(c) / 0.4;}

class MotionPlanner {
  ruckig::Ruckig<2> engine{0.02};
  ruckig::InputParameter<2> input;
  ruckig::Trajectory<2> trajectory, candidate;
  double elapsed=0;
  bool active=false,jogMode=false;
  double jogRates[2]={0,0};
  void prepare(const Axis (&axes)[2]) {
    input.control_interface=ruckig::ControlInterface::Position;
    input.per_dof_control_interface.reset();input.per_dof_synchronization.reset();
    for(int i=0;i<2;i++){
      input.current_position[i]=axes[i].current;input.current_velocity[i]=axes[i].velocity;
      input.current_acceleration[i]=axes[i].acceleration;input.target_velocity[i]=0;input.target_acceleration[i]=0;
      input.max_velocity[i]=axes[i].config.speed;input.max_acceleration[i]=accelerationLimit(axes[i].config);input.max_jerk[i]=jerkLimit(axes[i].config);
    }
  }
  bool safe(const Axis (&axes)[2]) {
    const auto extrema=candidate.get_position_extrema();
    for(int i=0;i<2;i++)if(!std::isfinite(extrema[i].min)||!std::isfinite(extrema[i].max)||extrema[i].min<axes[i].config.minimum-1e-8||extrema[i].max>axes[i].config.maximum+1e-8)return false;
    return true;
  }
  void commit(Axis (&axes)[2],const std::array<double,2> &goals) {
    trajectory=candidate;elapsed=0;active=true;for(int i=0;i<2;i++)axes[i].target=goals[i];
  }
public:
  bool plan(Axis (&axes)[2], double pan, double tilt) {
    const double goals[2]={pan,tilt};
    for(int i=0;i<2;i++) {
      const auto &a=axes[i];
      if(!std::isfinite(goals[i]) || !axisConfigSafe(i,a.config) ||
         goals[i]<a.config.minimum || goals[i]>a.config.maximum)return false;
    }
    // Duplicate targets renew the control lease without restarting easing.
    if(!jogMode && pan==axes[0].target && tilt==axes[1].target)return true;
    prepare(axes);
    for(int i=0;i<2;i++) {
      const auto &a=axes[i];
      input.current_position[i]=a.current;
      input.current_velocity[i]=a.velocity;
      input.current_acceleration[i]=a.acceleration;
      input.target_position[i]=goals[i];
      input.target_velocity[i]=0;
      input.target_acceleration[i]=0;
      input.max_velocity[i]=a.config.speed;
      input.max_acceleration[i]=accelerationLimit(a.config);
      input.max_jerk[i]=jerkLimit(a.config);
    }
    input.synchronization=ruckig::Synchronization::Time;
    if(engine.calculate(input,candidate)!=ruckig::Result::Working)return false;
    // Validate the entire analytical path, including mid-move braking and
    // reversal. A valid endpoint alone cannot guarantee mechanical clearance.
    const auto extrema=candidate.get_position_extrema();
    for(int i=0;i<2;i++) {
      if(!std::isfinite(extrema[i].min) || !std::isfinite(extrema[i].max) ||
         extrema[i].min < axes[i].config.minimum-1e-8 ||
         extrema[i].max > axes[i].config.maximum+1e-8)return false;
    }
    commit(axes,{pan,tilt});jogMode=false;
    return true;
  }
  bool jog(Axis (&axes)[2],double panRate,double tiltRate) {
    const double rates[2]={panRate,tiltRate};
    for(int i=0;i<2;i++)if(!std::isfinite(rates[i])||std::abs(rates[i])>1||!axisConfigSafe(i,axes[i].config))return false;
    if(jogMode && rates[0]==jogRates[0] && rates[1]==jogRates[1])return true;
    // First compute the analytical minimum jerk-limited braking endpoint.
    prepare(axes);input.control_interface=ruckig::ControlInterface::Velocity;
    input.synchronization=ruckig::Synchronization::None;
    if(engine.calculate(input,candidate)!=ruckig::Result::Working || !safe(axes))return false;
    std::array<double,2> goals,velocity,acceleration;
    candidate.at_time(candidate.get_duration(),goals,velocity,acceleration);
    for(int i=0;i<2;i++)goals[i]=std::max(double(axes[i].config.minimum),std::min(double(axes[i].config.maximum),goals[i]));
    if(rates[0]!=0 || rates[1]!=0){
      prepare(axes);input.synchronization=ruckig::Synchronization::None;
      for(int i=0;i<2;i++){
        if(rates[i]!=0){goals[i]=rates[i]>0?axes[i].config.maximum:axes[i].config.minimum;input.max_velocity[i]=std::abs(rates[i])*axes[i].config.speed;}
        input.target_position[i]=goals[i];
      }
      if(engine.calculate(input,candidate)!=ruckig::Result::Working || !safe(axes))return false;
    }
    commit(axes,goals);jogMode=true;jogRates[0]=rates[0];jogRates[1]=rates[1];return true;
  }
  void tick(Axis (&axes)[2],double seconds) {
    if(!active || !std::isfinite(seconds) || seconds<=0)return;
    elapsed=std::min(elapsed+std::min(seconds,0.05),trajectory.get_duration());
    if(elapsed+1e-10>=trajectory.get_duration())elapsed=trajectory.get_duration();
    std::array<double,2> position,velocity,acceleration;
    trajectory.at_time(elapsed,position,velocity,acceleration);
    for(int i=0;i<2;i++) {
      axes[i].current=position[i];
      axes[i].velocity=velocity[i];
      axes[i].acceleration=acceleration[i];
    }
    if(elapsed>=trajectory.get_duration()) {
      for(auto &a:axes){a.current=a.target;a.velocity=0;a.acceleration=0;}
      active=false;
    }
  }
  // STOP is deliberately immediate, including watchdog and physical STOP.
  void stop(Axis (&axes)[2]) {active=false;jogMode=false;elapsed=0;for(auto &a:axes)a.stop();}
  bool moving() const {return active;}
  double duration() const {return trajectory.get_duration();}
};
