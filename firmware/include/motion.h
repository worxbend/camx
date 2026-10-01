#pragma once
#include <cmath>
#include <algorithm>
struct AxisConfig {
  int center = 1500, low = 1000, high = 2000;
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
