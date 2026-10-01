# CAMX firmware HTTP API

## Configure and connect

Copy `firmware/include/credentials.example.h` to `firmware/include/credentials.h`, then fill in your 2.4 GHz SSID, password and a long random `API_TOKEN`. This header is ignored by Git. Build/upload with PlatformIO as described in the assembly guide. No credentials means Wi-Fi stays unconfigured; serial remains available. No AP, OTA or cloud service is enabled. Credentials are not printed or returned by the API.

The assigned DHCP IP is printed at 115200 baud. Use a router DHCP reservation for a predictable address; the DHCP hostname is `camx` (mDNS is not implemented). HTTP starts after the station connects. Reconnection is attempted every 10 seconds indefinitely, including initial connection failure, wrong credentials and router outages. There is no attempt limit or forced reboot. A latched Wi-Fi event records brief disconnects even if reconnection happens between loop iterations. A detected disconnect cancels motion and latches STOP; reconnection never arms or resumes it.

Public release binaries are deliberately unconfigured. Build your own to connect to Wi-Fi. Configured binaries embed the credentials and token. Packaging refuses a checkout with a private credentials header; use a clean checkout for public releases. Never upload private BIN/ELF files.

## Request contract

| Method | Path | Behavior |
|---|---|---|
| GET | `/` | Small local control page; enter token if configured |
| GET | `/control/` | SolidJS control app from uploaded LittleFS filesystem |
| GET | `/status` | Commanded positions, targets, limits, pulse endpoints, speed/inversion, firmware version, armed/stop state |
| POST | `/arm` | Enable/resume PWM unless physical STOP is pressed |
| POST | `/move` | Set pan and tilt offsets together |
| POST | `/home` | Set both offsets to zero |
| POST | `/stop` | Cancel trajectory and hold commanded position; latch STOP |
| POST | `/disarm` | Cancel and disable PWM; support camera first |
| POST | `/heartbeat` | Renew an already active command lease; never ARM/resume |
| POST | `/calibration` | Validate and save one complete axis configuration while disarmed |

Every POST requires `X-CAMX-Request: 1`. When `API_TOKEN` is nonempty, it also requires `Authorization: Bearer TOKEN`. An empty token disables authentication and is suitable only for a trusted isolated LAN. HTTP is plaintext; this is local control, not an Internet-facing service. No CORS is enabled. The custom header prevents ordinary cross-origin HTML forms from issuing motor commands. Read-only status and the page are unauthenticated; USB serial is a trusted physical control channel.

`/move` requires `Content-Type: application/json` and exactly two unique numeric fields:

```json
{"pan":15,"tilt":-5}
```

These are **degrees offset from calibrated center**, not increments from the last request. Both targets are accepted together or neither changes. Repeating a request is idempotent. Firmware degrees are commanded estimates, not encoder measurements. Default limits are pan ±60°, tilt ±25°; establish actual safe endpoints with horns removed before assembly. Positive direction depends on your calibration/invert configuration.

```sh
# Set CAMX_TOKEN locally to the same API token; omit Authorization if token is empty.
curl -X POST http://DEVICE_IP/arm \
  -H 'X-CAMX-Request: 1' -H "Authorization: Bearer $CAMX_TOKEN"
curl http://DEVICE_IP/move \
  -H 'X-CAMX-Request: 1' -H "Authorization: Bearer $CAMX_TOKEN" \
  -H 'Content-Type: application/json' -d '{"pan":15,"tilt":-5}'
curl http://DEVICE_IP/status
```

Action POSTs have empty bodies. Success returns HTTP 200 and status JSON. Errors: 400 invalid/missing fields or headers, 401 bad token, 404 unknown route, 405 unsupported method, 408 incomplete request deadline, 409 stopped/disarmed/out-of-range movement, 413 oversized headers/body, 415 incorrect media type. Unknown fields, duplicate fields, numeric strings, NaN/infinity, trailing JSON and partial updates are rejected. JSON field order does not matter. Requests require HTTP/1.0 or 1.1, CRLF headers, and Content-Length for POST; chunked bodies and persistent/pipelined connections are unsupported.

## Calibration and control lease

`POST /calibration` requires JSON with exactly these eight unique typed fields:

```json
{"axis":0,"center":1500,"low":1400,"high":1600,"minimum":-10,"maximum":10,"invert":false,"speed":5}
```

Axis is integer 0 (pan) or 1 (tilt); center/low/high are integer microseconds, 700–2300, with low < center < high. Minimum must be negative and maximum positive, within ±60° pan / ±25° tilt. Speed is finite 1–60°/s; invert must be a JSON boolean. Unknown/duplicate/missing fields, numeric strings, nonfinite values and trailing content are rejected. Valid settings save only while disarmed; applying them never arms or moves the camera. Use measured physical travel, not default endpoint assumptions.

`POST /heartbeat` has an empty body. It renews the five-second timeout only while already armed, unstopped and with the physical STOP input released. It never resumes after a timeout or disconnect. The rich client exposes this as an optional **Maintain control** setting, off by default and disabled on STOP, disconnect, calibration or a hidden tab.

Build and upload the rich interface's LittleFS image separately from firmware. Static assets under `/control/` are read-only and streamed in the HTTP task; traversal and unknown paths are rejected. Filesystem mount failure leaves the small `/` fallback page available and never autoformats storage. See the [control client guide](control-client.md).

## Timing and safeguards

A separate FreeRTOS HTTP task handles one client at a time, using fixed buffers: 2,048 bytes for headers and 384 bytes for the body. Incomplete requests have a 1.5-second receive deadline. Short mutex-protected operations share motion state; network reads/writes happen outside the lock. Slow clients cannot intentionally block the servo loop through HTTP reads, but may occupy the single HTTP slot. Firmware is not a certified real-time controller.

PWM starts disabled. New-device pulse defaults are 1400/1500/1600 µs; valid saved calibration is retained on upgrade, so inspect it before arming. Each target is approached at the calibrated speed. Physical STOP is checked in the loop and again when accepting a move/ARM. STOP retains holding torque. Five seconds without an accepted move, ARM or explicitly enabled heartbeat cancels the trajectory and latches STOP; status polls and invalid requests do not renew this watchdog. After timeout, explicitly ARM again. Periodic identical `/move` requests may renew the watchdog for a long movement or an active tracking client. DISARM and power loss may let the camera drop; use a tether and support it first. ARM on first enable assumes center and may jump because SG90 has no feedback.

Serial and HTTP calibration remain disabled while PWM is armed. A complete per-axis calibration is saved as one atomic NVS blob before runtime settings change; prior field-based saved settings remain readable. Calibration cannot exceed the CAD envelope (pan ±60°, tilt ±25°); saved configurations beyond those limits are discarded at boot. There is no firmware face-tracking implementation; a host client may calculate offsets and submit them through this API.

## Verification

`tests/motion_test.cpp` checks movement math and atomic target rejection. `tests/http_test.cpp` tests malformed, oversized and fragmented HTTP/JSON input, duplicate fields, numeric edge cases, truncation and deterministic fuzz cases under AddressSanitizer/UndefinedBehaviorSanitizer. `tests/firmware_ui_test.mjs` exercises the HTML embedded in the firmware against mocked HTTP responses, including bearer authentication, ARM/STOP/DISARM and a combined JSON offset request. CI compiles the ESP32 firmware and runs these suites.

Hardware checks still required: real SSID join and router restart, token rejection, slow-client behavior while moving, physical STOP, disconnect/timeout hold, re-ARM, actual servo calibration and load/temperature. No physical hardware test has been claimed.

Implementation references: [Espressif Wi-Fi API](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/wifi.html) and [ArduinoJson parsing API](https://arduinojson.org/v7/api/json/deserializejson/).
