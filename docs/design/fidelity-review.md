# Viewer review

Working concept: [viewer-concept.png](viewer-concept.png). Browser captures: [viewer-desktop.png](viewer-desktop.png), [viewer-mobile.png](viewer-mobile.png). Both concept and rendered screenshots were inspected with `view_image`. Browser/IAB was unavailable; Playwright Chromium supplied the fallback. Native concept viewport: 1536 × 1024. Mobile: 390 × 844.

| Comparison | Evidence / result |
| --- | --- |
| Copy | CAMX, Made to move., Your camera. A new point of view., Assembly and every requested main control/link preserved. Additional angle readouts and collapsed part list are intentional functional additions. |
| Layout | Open left canvas and right inspector; header navigation, bottom view selector and narrow footer. Fixed an overly tall inspector so the collapsed desktop studio fits the target viewport. |
| Typography | 56 px main heading, 40 px inspector title and deliberate control sizes; mobile heading 42 px and stacked layout. System fonts replace the mockup's raster font. |
| Palette | Dark navy and mint match the concept tokens. Reduced lighting/exposure after a first browser capture made the model and ground too pale. |
| Asset treatment | Real GLB generated from the printable CAD; no product render as fake interactive UI. Geometry deviations are listed in design-spec.md. |
| Icons and controls | Native outline icons, outlined buttons, mint sliders and switches; controls update real scene transforms/materials/visibility. |
| Responsive behavior | Phone navigation fits, canvas and controls stack, download icon remains visible, no horizontal overflow. |

Above-the-fold copy diff: core concept strings retained; live numeric values and Part visibility are intentional additions. The chrome was visually verified against the working design. Actual CAD geometry and simplified hardware envelopes are intentional deviations, so the model is not claimed as a pixel-identical copy of the concept product picture.

Functional coverage is recorded in viewer-qa.json: loading, pan/tilt, explosion, hardware, wireframe, per-part visibility, four view presets, reset, downloads, guide and mobile overflow. No page errors observed. Physical assembly validation remains outstanding.

## Two-sided revision

The owner's requested update adds an opposite 625 bearing support, 6 mm main arm and root braces. Rounded plan corners and small edge fillets soften the base, lid, arms, hood and cradle. Functional bearing seats, stock horn recesses and screw paths preserve fit geometry. The actual CAD and revised motion groups are used for the refreshed browser captures. The original concept remains a visual direction, not a manufacturing reference.
