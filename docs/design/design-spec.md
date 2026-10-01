# CAMX viewer visual specification

Built-in imagegen was used for the UI concept at `viewer-concept.png`; no API/CLI fallback was used. Product visuals in the finished interface come from the actual build123d GLB, not from a generated product picture.

## Concept prompt

Use case: ui-mockup. One complete 1536 × 1024 desktop screen for CAMX, an interactive 3D CAD viewer for an ESP32-powered DIY pan/tilt camera. Refined engineering studio. Dark navy #0b1017, pale type, mint #a6e8cf accents, #26313b borders. Header CAMX, 3D studio, Build guide, Download files. Open 70–74% canvas and 26–30% inspector, no card grid. Heading “Made to move.” and “Your camera. A new point of view.” Realistically proportioned 144 × 120 × 40 mm base, slim right arm, curved amber camera cradle, square black webcam. Subdued floor grid. Canvas hints “Drag to orbit · Scroll to zoom”. Perspective/Front/Side/Top buttons. Inspector Assembly, Explore the mechanism, Pan ±60°, Tilt ±25°, Explode 0–100, Show hardware, Wireframe, Reset view. Print parts, STEP assembly, Build instructions links. Footer Parametric design / build123d and Prototype · verify fit before printing. Crisp native text, restrained modern sans serif, no fake metrics or decorative badges. Mobile stacks canvas above inspector. Actual implementation must render CAD rather than use the concept as a screenshot UI.

## Tokens and components

- Canvas/background #0b1017; border #26343f; text #f2f4f8; secondary #b9c7d4; mint #a6e8cf.
- System sans serif, main heading 56 px desktop / 42 px mobile, inspector heading 40 px / 34 px, controls 13–18 px.
- Open canvas, one right inspector with dividing rule, 88 px header, 62 px footer.
- Outlined mint download/reset buttons; mint slider progress/thumbs; filled switch controls; line icons with 1.7 px strokes.
- Perspective view by default; orbit/zoom; pan and tilt pivot groups in model coordinates; per-part explosion offsets and visibility.
- No external font/CDN dependencies. All assets included in static build. Model loading error keeps downloads available.

## Intentional functional/geometry differences from the concept

- The owner approved a second tilt support with an opposite 625 bearing. The actual model now has two cradle cheeks, matching rounded full-height housings, pivot caps, a pan cowl and rounded enclosure edges.
- Show actual CAD edges, pan turntable, screw apertures, vents, retained tripod nut and approximate camera/hardware envelopes rather than idealized product surfacing or invented optics.
- Add live angle and explosion readouts and a collapsed Part visibility control to make the viewer useful.
- Show hardware toggles all nonprintable hardware, including the camera. Part visibility enables finer control.
- Desktop can scroll with the part list expanded; its collapsed studio fits the normal desktop viewport. Mobile stacks controls after the canvas.
