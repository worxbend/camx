# CAMX Control Studio 🎛️

The SolidJS client brings pan and tilt, saved poses, calibration, and assembly guidance into one local dashboard. It controls the ESP32 mechanism; it does not carry webcam video or perform face tracking. The public GitHub Pages version is an interactive demo. Browser demo movements never reach a servo.

## Choose how to connect

**Device-hosted client:** build the static client and install its LittleFS image using PlatformIO. Open `http://DEVICE_IP/control/` in a browser. The client and API share an origin, so no CORS setup is required. Firmware keeps the compact fallback page when the rich client is not installed.

**Local bridge:** use Node.js 24 LTS (or a version satisfying `client/package.json`) and the client source. From the repository root:

```sh
cd client
npm ci
npm run build
CAMX_DEVICE_URL=http://192.168.1.50 npm run serve
```

Open `http://127.0.0.1:4175/control/`, or the local URL printed by the server. Replace the example address with the IP printed by the ESP32 at 115200 baud. The bridge serves the built dashboard and forwards its API calls to the configured device. Keep it bound to localhost. It does not discover devices or make a public cloud connection.

The HTTPS GitHub Pages demo cannot directly control a plaintext LAN ESP32: browser origin and mixed-content restrictions apply. Use the device-hosted client or local bridge for real control.

## Build and flash the device-hosted client

Install Node.js 24 LTS and Python/PlatformIO, then run the client build. Explicitly stage the built assets into `firmware/data/control`, then build and upload the LittleFS image:

```sh
cd client
npm ci
npm run build
npm run stage:firmware
cd ../firmware
pio run -t upload
pio run -t buildfs
pio run -t uploadfs
```

Configure Wi-Fi first by copying `firmware/include/credentials.example.h` to the Git-ignored `credentials.h`. Enter your 2.4 GHz SSID, password, and optional long API token. Build configured firmware locally. Do not publish configured binaries: credentials are embedded in them. A filesystem upload replaces its existing contents; calibration is retained in ESP32 NVS separately.

## First movement

1. Secure the base, support the camera, and confirm wiring and safe servo endpoints. Start with the servo horns removed on a new build.
2. Open the real local dashboard. Enter the token if configured and connect. Connecting only reads status; it does not enable PWM.
3. Inspect the current saved limits, pulse settings, STOP state, and connection status.
4. Deliberately choose **Arm / resume**. First enable assumes mechanical center and can jump; SG90 servos have no position feedback.
5. Hold a directional button on the Remote to move; release to brake smoothly. Begin at the default 25% speed. For exact angles, use Precision or a saved pose. Home commands both offsets to zero.
6. Use **STOP · hold** to cancel motion while retaining holding torque. Use **Disable PWM** only with the camera supported.

Precision movement sends both absolute offsets:

```json
{"pan":15,"tilt":-5}
```

Firmware eases absolute Precision and Home moves with a synchronized jerk-limited S-curve. These moves start gently, accelerate to at most the calibrated Speed, then slow smoothly to rest, with both axes finishing together. Changing absolute targets preserves velocity and acceleration; repeating a target does not restart easing. Jogging applies bounded acceleration and jerk independently to each axis. STOP remains immediate.

Values are degrees from calibrated center, not increments. Firmware positions and the dashboard visualization are commanded estimates, not measured angles. Limits apply to both values atomically.

Connection loss cancels client motion intent; reconnection never automatically arms or resumes it. Firmware holds position after Wi-Fi loss or five seconds without an accepted movement/ARM command, preserving the existing armed state. Status polling does not renew this timeout. Any optional live-control lease only renews an explicitly active session; stop it when finished. A browser STOP requires a working network connection: use the GPIO STOP input for local intervention that does not depend on a browser request. It is software-polled and is not a hardwired power cutoff.


The directional remote uses `POST /jog` with paired normalized rates, a control epoch returned by ARM, and a strictly increasing sequence. It renews intent approximately every 100 ms only while held. Releasing sends both rates zero with a newer sequence and starts jerk-limited braking. This may travel farther than an emergency STOP. Pointer cancellation, lost capture, window blur, page hiding, navigation, disconnect, and STOP clear held input. Keyboard arrows support diagonals when enabled and ignore editable fields.

```json
{"pan":0.25,"tilt":0,"epoch":123456,"seq":1}
```

A nonzero jog has a separate **500 ms lease**. Missing renewal immediately holds position and invalidates the epoch; `/status` and `/heartbeat` cannot extend that lease. A zero/zero release ends the short lease. Recovery requires a new hold; ARM is required only after explicit STOP or PWM disable. Old or duplicate sequences and previous epochs cannot revive motion. Older firmware without jog capability disables held directions; absolute Home and Precision remain available. See the [jog design and protocol](jog-design.md) for details and tradeoffs.

## Calibrate with measured angles

Calibration is accepted only while PWM is disabled. The dashboard exposes center, low and high pulse widths, angle endpoints, inversion, and speed for each axis. Pan is axis `0`; tilt is axis `1`.

1. Remove horns, disable PWM, and start with narrow pulses: low `1400`, center `1500`, high `1600` µs. Use small ±10° limits and 5°/s speed initially.
2. Save one axis, then the other. The dashboard rereads status to confirm the device's saved values.
3. Arm unloaded to center the shafts. Mark their positions, disconnect power, and mount horns so the camera faces forward and is level.
4. Arm and test pan alone, then tilt alone in small steps. Change inversion while disarmed if your chosen positive direction is reversed.
5. Measure travel using a protractor or angle gauge. Disable PWM before each adjustment, then expand pulse endpoints by approximately 10–20 µs per trial. Maintain clearance from collisions, cable tension, and mechanical servo stops.
6. Balance and mount the camera, then repeat slowly with a secured base and tether.

Changing angle limits alone does not expand physical travel: they are mapped to your pulse endpoints. Maximum CAD envelope is pan ±60° and tilt ±25°; measured safe travel may be smaller. Never calibrate by driving into a hard stop. Saved calibration survives reboot.

The calibration request is:

```json
{"axis":0,"center":1500,"low":1400,"high":1600,"minimum":-10,"maximum":10,"invert":false,"speed":5}
```

The endpoint is `POST /calibration`. Every mutation requires `X-CAMX-Request: 1`; a configured token uses `Authorization: Bearer TOKEN`. See the [firmware API](firmware-api.html) for the full contract and [assembly guide](build.html) for electrical isolation, fasteners, and power connections.

## Saved poses and privacy

Saved poses are browser-local convenience settings. **Save current pose** captures the latest device-reported commanded pan/tilt at the moment you save, including a position updated after jog braking. It does not save an unsent Precision draft. These are commanded estimates, not encoder measurements. Editing an existing preset preserves your explicitly edited values. Imported poses still pass current device limits and require deliberate ARM before motion. Review a preset before recalling it. Exported presets contain pose data, not Wi-Fi credentials or bearer tokens. The connection token stays in memory for the active page session; reenter it after reload. Do not expose the controller or bridge to the Internet: device HTTP traffic is plaintext.

## Development and verification

```sh
cd client
npm ci
npm run dev
npm run build
npx playwright install chromium
npm test
```

Browser tests use simulated HTTP responses and demo state. They verify combined requests, explicit arming, stop/disarm, calibration, presets, keyboard focus guards, and responsive layouts without operating motors. These checks complement firmware parser and movement tests; they do not establish real servo clearance, torque, Wi-Fi reliability, electrical safety, or emergency response under load.

## Automatic connection recovery

After Connect, the client retries status requests every second indefinitely, including after a failed jog request or failed initial connection. A request can take up to 2.2 seconds, and polls do not overlap. Recovery restores the controls from the current device status and clears the connection error without requiring another Connect click. Explicit Disconnect stops retries. Interrupted holds and queued movement commands are cancelled and never replayed. If the firmware has latched STOP or disabled PWM, ARM remains an explicit action; a fresh pointer or key press is required to jog again.
