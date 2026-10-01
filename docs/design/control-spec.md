# CAMX Control visual and interaction specification

Source: `control-concept.png`, generated with the built-in image generation tool for a complete 1536×1024 task-oriented desktop control app. The owner requested autonomous implementation without questions; the concept is selected as the implementation reference.

## Visual system

Dark instrument console, matching the existing CAMX studio: navy canvas `#0b1017`, slightly raised surfaces `#121c27`, cool fine borders `#283747`, mint `#a6e8cf` for primary actions and axes, amber `#e4b36a` for fine-step selection, coral `#f36a70` for STOP. Geometric system sans, restrained 12px corner radii, no glowing decoration, gradients or video claims. Typography: 38px main heading desktop, 26px panel headings, 16px form labels, 14px secondary text; scale down responsibly on narrow viewports. Bright text `#edf4f8`, muted `#aabdd0`.

Left rail ~220px with CAMX typographic wordmark, Control desk, Control/Calibrate/Guides/Connection navigation and bottom 3D studio link. Main gutters 24px; header Make your move. and actual connection/demo status, connection settings at right. Control region has an expansive XY pad plus two-axis slider/numeric/nudge controls, fine-step selector and optional keyboard control. Right session/presets rail ~300px; STOP clearly visible and easy to operate. Activity occupies a simple full-width chronological table/list below. Preserve border hierarchy, readable form sizing and generous pad area.

## Functional surfaces

- Control: physical-state-aware ARM/Home/STOP/Disable PWM, combined numeric pan/tilt requests, drag pad, fine steps, guarded keyboard, editable presets, import/export, optional explicit maintain-control heartbeat, bounded scrubbed activity log.
- Calibration: dedicated two-column settings/wizard surface in the same visual language; axis selection, center/low/high pulse µs, degree limits, speed and invert, validation, read device status, apply only disarmed, import/export configuration without secrets. Step instructions explain horns-off center, installation, direction, measuring limits and loaded validation. Applying calibration never arms or moves automatically.
- Guides: readable task articles/checklists for wiring, USB source isolation, Wi-Fi configuration, LittleFS client install, center/direction/limits, bearings/balance and host API examples. Code blocks are scrollable; no fabricated video stream or automatic face tracking.
- Connection: device/server details, memory-only bearer token, connect/disconnect, explicit offline demo, IP/hostname guidance and mixed-content explanations. Never auto-ARM on reconnect.

## Responsive and accessibility

At widths below ~1100px use a thinner rail and scale control columns; below ~850px stack the session/presets below the pad and move navigation to a compact header. At 390px every control is readable and reachable without horizontal page overflow. Touch targets at least 40px, native labeled inputs/buttons, focus-visible rings, reduced-motion support, status live region. Device-disconnected, stopped, physical STOP and calibration states gate motion controls.

## Intentional fidelity adjustments

The generated reference depicts an armed demo at pan12/tilt−4. Actual app defaults must be disconnected/disarmed (or clearly labeled demo), with zero angles until the user deliberately acts. 'Maintain control' starts OFF for safety although the reference shows a check. Arm button behavior/text may reflect the actual session state. Add required functional tabs/forms using this exact component system rather than duplicating screenshot values as fixed content. No token or credentials stored in localStorage, exported files, activity or screenshots.

## Concept prompt summary

Built-in image generation: complete CAMX Control desktop app, dark navy/mint/amber/coral palette, left task rail, large XY aiming pad, paired pan/tilt controls, explicit session controls, editable preset list and activity. All interface elements remain native HTML/CSS/Solid components. No fake camera/video or invented metrics.

Calibration reference: `calibration-concept.png`, built-in image generation using the same palette, rail and component system. Four plain numbered steps Center/Direction/Limits/Verify; pulse-field form with Pan/Tilt selection, pulse-range diagram and save/reload/import/export; right step instructions and serial sample; bottom pre-movement checklist. Ignore the generator's accidental desktop window titlebar: this is a browser application. Commands are explanatory examples, not automatically executed scripts. Generic nav icons should remain consistent with the control reference across tabs.
