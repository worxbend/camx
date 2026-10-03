#pragma once
#include "motion_planner.h"
#include "jog_lease.h"
// A transport timeout cancels motion and fences old packets, but never changes
// the explicit STOP latch or PWM enable state. Repeated loss events are idempotent.
inline void pauseConnection(MotionPlanner &planner, Axis (&axes)[2], JogLease &lease, bool &paused) {
 if(!paused)lease.invalidate();
 planner.stop(axes);paused=true;
}
