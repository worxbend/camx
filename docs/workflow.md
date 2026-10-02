# CAMX workflow and design decisions

1. Inspect the user's references. Photos 7/8 are the primary shape specification: stationary rectangular base, ESP32 vertical beside a vertical-axis pan servo, one upright housing a horizontal-axis tilt servo, curved cradle with a camera tripod bolt, and an underside tripod socket. Photos 1–6 show the ESP-WROOM-32 DevKit and SG90-type servos. Photos 9/10 show the square Anker camera. The Insta360, OBSBOT and AVer images are styling/mechanism references, not dimension drawings.
2. Make unknown dimensions explicit in `cad/parameters.json`. Camera model, actual mass/CG, servo clone flange/horn, ESP32 board dimensions, USB-C module and capacitor remain unmeasured. Defaults are estimates. Print the fit coupon before the mechanism.
3. Support pan loads using a 6805 bearing (25 × 37 × 7 mm). The SG90 turns the stock horn, not a printed spline. A removable keeper retains the spindle below the bearing. A fixed outer retainer holds the bearing. The tilt axis lies near camera CG; the user-approved opposite 625 bearing support reduces cantilever loading. Matching 6 mm arm plates and rounded foot supports improve stiffness; this remains an unqualified prototype.
4. Keep the electronics in the stationary base: PCB edge rails, capacitor cup and tie slots, panel USB-C aperture and two flange screw holes, PSU cable entry and strain relief, underside steel 1/4-20 nut with a printed retainer cap. Camera USB remains connected to the host computer with a flexible service loop.
5. Implement PlatformIO firmware with 50 Hz PWM, nonblocking speed limiting, persistent calibration, station Wi-Fi with endless reconnect and authenticated HTTP/browser control, serial commands, latched STOP and PWM disabled on boot. Keep AI tracking on an optional host computer.
6. Generate print-oriented STL and 3MF for each part, assembly STEP/BREP/GLB/3MF, print-layout 3MF, vector SVG/DXF drawings and PNG/JPEG/WebP/SVG images. Validate CAD solids, watertight meshes and swept camera/mechanism clearance. Publish exact CAD geometry to the viewer.
7. Build a static Vite/Three.js viewer and GitHub Pages workflow. Check desktop/mobile layout and part visibility, pan, tilt, explode, wireframe, camera views, downloads and guide links. Generate a downloadable archive and record checks.
8. Physical commissioning: measure hardware, update parameters, print coupon, fit empty mechanism, center servos without horns, assemble and balance, then expand travel only after cable clearance and torque checks. Hardware validation requires the real components.

## Appearance

Matte graphite base and matching full-height side shells, restrained raised pan platform, rounded corners, thin perimeter seam, engraved CAMX wordmark and an amber cradle. The viewer uses an open dark studio canvas with mint controls. Its generated UI concept is a styling reference only: the displayed device and downloadable files are actual CAD. The revised sketch supersedes the earlier asymmetric construction: both sides have matching outer profiles, with an empty passive shell enclosing its bearing. Enclosure corners and horizontal edges are rounded.

## Sources checked

- [Tower Pro SG90](https://towerpro.com.tw/product/sg90-7/): nominal 1.8 kgf·cm stall torque at 4.8 V. This is not a continuous operating rating, and clones differ.
- [Espressif LEDC](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/ledc.html): PWM API. PlatformIO's pinned platform uses Arduino 2.0.17; source includes a version guard for the Arduino 3 API.
- [PlatformIO Espressif releases](https://github.com/platformio/platform-espressif32/releases/tag/v6.12.0): reproducible platform pin.
- [build123d exports](https://build123d.readthedocs.io/en/latest/): installed 0.13.0 signatures were inspected and exports generated locally.
- [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) and [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html): viewer controls and model loading.
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages): deployment setup.

## Control-client implementation

Three parallel workstreams implemented the SolidJS 2 client, its browser/transport tests and documentation, and the firmware calibration/heartbeat/filesystem API. Integration added a dependency-free localhost LAN bridge, validated asset staging, partition-table-derived filesystem flashing instructions, standalone client downloads and Pages deployment. The client uses SolidJS 2.0.0-rc.13 with exact runtime/compiler pins and a committed lockfile.

The browser never arms on connection or reconnect. STOP cancels queued motion, calibration requires disabled PWM, and the optional heartbeat begins off. Tokens remain in memory. Forty client tests, three bridge tests, firmware compilation and sanitizer parser tests passed locally; simulated devices do not replace physical commissioning. Visual references and actual interface previews are in `docs/design/`.

## Smooth motion update

Replaced constant-rate steps with a local fixed-two-axis Ruckig 0.15.3 S-curve planner. Velocity/acceleration are retained on retarget, both axes share finish time, and full-path position extrema gate acceptance. Safety STOP cancels instantly. The upstream MIT core and provenance are vendored for reproducible offline builds; all firmware source bundles include it. Speed calibration/NVS format and movement JSON stay compatible.

## Held remote update

The supplied phone remote references guided a matte, concave four-lobe direction pad with a circular Home key and persistent STOP. Native SVG/CSS geometry renders the control; generated concepts are visual references, not functional backgrounds. Precision controls and calibration remain separate workspaces. See `docs/design/remote-spec.md` for visual decisions.

Three coordinated workstreams extended firmware motion/lease fencing, the SolidJS transport/remote, and tests/research documentation. The protocol uses normalized velocity pairs, 100 ms refresh and a separate 500 ms nonzero-jog lease. A zero-rate release brakes smoothly; missed renewal immediately latches STOP. Epoch/sequence fencing rejects old mode packets. Pointer capture, cancellation, visibility and keyboard lifecycle are covered by regression tests. Research and tradeoffs are documented in [jog-design.md](jog-design.md). Physical validation remains required.
