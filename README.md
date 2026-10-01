# CAMX

A printable two-servo pan/tilt mechanism for an Anker PowerConf webcam, based on the owner's sketches (photos 7/8). ESP32-WROOM-32 DevKit, two positional SG90s, 5 V / 3 A supply, USB-C panel module and 1000 µF capacitor. Rounded graphite enclosure, curved amber camera cradle and a bearing-supported pan arm.

![Actual CAD assembly](exports/images/assembled.png)

**Prototype:** hardware dimensions are provisional; measure and print the fit coupon first. Camera mounts with a steel 1/4-20 screw. Tilt's single-side SG90 support needs a lightweight, balanced camera. No hardware has been flashed or physically tested.

- [Build and wiring guide](docs/assembly.md)
- [Workflow and decisions](docs/workflow.md)
- [CAD parameters](cad/parameters.json)
- [Interactive viewer source](viewer/)
- [Generated gallery](exports/index.html)
- [Complete downloadable bundle](exports/camx-files.zip)
- [Verification results](exports/validation.json)

## Rebuild

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pio run -d firmware
.venv/bin/python cad/model.py
.venv/bin/python tests/validate_cad.py
g++ -std=c++17 -Ifirmware/include tests/motion_test.cpp -o /tmp/camx-motion-test
/tmp/camx-motion-test
.venv/bin/python tools/diagrams.py
.venv/bin/python tools/package.py
cd viewer
npm ci
npm run build
npm run dev
```

CAD produces nine parts with STL/3MF/STEP/BREP/SVG/DXF, assembly STEP/BREP/GLB/glTF/3MF and print-layout 3MF. Packaging adds OBJ/PLY/OFF, TIFF and the ZIP bundle. Images include PNG/JPEG/WebP/SVG. CAD uses millimetres; GLB is metres with Y up (standard glTF conversion). STL/3MF mesh files are bed-aligned print poses; STEP/BREP preserve assembly coordinates. Vector projections are visual references, not manufacturing dimension drawings.

The viewer supports orbit/zoom, view presets, pan, tilt, exploded assembly, hardware visibility, wireframe and per-part hiding. It loads the real CAD GLB, runs offline after loading, and controls no physical motors. Build output contains all assets locally with no CDN dependence. Publish with the provided GitHub Actions workflow after selecting **GitHub Actions** in repository Settings → Pages. The source repository is `worxbend/camx`. GitHub Pages deployment runs through the included Actions workflow once Pages is enabled.

Firmware boots disarmed. Wi-Fi `CAMX-PanTilt`, default password `camx-setup-2026` (change in settings), control at `http://192.168.4.1`. GPIO18 pan, GPIO19 tilt, GPIO33 optional stop. Serial at 115200. See the guide for calibration and 5 V source isolation before flashing.

For polished WebGL stills, serve the viewer, run `node scripts/render-cad.mjs` from `viewer/`, then run `.venv/bin/python tools/image_formats.py` from the project root. The renderer uses Playwright Chromium (`npx playwright install chromium`) and `CAMX_QA_URL` optionally selects a preview URL. `node scripts/qa.mjs` checks viewer interactions. Matplotlib previews remain the default headless CAD-generation fallback.
