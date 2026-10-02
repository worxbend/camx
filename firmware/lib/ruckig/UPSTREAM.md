# Ruckig offline core

Source: https://github.com/pantor/ruckig/tree/v0.15.3
Commit: `37b6e7a4c60f5befd2506741d5f7d0ae7eefb3db`
License: MIT, included in LICENSE.

Unmodified include/ruckig headers and the eleven local solver .cpp files listed in upstream CMakeLists.txt. Cloud client, Python bindings and third-party/network dependencies are omitted; WITH_CLOUD_CLIENT is never defined. CAMX uses two fixed degrees of freedom, with local state-to-state calculation and no intermediate waypoints. C++17 required.

CAMX integration keeps the planner and scratch trajectory in static storage and gives serial/HTTP tasks 16 KiB stacks. The classic ESP32 build fits the default application slot but uses approximately 95% of it; further major features may require revisiting the partition layout.
