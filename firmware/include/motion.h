#pragma once
#include <cmath>
#include <algorithm>
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
inline int pulseFor(float angle, const AxisConfig &c) {
  float a = bounded(angle,c.minimum,c.maximum);
  float fraction = a >= 0 ? a / c.maximum : a / -c.minimum;
  if (c.invert) fraction = -fraction;
  return int(std::lround(c.center + fraction * (fraction >= 0 ? c.high-c.center : c.center-c.low)));
}
struct Axis {
  AxisConfig config;
  float current = 0, target = 0;
  void tick(float seconds) {
    float d = target-current, step = config.speed * bounded(seconds,0,0.05f);
    current += bounded(d,-step,step);
  }
  void stop() {target=current;}
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
