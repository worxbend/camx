#pragma once
#include <cstdint>
#include <cmath>
struct JogLease {
  static constexpr uint32_t timeoutMs=500;
  uint32_t epoch=1,sequence=0,last=0;double pan=0,tilt=0;bool active=false;
  // Boot identity is randomized by setup after enabling the Wi-Fi radio.
  void seed(uint32_t value){epoch=value?value:1;sequence=0;last=0;pan=tilt=0;active=false;}
  void invalidate(){if(++epoch==0)epoch=1;sequence=0;pan=tilt=0;active=false;}
  bool accepts(double p,double t,uint32_t e,uint32_t seq,bool armed,bool stopped,bool physicalStop)const{
    return armed&&!stopped&&!physicalStop&&e==epoch&&seq>sequence&&std::isfinite(p)&&std::isfinite(t)&&std::abs(p)<=1&&std::abs(t)<=1;
  }
  void accept(double p,double t,uint32_t seq,uint32_t now){pan=p;tilt=t;sequence=seq;last=now;active=p!=0||t!=0;}
  bool expired(uint32_t now)const{return active&&uint32_t(now-last)>=timeoutMs;}
};
