# Remote verification

The production SolidJS client was checked with headless Chromium at 1536 × 1024 and 390 × 844, under a `/control/` deployment path. Browser automation was used because no interactive browser surface was available in this environment.

## Behavior

All 44 client tests passed against the production build. The client suite covers paired held rates, continuous refresh, newer zero release, coalescing and stale-response rejection, lease expiry, pointer capture/cancellation, multi-touch diagonals, held keyboard arrows and focused Space/Enter, focus guards, hidden-page/navigation/disconnect cleanup and deliberate reconnect. Precision, presets, calibration and token privacy remain covered. Older firmware gates held directions while retaining absolute control.

Native sanitizer suites exercise 4,000 randomized absolute commands and 4,000 randomized jog commands, derivatives, release and reversal bounds, limit braking, STOP and epoch/sequence ordering. The bounded HTTP parser passes 30,000 deterministic fuzz cases. Three LAN bridge tests and the embedded fallback page checks pass. ESP32 firmware and matching LittleFS image compile.

## Visual comparison

The selected concepts and actual browser captures were inspected together. The large concave four-lobe pad, circular Home, matte gradient/rim, white arrows, charcoal canvas, mint speed/ARM and coral STOP follow the user's reference. Desktop rail and context column retain the intended hierarchy. On phone, the whole pad, speed choices, ARM/PWM and persistent STOP fit above bottom navigation on the first screen, with no horizontal overflow.

System typography and SVG controls are native; there is no raster text or generated image dependency. Actual positions replace invented concept values. The phone moves ARM above the pad and keyboard details below the fold to keep essential controls reachable. Existing preset rows remain functional rather than copying generated example angles. These intentional deviations are recorded in [the specification](remote-spec.md).

No relevant browser console or page errors were observed in the tested flows. Physical SG90 motion, Wi-Fi latency, task timing under load and loaded stopping distance remain untested. Browser demo motion is illustrative, not evidence of physical servo response. The firmware occupies approximately 95.4% of the default app slot.

Actual previews: [desktop](remote-desktop-preview.png), [phone](remote-mobile-preview.png), [calibration](remote-calibration-preview.png). Generated styling references: [desktop concept](remote-concept.png), [phone concept](remote-mobile-concept.png).

## Final readiness audit

The final audit corrected synchronous release errors at uint32 sequence exhaustion, restricted JSON whitespace to space/tab/CR/LF, and made new “Save current pose” presets capture the latest commanded status, including movement during release braking. Existing preset editing retains its editable values. Absolute moves synchronize arrival; jog axes remain independent. Release source, firmware, filesystem, guides and downloadable archives are rebuilt together for v0.5.1.

Software and print files are ready for controlled prototype commissioning when the recorded checks pass. Physical readiness still requires actual fit, coaxial alignment, balanced dummy-load testing, cable slack, power-source isolation, measured calibration and Wi-Fi/STOP checks. A 50 mm-wide camera fits the nominal 55 mm camera-width envelope; height, depth, folded clip, screw position and usable thread depth must also match. Geometry tests do not establish load or fatigue ratings.

**Open dependency issue:** As checked on 2026-10-02, GitHub reports 13 Pillow alerts (10 high, 3 moderate) against the CAD/image build toolchain's pinned 12.2.0. Pillow 12.3.0 fixes the listed issues, but current build123d 0.13.0 pulls threejs-materials 1.2.x, whose metadata requires Pillow >=12.2.0,<12.3.0. The attempted update failed `pip check`; the compatible pin was restored. An upstream-compatible dependency update or a separately reviewed fork is needed. The ESP32 firmware and browser runtime do not use Pillow. This does not justify claiming a clean security audit; avoid processing untrusted image inputs with that toolchain. [Pillow release notes](https://pillow.readthedocs.io/en/stable/releasenotes/12.3.0.html), [upstream dependency declaration](https://github.com/bernhard-42/threejs-materials/blob/main/pyproject.toml).

The default firmware app slot is approximately 95.4% occupied. Static RAM figures exclude runtime Wi-Fi allocations and task-stack usage; bench checks must measure stack/heap margin and motion planning latency. GPIO STOP is polled by firmware and does not electrically cut motor power.
