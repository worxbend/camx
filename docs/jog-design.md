# Hold-to-move remote: design and protocol

CAMX's primary remote sends direction and speed while a button is held. Release tells the firmware to brake smoothly and hold the resulting position. It does not keep adding angle offsets or queue a long series of target poses. Precise absolute angles remain available separately for measured positions and presets.

## Why a hold remote

A directional remote fits exploratory aiming: press right until the frame looks right, release, then adjust tilt. An explicit enable step and continuously renewed velocity intent are established teleoperation patterns. ROS `teleop_twist_joy` converts joystick input to scaled velocity commands and supports a required enable button; it delegates repeat behavior to its joystick source. CAMX applies the same general idea to browser buttons, without depending on ROS. [ROS teleop documentation](https://github.com/ros2/teleop_twist_joy)

A short command lease bounds how long missing input can continue movement. ROS's differential-drive controller offers stale-command stopping with a default 0.5-second timeout and velocity, acceleration, and jerk limits. Those are useful design precedents, not certification or evidence that a webcam mechanism is safe. CAMX's independent 500 ms jog watchdog is a project choice to be validated on its actual network and loaded mechanism. [ROS controller documentation](https://control.ros.org/rolling/doc/ros2_controllers/diff_drive_controller/doc/userdoc.html)

## PTZ precedents and mode choice

ONVIF's PTZ service separates absolute, relative, and continuous moves. ContinuousMove supplies signed axis velocities, an optional timeout, and zero-axis stopping; Stop is a separate operation. Axis VAPIX likewise offers paired continuous pan/tilt rates and a zero/zero stop. CAMX borrows this interaction model, but its JSON endpoints, epochs, and response schema are custom: **CAMX is not an ONVIF-compatible camera**. [ONVIF PTZ service §§5.3.3–5.3.5](https://www.onvif.org/specs/srv/ptz/ONVIF-PTZ-Service-Spec.pdf), [Axis PTZ API](https://developer.axis.com/vapix/network-video/pantiltzoom-api/)

| Mode | Intent | Best use | Delay concern |
|---|---|---|---|
| Absolute target | Go to a calibrated angle | Precision and saved poses | Repeating the same target is idempotent |
| Relative increments | Move another small distance | Discrete nudges | A delayed backlog can keep adding distance |
| Renewed velocity | Continue while current intent is held | Directional remote | Short lease and ordered release bound stale intent |

## Release and fault behavior

| Trigger | Result | Resume |
|---|---|---|
| Pointer/key release | New zero/zero jog, jerk-limited braking, holding torque retained | Another deliberate hold while armed |
| Cancellation, blur, hidden page, navigation | Held input cleared; best-effort release sent | New deliberate hold; no replay |
| 500 ms jog lease expiry | Immediate STOP and epoch invalidation | Explicit ARM |
| Device Wi-Fi loss or physical STOP | Immediate STOP and epoch invalidation | Inspect mechanism, recover link/release switch, explicit ARM |
| Browser/network request failure | Client stops sending intent; release may not reach device, so device lease remains the fallback | Explicit reconnect/ARM as required by returned state |
| DISARM | PWM disabled; camera may drop | Support camera, explicit ARM |

The 25% default lowers the requested maximum velocity while retaining configured acceleration and jerk constraints. Its braking path is generally shorter than full-speed motion under the same constraints; actual servo response and stopping distance still require loaded measurement.

## Request contract

After explicit ARM, read `control_epoch` from the returned device status. Send `POST /jog` with exactly four fields:

```json
{"pan":0.25,"tilt":0,"epoch":123456,"seq":1}
```

`pan` and `tilt` are finite normalized rates from −1 to +1, scaled by each axis's calibrated speed. They are not degrees or cumulative increments. Default remote strength is 25%. Diagonals put both directions into the same request. The actual positive direction follows calibration.

`epoch` and `seq` are unsigned 32-bit integers. An ARM establishes a fresh epoch. Sequence numbers must increase within it. Wrong epochs and already accepted or older sequence numbers are rejected, so delayed requests within a running controller cannot restore a previous hold after a newer release or STOP. Firmware seeds a nonzero boot epoch using ESP32 randomness to reduce cross-reboot collisions. Epochs are ordering guards, not authentication or guaranteed persistent identities; reconnect and explicitly ARM after a restart.

While held, send the current intent about every 100 ms. Do not build a backlog: retain only the newest unsent intent. On release, send a newer sequence with both rates zero:

```json
{"pan":0,"tilt":0,"epoch":123456,"seq":8}
```

This is a deliberate soft release, not emergency STOP. Emergency STOP cancels the current trajectory immediately and requires ARM before resuming. Release can travel a little farther while decelerating; leave physical and cable clearance.

Every mutation requires `X-CAMX-Request: 1`. When configured, use `Authorization: Bearer TOKEN`; send JSON as `Content-Type: application/json`. Local HTTP remains plaintext, same-origin, and intended for a trusted LAN.

Status includes `control_epoch`, `jog_seq`, `jog_pan`, `jog_tilt`, `jog_active`, and `jog_lease_ms`, alongside existing armed, stopped, target, and calibration fields. These are commanded states, not encoder measurements.

## Leases and invalidation

The firmware accepts renewed jog intent only for the current epoch. A nonzero accepted rate renews the lease; an accepted zero/zero release disables the short lease and begins jerk-limited braking. If an active jog reaches 500 ms without renewal, it immediately latches STOP and invalidates that epoch. Status requests and `/heartbeat` do not renew a jog lease. Invalid JSON/rates return HTTP 400; state, epoch, sequence, or planner rejection returns HTTP 409; accepted requests return HTTP 200 with status. ARM is explicit; reconnecting cannot revive an old hold.

STOP, DISARM, Wi-Fi loss, motion watchdog expiry, and accepted absolute `/move` or `/home` commands invalidate prior jog intent. Switching from the remote to an absolute pose is deliberate, and stale jog requests cannot override that pose. If sequence space is exhausted, stop and ARM for a new epoch instead of wrapping into previously used sequence values.

## Browser input lifecycle

The client captures active pointers so release can be observed when a finger or mouse leaves its button. Pointer capture does not remove the need to handle cancellation: browsers may cancel a pointer when they take over a gesture or interrupt input. CAMX clears holds on release, cancellation, capture loss, window blur, page hiding, navigation, disconnect, and emergency STOP. [Pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture), [pointer cancellation](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event)

Background timers can be throttled. The page-visibility signal therefore clears active input rather than assuming a background tab can reliably maintain motion. The device watchdog remains responsible if a cleanup packet cannot arrive. [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

Keyboard arrows represent held directions, including diagonals. Key repeats do not accumulate moves. Key-up releases the corresponding direction. Typing in an input, textarea, select, or editable field does not aim the camera; keyboard motion is limited to the remote surface and explicitly enabled. No held direction is restored after reconnect or returning to the tab.

## HTTP tradeoffs

Small periodic HTTP requests reuse the firmware's existing bounded parser, token handling, and local bridge. They provide an inspectable one-package two-axis API and are straightforward to exercise with mocked browsers and native parser tests. Epochs and sequence numbers protect ordering independently of browser cancellation: aborting a fetch cannot retract a request the ESP32 already received.

WebSocket could reduce framing overhead and improve bidirectional updates. It would add another connection lifecycle, framing implementation, buffering policy, and release path to this small ESP32 controller. At the initial 10 Hz intent rate, bounded HTTP is a reasonable starting point; hardware testing must assess latency, packet loss, simultaneous clients, and servo responsiveness before claiming it is adequate under all conditions.

Repeated absolute offsets remain appropriate for saved poses and precise framing. They are less suited to press-and-hold interaction because the browser must otherwise estimate device position or generate successive targets during stalls and delays. Jog moves that timing and safe-limit responsibility into firmware.

## Verification limits

Browser tests use simulated devices and verify sustained intent, paired rates, increasing sequences, release priority, cancellation, focus guards, legacy capability detection, privacy, and responsive controls. Native firmware tests check parsing, leases, stale commands, and motion math. Neither establishes real motor torque, bearing clearance, actual stopping distance, Wi-Fi timing, or electrical safety. Bench-test an unloaded mechanism and a secured representative dummy before mounting the camera.
