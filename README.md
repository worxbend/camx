<div align="center">

# 📷 CAMX

### Your webcam just unlocked movement. ✨

**ESP32 brains. Two tiny servos. One printable pan & tilt rig.**

[![Build & release](https://github.com/worxbend/camx/actions/workflows/release.yml/badge.svg)](https://github.com/worxbend/camx/actions/workflows/release.yml)
[![3D studio](https://img.shields.io/badge/3D_studio-live-a6e8cf?style=flat-square&labelColor=0b1017)](https://worxbend.github.io/camx/)
[![PlatformIO](https://img.shields.io/badge/firmware-PlatformIO-ff7f50?style=flat-square&labelColor=0b1017)](firmware/platformio.ini)
[![build123d](https://img.shields.io/badge/CAD-build123d-d5aa67?style=flat-square&labelColor=0b1017)](cad/model.py)
[![Prototype](https://img.shields.io/badge/status-measure_then_print-9cb4d8?style=flat-square&labelColor=0b1017)](docs/assembly.md)

[**🌀 Open the 3D studio**](https://worxbend.github.io/camx/) · [**📦 Get the downloads**](https://github.com/worxbend/camx/releases/latest) · [**🛠️ Build guide**](docs/assembly.md)

![CAMX — actual CAD geometry rendered in the 3D studio](exports/images/assembled.png)

</div>

---

## ✨ The vision

Take an Anker PowerConf webcam. Give it a smooth pan axis, a balanced tilt cradle, and a rounded enclosure that actually looks like a device you'd keep on your desk.

CAMX follows the owner's hand-drawn concept: **a curved camera cradle and an ESP32 beside the pan servo in the base**, rebuilt to match your revised sketch with **matching rounded arm housings, mirrored pivot caps, a circular pan platform and a U-shaped support**. The passive housing has the same outer shape as the servo side, with bearing hardware inside. The camera bolts on through its existing **1/4″-20 tripod thread**. The USB-C panel board and **1000 µF capacitor** get dedicated space inside.

> 🧪 **Prototype, with receipts.** The firmware compiles and **583 CAD/mesh/clearance checks pass**. Hardware dimensions are still provisional; physical fit and load testing are the next step. Print the fit coupon first.

## 🌀 Spin it before you print it

[**Launch the live viewer →**](https://worxbend.github.io/camx/)

Drag to orbit. Scroll to zoom. Preview **±60° pan** and **±25° tilt**, pull the assembly apart with the explode slider, toggle hardware or wireframe, and hide individual parts. It works on desktop and phone.

![Symmetrical U-yoke — actual CAD front view](exports/images/front.png)

The viewer loads the **actual CAD GLB**. The webcam, PCB, servos and capacitor are simplified hardware envelopes. This site previews the design; it does not send commands to your motors.

## 📦 Pick your download

| You want… | Grab this |
| --- | --- |
| The whole project, source included | [`camx-project.zip`](https://github.com/worxbend/camx/releases/latest/download/camx-project.zip) |
| Straight to the slicer | [`camx-print-parts.zip`](https://github.com/worxbend/camx/releases/latest/download/camx-print-parts.zip) |
| ESP32 source + compiled binaries | [`camx-firmware.zip`](https://github.com/worxbend/camx/releases/latest/download/camx-firmware.zip) |
| A website you can host yourself | [`camx-viewer.zip`](https://github.com/worxbend/camx/releases/latest/download/camx-viewer.zip) |
| File integrity checks | [`checksums.sha256`](https://github.com/worxbend/camx/releases/latest/download/checksums.sha256) |

Tagged releases publish these files automatically. Between releases, download the **camx-release-files** artifact from a successful [Build & release run](https://github.com/worxbend/camx/actions/workflows/release.yml). Artifacts are retained for 30 days; releases are the durable download location. The committed [full project bundle](exports/camx-files.zip) is also available.

**Formats on deck:** STL · 3MF · STEP · BREP · OBJ · PLY · OFF · GLB · glTF · SVG · DXF · PNG · JPEG · WebP · TIFF.

## 🧩 What's inside

| Part of the project | What it does |
| --- | --- |
| [🎛️ Firmware](firmware/) | 50 Hz servo PWM, speed limiting, Wi-Fi controls, serial commands, saved calibration and latched STOP |
| [📐 Parametric CAD](cad/) | Thirteen printable parts, stock servo horn interfaces, adjustable component dimensions |
| [🌀 3D studio](viewer/) | Orbit, pan/tilt previews, explode, wireframe, part visibility and downloads |
| [🛠️ Assembly guide](docs/assembly.md) | Wiring, fasteners, print orientation, balance and first startup |
| [✅ Validation](exports/validation.json) | CAD solids, watertight STL/3MF meshes and sampled clearance checks |
| [🚀 GitHub Actions](.github/workflows/) | Firmware/CAD rebuilds, viewer tests, release downloads and Pages deployment |

### 🖨️ Thirteen printed pieces. Zero printed spline teeth.

`drive_arm` · `base` · `lid` · `pan_arm` · `camera_cradle` · `tilt_cover` · `bearing_retainer` · `spindle_keeper` · `tripod_nut_retainer` · `idler_cover` · `fit_coupon` · `idler_arm` · `idler_bearing_retainer`

Use your servos' original horns and center screws. A **6805 bearing (25 × 37 × 7 mm)** supports the pan platform. Steel hardware provides the camera screw and captive tripod nut.

## 🔌 The hardware lineup

- 📷 Anker PowerConf webcam — confirm the exact model, dimensions, mass and thread depth.
- 🎛️ ESP32-WROOM-32 DevKit — the photographed board has a USB-C programming port.
- ⚙️ **2 × positional SG90-type micro servos** — continuous-rotation models won't follow angles.
- 🔋 Regulated **5 V / 3 A PSU** and **1000 µF electrolytic**, rated at least 10 V.
- 🔗 Your panel USB-C module — verify its pinout, CC resistors and current rating.
- 🛞 One 6805 pan bearing and one 625 tilt bearing, fasteners, zip ties and a 1/4″-20 camera screw/nut.

**GPIO18 → pan · GPIO19 → tilt · GPIO33 → optional STOP button.** Common ground for everything. Camera USB stays connected directly to the PC. Servo power comes from the PSU, not the ESP32's 3V3 rail.

[**Read the wiring and source-isolation notes before powering up →**](docs/assembly.md#wiring)

## ⚡ First boot

1. Measure your components and update [`cad/parameters.json`](cad/parameters.json).
2. Print the **fit coupon**, then dry-fit the empty mechanism.
3. Flash the ESP32 with the servos disconnected. Follow the guide when using USB and external power.
4. Join **CAMX-PanTilt** and open **http://192.168.4.1**. Default password: `camx-setup-2026` — change it in [`settings.h`](firmware/include/settings.h).
5. Center the servos with their horns removed, assemble, balance the camera, and expand travel carefully.

**PWM starts disabled.** STOP holds the current commanded position; DISARM releases torque. Support the camera before disabling PWM. Servo angles are commanded estimates, not encoder measurements. Automatic face tracking would require a separate host application; it is not included in this firmware.

## 🧑‍💻 Build it yourself

```sh
# Python 3.12+ and a C++ compiler
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Firmware + CAD + print validation
.venv/bin/pio run -d firmware
.venv/bin/python cad/model.py
.venv/bin/python tests/validate_cad.py
g++ -std=c++17 -Ifirmware/include tests/motion_test.cpp -o /tmp/camx-motion-test
/tmp/camx-motion-test

# Diagrams + download bundle
.venv/bin/python tools/diagrams.py
.venv/bin/python tools/package.py

# Browser studio — Node 22.12+ or a supported newer version
cd viewer
npm ci
npm run build
npm run dev
```

The CAD source uses millimetres. STL/3MF files are oriented for printing and sit at Z=0. STEP/BREP preserve assembly coordinates. GLB/glTF use metres with Y up. Vector projections are visualization references; the [dimension sheet](exports/drawings/dimensions.svg) lists defaults to verify.

For browser QA and polished stills, install Chromium with `npx playwright install chromium`, serve the built viewer, then run `node scripts/qa.mjs` and `node scripts/render-cad.mjs` from `viewer/`. Set `CAMX_QA_URL` to your preview URL. Run `.venv/bin/python tools/image_formats.py` from the root to encode captured previews. Matplotlib is the default headless preview fallback.

## 🚀 Ship it with Actions

**Every push / PR:** build the ESP32 firmware → test motion logic → regenerate CAD → check geometry → test the browser → upload downloadable artifacts.

**Every `v*` tag:** run the same checks, then create a GitHub Release with all four ZIPs and SHA-256 checksums.

```sh
git tag v0.3.0
git push origin v0.3.0
```

**GitHub Pages:** the separate [Pages workflow](.github/workflows/pages.yml) builds and publishes the live studio on main/master pushes. Configure **Settings → Pages → Source → GitHub Actions**. All site assets ship locally; repository subpaths such as `/camx/` work without changing the Vite base.

<details>
<summary><strong>🧪 What was checked — and what still needs real hardware</strong></summary>

- Firmware compilation and pure C++ motion tests.
- Thirteen valid CAD solids; watertight, oriented STL/3MF exports with matching bounds.
- Sampled pan/tilt clearance; the exact count is recorded in the validation report.
- Browser loading, pivots, explosion, visibility, wireframe, view presets, reset, downloads and guide navigation.
- Desktop **1536 × 1024** and mobile **390 × 844**, including a `/camx/` deployment path.
- Archive integrity and generated-file checksums.

Still to verify: your component measurements, printer tolerances, actual servo travel, cable slack, load balance, heat, jitter and durability. The opposite 625 bearing reduces cantilever loading. Matching 6 mm side plates, rounded foot joints and a wider base support the symmetrical assembly. The SG90 still carries part of the load; physical durability remains unverified. See the [structural review](docs/structural-review.md). Published SG90 stall torque is not a continuous load rating.

[Workflow decisions](docs/workflow.md) · [Visual concept and review](docs/design/fidelity-review.md) · [Browser QA](docs/design/viewer-qa.json)

</details>

---

<div align="center">

**Sketch → CAD → print → move.** 🖤

Built with **build123d · PlatformIO · Three.js** by **worxbend**.

</div>
