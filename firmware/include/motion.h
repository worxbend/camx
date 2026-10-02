#pragma once
#include <cmath>
#include <algorithm>
#include <cstdint>
struct AxisConfig {
  // Conservative startup envelope; measure actual travel before expanding.
  int center = 1500, low = 1400, high = 1600;
  float minimum = -60, maximum = 60, speed = 25;
  bool invert = false;
  bool valid() const {
    return low >= 700 && high <= 2300 && low < center && center < high &&
      std::isfinite(minimum) && std::isfinite(maximum) && std::isfinite(speed) &&
      minimum >= -80 && maximum <= 80 && minimum < 0 && maximum > 0 &&
      speed >= 1 && speed <= 60;
  }
};
inline float bounded(float v, float lo, float hi) {return std::max(lo, std::min(hi,v));}
inline double pulseFor(double angle, const AxisConfig &c) {
  double a = std::max(double(c.minimum),std::min(double(c.maximum),angle));
  double fraction = a >= 0 ? a / c.maximum : a / -c.minimum;
  if (c.invert) fraction = -fraction;
  return c.center + fraction * (fraction >= 0 ? c.high-c.center : c.center-c.low);
}
// Keep fractional microseconds until the final 16-bit, 50 Hz PWM conversion.
inline uint32_t servoDutyFor(double pulse) {
  if(!std::isfinite(pulse) || pulse<=0)return 0;
  return uint32_t(std::lround(std::min(pulse,20000.0)*65535.0/20000.0));
}
struct Axis {
  AxisConfig config;
  double current = 0, target = 0, velocity = 0, acceleration = 0;
  void stop() {target=current;velocity=0;acceleration=0;}
};

// Validate both axes before changing either target. Repeated offsets are idempotent.
inline bool setTargets(Axis (&axes)[2],float pan,float tilt){
  const float values[2]={pan,tilt};
  for(int i=0;i<2;i++)if(!std::isfinite(values[i]) || values[i]<axes[i].config.minimum || values[i]>axes[i].config.maximum)return false;
  for(int i=0;i<2;i++)axes[i].target=values[i];
  return true;
}

inline bool axisConfigSafe(int axis,const AxisConfig &c){
  if(axis<0||axis>1||!c.valid())return false;
  const float limit=axis==0?60.0f:25.0f;
  return c.minimum>=-limit && c.maximum<=limit;
}
