# Remote verification

The production SolidJS client was checked with headless Chromium at 1536 × 1024 and 390 × 844, under a `/control/` deployment path. Browser automation was used because no interactive browser surface was available in this environment.

## Behavior

All 40 client tests passed against the production build. The client suite covers paired held rates, continuous refresh, newer zero release, coalescing and stale-response rejection, lease expiry, pointer capture/cancellation, multi-touch diagonals, held keyboard arrows and focused Space/Enter, focus guards, hidden-page/navigation/disconnect cleanup and deliberate reconnect. Precision, presets, calibration and token privacy remain covered. Older firmware gates held directions while retaining absolute control.

Native sanitizer suites exercise 4,000 randomized absolute commands and 4,000 randomized jog commands, derivatives, release and reversal bounds, limit braking, STOP and epoch/sequence ordering. The bounded HTTP parser passes 30,000 deterministic fuzz cases. Three LAN bridge tests and the embedded fallback page checks pass. ESP32 firmware and matching LittleFS image compile.

## Visual comparison

The selected concepts and actual browser captures were inspected together. The large concave four-lobe pad, circular Home, matte gradient/rim, white arrows, charcoal canvas, mint speed/ARM and coral STOP follow the user's reference. Desktop rail and context column retain the intended hierarchy. On phone, the whole pad, speed choices, ARM/PWM and persistent STOP fit above bottom navigation on the first screen, with no horizontal overflow.

System typography and SVG controls are native; there is no raster text or generated image dependency. Actual positions replace invented concept values. The phone moves ARM above the pad and keyboard details below the fold to keep essential controls reachable. Existing preset rows remain functional rather than copying generated example angles. These intentional deviations are recorded in [the specification](remote-spec.md).

No relevant browser console or page errors were observed in the tested flows. Physical SG90 motion, Wi-Fi latency, task timing under load and loaded stopping distance remain untested. Browser demo motion is illustrative, not evidence of physical servo response. The firmware occupies approximately 95.4% of the default app slot.

Actual previews: [desktop](remote-desktop-preview.png), [phone](remote-mobile-preview.png), [calibration](remote-calibration-preview.png). Generated styling references: [desktop concept](remote-concept.png), [phone concept](remote-mobile-concept.png).
