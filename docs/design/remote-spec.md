# CAMX remote visual specification

The owner's remote images specify a large four-direction sculpted pad, circular center action and a phone-first layout. The matte charcoal reference is primary; mint and coral preserve CAMX's existing palette. The generated concepts `remote-concept.png` and `remote-mobile-concept.png` guide composition. The functional control is native SVG and CSS, not a generated bitmap.

## Concept prompts and composition

Desktop prompt: a 1536 × 1024 CAMX operator console, charcoal canvas, left task rail, heading “Move naturally.”, commanded pan/tilt readouts, large concave four-lobe directional cross, filled white arrows, circular Home, slow/normal/fast controls, right session/presets/activity column and globally accessible coral STOP. No webcam video placeholder or invented television features.

Mobile prompt: adapt that same concept to a 390 × 844 logical viewport with compact branding and heading, paired readouts, approximately 300 px pad, speed row, optional keyboard control, ARM/Disable PWM, persistent STOP and compact bottom navigation. Longer session details may scroll below the fold.

## Tokens

- Canvas `#101419`; panel `#171e25`; subtle border `#303b44`.
- Matte pad with native gradient, thin highlight rim and soft ambient shadow.
- White filled direction triangles and native Home glyph; consistent small navigation SVG icons.
- Mint for deliberate ARM and selected speed; coral for STOP; amber dot/text for demo.
- System sans-serif typography. Desktop title about 48 px, mobile 28 px; commanded values about 40/32 px.
- Desktop left rail about 230 px; main remote and compact right context column. Mobile prioritizes reachability and scrolling outside the pad.

## Functional hierarchy

Remote is primary. Pointer capture tracks independent held directions; opposite inputs cancel and perpendicular inputs form a diagonal. A speed change updates normalized rate, not an integrated browser angle. The center Home is a deliberate absolute action. Precision preserves sliders, fine nudges and combined degree targets. Calibration, guides, connection and editable presets remain available.

STOP is always reachable, including fixed placement on phone across workspaces. ARM never occurs on connection, tab return or reconnect. Only the pad suppresses touch scrolling. Visible state distinguishes held, braking, idle, stopped and disabled PWM. Readouts label **commanded** position, since SG90 has no encoder feedback.

## Intentional concept copy/layout deviations

- Generated example angle values are not initial state: actual status supplies them.
- Demo uses a dot and text instead of a generated badge.
- Existing preset angles are preserved instead of generated example angles.
- Invented “Move / Create / Capture” footer copy is omitted.
- Native icons and functional labels replace generated icon artifacts.
- Compact mobile ARM placement may precede the pad to keep enable and STOP reachable without scrolling. The concept is not a rigid pixel target where accessibility conflicts.
- Lease timings describe this prototype's protocol, not a certified motion guarantee.

Browser fidelity is assessed at native 1536 × 1024 and 390 × 844 alongside functional pointer, keyboard and lifecycle checks. Actual browser previews are published separately from concepts.
