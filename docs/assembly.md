# CAMX assembly and commissioning

This is a buildable, dimension-adjustable prototype based on your sketches. It is not physically fit-tested. Use two **positional** SG90 servos; continuous-rotation versions cannot follow angles. The photos appear consistent with a square Anker camera, but do not establish its model or dimensions.

## Measurements before printing

Record webcam width/depth/height including the folded original mounting clip; its mass; tripod thread position and usable insertion depth; CG relative to the screw; cable bend radius. Default camera envelope is **55 × 55 × 50 mm**, **150 g**. The thread slot allows approximately ±8 mm fore/aft adjustment. Measure your particular SG90 body, ears, screw pitch, shaft height and stock horn. The pictured ESP32 has a USB-C port; verify its approximately 58 × 29 mm board fits the rails and left-front access opening. Measure USB flange, hole pitch, PCB overhang, capacitor diameter and height. Defaults are not measurements from photographs.

Edit `cad/parameters.json`, regenerate, and rerun checks. Fit clearance is per radial/side convention indicated in the source; some structural and fastener dimensions are fixed constants and require editing `cad/model.py` for substantially different hardware. The parts are not a universal automatic fit system.

## Bill of materials

| Item | Quantity | Notes |
| --- | ---: | --- |
| ESP32-WROOM-32 DevKit | 1 | Pictured USB-C version; 5 V input verified on actual board |
| Positional SG90-type servo | 2 | Stock spline-matching horns and center screws |
| 6805 bearing | 1 | 25 mm ID × 37 mm OD × 7 mm height |
| 625 bearing | 1 | 5 mm ID × 16 mm OD × 5 mm width, opposite tilt support |
| M5 × 16 axle screw + M5 nut | 1 set | Low head preferred; measure actual stack and camera clearance |
| M5 washers + spacer | 2 × 1 mm washers, 1 × 1.4 mm spacer | OD ≤7.5 mm, spacer ID ≥5.2 mm; contact bearing inner race only |
| M3 × 12 screws | 4 | Both arm feet into platform pilot holes |
| M2 × 8 screws | 2 | Opposite bearing retainer into arm pilot holes |
| M2 nuts | 6 total | Two tilt ear nuts plus four horn attachment nuts; match actual screw lengths |
| Regulated 5 V / 3 A PSU | 1 | Servo power independent of USB programming power |
| 1000 µF electrolytic | 1 | 10 V or higher rating; default 13 mm diameter × 25 mm height |
| Panel USB-C board/module | 1 | User-supplied module; see wiring constraints |
| M3 × 10 screws | 4 | Lid into base pilot holes; do not overtighten |
| M2 × 8 screws | 3 | Bearing outer retainer into lid pilot holes |
| M2 × 6 screws | 4 | Spindle keeper and tripod nut cap into printed spindle pilot holes |
| M2 × 16 screws + nuts | 2 sets | Pan horn-to-platform; verify head recess and approximately 13 mm stack |
| M2 × 8 screws + nuts | 2 sets | Tilt horn-to-cradle; verify stock horn and final stack |
| SG90 ear screws | 4 | Pan stock screws; tilt M2 × 10–12 through-bolts with nuts, verify actual stack |
| M2 × 8 screws | 8 | Matching arm covers into integral standoffs; verify head height |
| M3 screws, nuts and washers | 2 sets | USB flange; length depends on actual flange thickness |
| Steel 1/4-20 UNC hex nut | 1 | ~11.1 mm across flats, ~5.5 mm thick; fits captive base socket |
| 1/4-20 camera screw + washer | 1 | Choose length for approximately 3–4 mm engagement only if camera permits |
| Zip ties / insulating tape / adhesive rubber feet | As needed | Electrical insulation, strain relief and desk grip |
| Normally-open stop button | Optional | GPIO33 to GND, normally high input |

CAMX exports thirteen printable parts: base, tripod_nut_retainer, lid, bearing_retainer, spindle_keeper, pan_arm, tilt_cover, camera_cradle, drive_arm, idler_arm, idler_cover, idler_bearing_retainer, fit_coupon. The reference assembly's hardware shapes are envelopes, not parts to print. Screws, horns and cables are documented but not modeled in full detail.

## Printing

Use PETG for the mechanism, 0.2 mm layers, 4 perimeters, 5 top/bottom layers and ~35–45% infill. The base and lid should print flat; bearing rings and fit coupon flat. The pan platform prints with its upper face down; both arm plates print flat on their inner faces; cradle prints on its side; both matching arm shells print with the closed outer face down. Their raised pivot medallions touch the bed first; add thin supports beneath the surrounding cover face. Exported STL/3MF files already apply these orientations and sit at Z=0. Inspect the slicer preview: local supports may be required under the pan platform/stem, enclosure access openings and cradle transitions. Do not assume a supplied 3MF has printer, material or support settings; it contains geometry in millimetres only. Individual 3MF is preferable to the large print layout on a small bed.

Print `fit_coupon` first: bearing seat, servo cavity, horn pocket, USB flange recess and hole pitch, capacitor cup. Printed holes may need drill/ream finishing. Keep bearing insertion gentle; do not force it into a tight seat. Sand the spindle until it fits the inner race without wobble; nominal spindle is 24.8 mm. Its axial retainers leave nominal 0.2 mm clearance on each side, so confirm the printed assembly rotates freely. The split-free keeper is screwed on after bearing insertion.

## Mechanical assembly

1. Insert the steel 1/4-20 nut from above into the bottom boss. Its flat sides prevent rotation. Check your existing tripod screw does not rise into the servo. The nut sits 1 mm above the underside. Install tripod_nut_retainer over it with two M2 × 6 screws before installing the pan servo. This cap prevents the nut lifting or dropping out.
2. Install the vertical pan servo on the base's two ear towers, shaft upward. Do not install its horn yet. Insert the ESP32 board edges into the vertical side rails; insulate header pins from other hardware. Use tape or a removable foam wedge for longitudinal retention. Secure the USB board and capacitor using ties, leaving PCB pads and capacitor leads insulated.
3. Seat the bearing in the lid against its shoulder and install the thin outer retainer with three screws. The pan spindle enters the inner race from above. Attach the keeper from below with two M2 screws; rotate by hand to confirm it does not rub the lid underside.
4. Fit the actual pan horn in the spindle underside pocket. The design assumes a **24 × 7 × 2 mm straight double-arm horn**, with attachment holes 16 mm apart. Modify the horn parameters/pocket for your supplied horn. Use the original servo center screw, reached through the center of the pan platform, and two M2 × 16 horn-to-print screws reached through the outer access holes, with nuts below the stock horn. Measure the actual approximately 13 mm stack before choosing final screw length; keep screw tips and nuts clear of the servo crown. Do not substitute printed spline teeth. Verify the horn stays flat without distorting the printed stem.
5. Fasten the drive-side plate to the pan platform with two M3 screws. Check it sits flat. Install the tilt servo in the upright from the outward/right side. Its shaft faces toward the camera and its body is enclosed by the removable hood. Servo ears seat on the arm outer face. Use the two ear holes with M2 through-bolts and nuts; the hood is installed last. Clearance and all four hood screw paths should be checked dry before powering.
6. Center both servos using the firmware with horns removed. Support the camera/cradle during every power or PWM disable operation. Set ARM, wait for center pulses, STOP to hold, then fit the pan horn at straight ahead and the tilt horn with the shelf level. Switch off power before completing fastening. A restarted SG90 can jump to its center; smooth motion applies after enabling, not to the unknown startup position.
7. Put the camera mounting screw through the shelf before attaching the cradle, because the space below the shelf is limited. Fit the tilt horn into the outward-facing cradle recess and secure it to the servo spline with its original screw. The screw is reachable from the inner/left side through the hub. Attach the cradle with two horn screws. Some SG90 horns need trimming/drilling to match the coupon; retain enough material around both holes.
8. Fasten the opposite arm to the pan platform with two M3 screws. Seat the 625 bearing in its outside pocket and fit the outer retainer with two M2 screws. Insert the M5 axle from the left through two 1 mm washers, the bearing inner race and a 1.4 mm spacer, into the cradle cheek and captive M5 nut. Tighten only enough to remove play: the bearing must rotate freely. The spacer must touch only the inner race and clear the printed shoulder. Confirm the axle tip/nut cannot touch the camera. Do not force the cheek sideways to compensate for a poor fit.
9. Mount the webcam with a steel 1/4-20 screw through the slot. Shelf stack is nominally 10 mm, with a 2.5 mm head recess; washer and camera thread engagement determine screw length (often about 11–13 mm from under head, but **measure your camera**). There is no printed male camera thread. Use a thin grip pad to resist camera rotation. Keep vents/microphones uncovered. Fold/position the factory clip only if it remains clear during tilt.
10. Route the tilt cable along the back of the arm, through the circular pan cowl's rear exit, and into the stationary lid's rear-side slot. Leave a relaxed pan loop outside the bearing. Secure camera USB to cradle rear tie slots and leave a second loose loop to the stationary host. Never route cables through the bearing or taut across a pivot. Verify all screw tips clear the cradle, especially the bearing retainer; shorten screws or add washers if needed. Screw on both matching arm covers and the lid after testing the empty motion envelope.

## Balance and load

The tilt pivot is at Z=110 mm, with the camera bottom at 83 mm. For a 50 mm-high uniform camera, center height is ~108 mm, close to the pivot. Actual CG includes the factory clip, camera screw, printed cradle and cable drag; adjust fore/aft placement in the slot. Calculate gravity torque as `mass_kg × perpendicular_offset_cm` in kgf·cm. For 150 g and a 1 cm offset, static torque is 0.15 kgf·cm before bracket/cable loads. At a 3 cm offset it is 0.45 kgf·cm. Published SG90 1.8 kgf·cm is stall torque, **not continuous torque**. Aim for a well-balanced mechanism with static load below approximately 0.3–0.4 kgf·cm as an engineering starting assumption, then verify temperature/jitter; this is not a manufacturer continuous rating.

The pan bearing supports vertical and overturning loads. Your approved second tilt arm adds a 625 bearing opposite the servo. Both arm plates are 6 mm thick with matching rounded profiles and foot supports. The full-height covers are exact mirrored solids; one contains the tilt servo, the other only the bearing hardware. This reduces cantilever loading but does not remove the SG90's plastic gears/bearing limitations. Secure the base to a tripod or desk fixture: cable pulls can tip a lightweight freestanding unit. Read the [structural review](structural-review.md) and qualify the assembly with a dummy load before installing the camera.

## Wiring

```
Regulated PSU +5 V ── optional rated USB-C input OR direct cable ── +5 V bus
                                                             ├─ ESP32 VIN / 5V
                                                             ├─ pan red
                                                             ├─ tilt red
                                                             └─ capacitor +
PSU GND ───────────────────────────────────────────────────── GND bus
                                                             ├─ ESP32 GND
                                                             ├─ pan brown
                                                             ├─ tilt brown
                                                             └─ capacitor −
ESP32 GPIO18 ── pan orange signal
ESP32 GPIO19 ── tilt orange signal
ESP32 GPIO33 ── optional STOP button ── GND
Webcam USB ── direct to host PC (separate from servo supply)
```

![Power and signal diagram](../exports/drawings/wiring.svg)

Use short, adequate power wires in a star arrangement. Connect the 1000 **µF** capacitor across the supply near the servo branch; polarity stripe indicates negative. `1000 mF` would mean one farad and is not the intended component. Never power servo red wires from ESP32 3V3 or through the DevKit regulator. A 5 V / 3 A PSU is the starting specification, not proven simultaneous-stall headroom: TowerPro reports up to approximately 2 A per SG90, so two stalled servos plus the ESP32 can exceed 3 A. Measure loaded current and voltage with both axes moving, avoid jams, and verify wiring/current protection. The capacitor helps brief transients; it cannot supply sustained overload current.

The photographed USB-C board's schematic and rating are unknown. The housing provides its flange mounting and insulated PCB supports. The revised panel module is mounted on the right side, as in the new sketch. Default electrical purpose is **power input only**, with D+/D− left unconnected. Verify its VBUS/GND pinout, CC1/CC2 sink resistors, current capability and orientation with documentation/meter before use. USB-C presence alone does not guarantee a 3 A-rated input; a basic breakout with missing CC resistors may not work with a C-to-C source. Use the direct PSU cable/grommet opening if the module is unsuitable. Do not request USB-PD voltage above 5 V.

For flashing, the ESP32's existing USB-C port is reachable through the left-front opening. Avoid connecting two unisolated 5 V sources: many DevKit clones lack suitable power isolation. Safest setup is flash with PSU disconnected and servo red leads disconnected, unplug programming USB, then use the PSU and Wi-Fi. For simultaneous serial and PSU operation, verify the board schematic or use a USB adapter/cable with **VBUS disconnected but data and GND retained**, keeping ESP32 powered by the PSU. The external panel breakout is not wired to the ESP32 UART/data lines. An ESP32-WROOM-32 cannot read the Anker UVC stream through this breakout.

## Firmware and calibration

The rich [SolidJS control client](control-client.md) adds browser calibration, presets, a two-axis aiming pad and guides. Install its separate LittleFS image and open `http://DEVICE_IP/control/`; the small fallback page remains at `/`.

Build: `.venv/bin/pio run -d firmware`. Flash: `.venv/bin/pio run -d firmware -t upload --upload-port /dev/ttyUSB0` (actual device can be `/dev/ttyACM0`). Monitor: `.venv/bin/pio device monitor -b 115200 -p /dev/ttyUSB0`.

Copy `firmware/include/credentials.example.h` to `firmware/include/credentials.h` (ignored by Git), set `WIFI_SSID`, `WIFI_PASSWORD` and preferably `API_TOKEN`, then rebuild and flash. ESP32 joins your 2.4 GHz network in station mode. Serial prints the assigned IP; open that address from the same LAN. It retries every 10 seconds without blocking the motion loop, holds and latches STOP on detected connection loss, and never resumes motion automatically after reconnect. No setup AP is created. Public binaries have no credentials and require a local build for Wi-Fi use. Configured binaries contain secrets: keep them private. See [HTTP API](firmware-api.md). GitHub Pages only simulates geometry.

Serial uses newline-terminated commands at 115200 baud:

```
STATUS
ARM
MOVE 15 -5
HOME
STOP
ARM
DISARM
CAL 0 1500 1000 2000 -60 60 0 25
CAL 1 1500 1200 1800 -25 25 1 15
```

CAL fields are `axis center_us low_us high_us minimum_deg maximum_deg invert speed_deg_per_s`; axis 0 pan, 1 tilt. Calibration only works while DISARMED and is saved to NVS. Low/center/high must increase, within 700–2300 µs. Limits must straddle zero and remain within the CAD's ±60° pan / ±25° tilt; speed is 1–60°/s. Unsafe saved limits are discarded at boot. New-device default endpoints are conservative 1400/1500/1600 µs for both servos. Valid saved calibration is retained; inspect it before arming after an upgrade. Pulse-to-mechanical-angle varies: start with horns off, use conservative endpoints such as 1400/1500/1600 µs, then expand slowly while measuring. Firmware degrees are estimated normalized commands, **not measured physical angles**. Invert flips pulse direction. A different invert setting may be needed with your actual horn/servo.

STOP cancels the trajectory and holds the current estimated commanded angle. ARM resumes. The hardware button latches STOP while pressed and must be released before ARM. It is a software stop, not a power-cut emergency stop. DISARM removes PWM and may let the camera fall. After 5 seconds without an accepted movement, ARM, or explicit heartbeat command, firmware stops and continues holding. STATUS polls do not reset that timer. Commands outside limits, NaN, missing numbers and oversized serial lines are rejected. No OTA or cloud dependencies are present.

HTTP: GET `/status`; POST `/arm`, `/stop`, `/disarm`, `/home`; POST `/move` with JSON `{"pan":15,"tilt":-5}`. Every POST requires `X-CAMX-Request: 1` and, if configured, `Authorization: Bearer TOKEN`. Both offsets are absolute degrees from calibrated center and are validated together before either target changes. There is no CORS permission to control it from GitHub Pages. Motion control and the public viewer are intentionally separate.

See [the control-client guide](control-client.md) for browser calibration and deployment, and [the HTTP API](firmware-api.md) for `/calibration` and `/heartbeat`.

## GitHub Pages viewer

`cd viewer && npm ci && npm run build` creates `viewer/dist`, including the viewer, CAD downloads, build guide and firmware. Local development: `npm run dev`; serve the output with `npm run preview`. Assets use relative URLs so the site works under `/camx/` or a custom domain without editing a repository name.

Push the project (including `exports`) to your GitHub repository. In **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**. `.github/workflows/pages.yml` builds and deploys on pushes to main/master or manual runs. The source repository is `worxbend/camx`. Once Pages is enabled, the workflow publishes the viewer on pushes to main/master.

## Check smooth movement under load

Absolute moves ramp velocity and acceleration using a synchronized jerk-limited S-curve; held jogging applies jerk limits independently to each axis. Calibration Speed is a ceiling; reducing it also reduces acceleration and jerk. First test unloaded at 5°/s, then with a balanced camera and secured base. The default pan speed of 25°/s moves 30° in about 2.4 seconds from rest. Observe cable pull, backlash and small-pulse deadband. STOP is immediate and retains torque; DISARM releases it. Long moves still need an explicit heartbeat lease to avoid the five-second watchdog.

### Recessed USB-C flange

The metal flange remains visible from outside but sits 0.2 mm below the right wall. Its PCB and connector body sit inside. The default pocket is 30.6 × 12.6 mm, 2.2 mm deep, for an assumed 30 × 12 × 2 mm flange. A local reinforcement leaves 3 mm of backing beneath the flange. Mount with two M3 screws and internal washers/nuts; choose screw length after measuring the actual flange and screw-head profile. Use low-profile heads that remain below the outer wall plane, or verify/countersink the metal flange appropriately. The CAD does not assume countersunk holes in your photographed module.

Measure the module before printing: flange width, height, thickness, hole pitch, PCB depth, and receptacle housing. Update `usb_flange_thickness`, `usb_flange_recess` (at least the flange thickness plus screw-head height if heads protrude), and related parameters. Print the fit coupon first. Do not force the PCB into the pocket; secure it by its edges with insulated ties. Verify a real USB plug seats fully in the recessed socket before final assembly.

### Short side-cover screws

Both side arms now have matching integral Ø6.5 mm standoffs extending across the shell cavity. Each stops 0.3 mm before the outer cover's inner face, with a 1.8 mm pilot drilled 7 mm deep. Use **four M2 × 8 mm screws per cover** (eight total), with heads fitting the Ø4.5 mm recess. The nominal 3 mm shell and 1.8 mm head recess leave 1.2 mm under the head; an 8 mm screw engages approximately 6.5 mm after the 0.3 mm gap. Check your actual head height and printed pilot fit. Tighten gently; use plastic-compatible thread-forming screws where available. These standoffs are built into the arms and need no separate long bolts or spacers.
