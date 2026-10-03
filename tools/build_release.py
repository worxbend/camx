"""Package self-contained GitHub release downloads from validated build outputs."""
from pathlib import Path
import hashlib,json,shutil,zipfile
ROOT=Path(__file__).resolve().parents[1];dest=ROOT/'release';dest.mkdir(exist_ok=True)
assert not (ROOT/"firmware/include/credentials.h").exists(), "Refusing public packaging with private credentials.h present; use a clean checkout with unconfigured firmware"
validation=json.loads((ROOT/'exports/validation.json').read_text())
qa=json.loads((ROOT/'docs/design/viewer-qa.json').read_text())
assert validation['passed'] and qa['passed'],'Refusing to package a failed build'
shutil.copy2(ROOT/'exports/camx-files.zip',dest/'camx-project.zip')
def zip_files(name,files):
 with zipfile.ZipFile(dest/name,'w',zipfile.ZIP_DEFLATED) as z:
  for p in files:
   if p.is_file() and p.name!='credentials.h':z.write(p,p.relative_to(ROOT))
zip_files('camx-print-parts.zip',list((ROOT/'exports/parts').glob('*.stl'))+list((ROOT/'exports/parts').glob('*.3mf'))+list((ROOT/'exports/fasteners').glob('*'))+[ROOT/'exports/assembly/print_layout.3mf',ROOT/'docs/assembly.md',ROOT/'exports/drawings/wiring.svg',ROOT/'exports/drawings/dimensions.svg'])
zip_files('camx-firmware.zip',list((ROOT/'exports/firmware').glob('*'))+list((ROOT/'firmware/src').glob('*'))+list((ROOT/'firmware/include').glob('*'))+list((ROOT/'firmware/lib').rglob('*'))+[ROOT/'firmware/platformio.ini',ROOT/'docs/firmware-api.md',ROOT/'docs/control-client.md',ROOT/'docs/jog-design.md',ROOT/'tests/motion_test.cpp',ROOT/'tools/test_motion.py',ROOT/'tests/http_test.cpp',ROOT/'docs/assembly.md',ROOT/'exports/drawings/wiring.svg'])
with zipfile.ZipFile(dest/'camx-viewer.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in (ROOT/'viewer/dist').rglob('*'):
  if p.is_file():z.write(p,p.relative_to(ROOT/'viewer/dist'))
with zipfile.ZipFile(dest/'camx-control.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in (ROOT/'client/dist').rglob('*'):
  if p.is_file():z.write(p,p.relative_to(ROOT/'client/dist'))
 # A dependency-free localhost server beside the extracted static files.
 bridge=(ROOT/'tools/serve_control.mjs').read_text().replace("new URL('../client/dist/',import.meta.url)","new URL('./',import.meta.url)")
 z.writestr('serve.mjs',bridge)
 z.writestr('README.md',"# CAMX Control\n\nRun `CAMX_DEVICE_URL=http://DEVICE_IP node serve.mjs`, then open http://127.0.0.1:4175/control/ . For a safe demo run `node serve.mjs` and open http://127.0.0.1:4175/control/?demo=1 . Node 24 recommended. No npm dependencies are needed for this built client. Use the source project to rebuild or upload the LittleFS image.\n\n"+(ROOT/'docs/control-client.md').read_text())
(dest/'checksums.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(dest.glob('*.zip'))))
notes=f'''## 📷 CAMX — made to move

A symmetrical U-yoke ESP32 camera pan/tilt mechanism based on the owner's revised sketch, with matching rounded side shells, one tilt servo and one passive bearing side, with a build123d model and a browser 3D studio.

### 📦 Pick your download

- **camx-project.zip** — full source, CAD, firmware, drawings, previews and build guide.
- **camx-print-parts.zip** — thirteen printable parts in STL/3MF, plus the print layout and guide.
- **camx-firmware.zip** — PlatformIO source and compiled classic ESP32 binaries and matching LittleFS client image (Wi-Fi unconfigured; build locally with ignored credentials.h).
- **camx-viewer.zip** — ready-to-serve static website, including CAD downloads and the control demo.
- **camx-control.zip** — built SolidJS 2 control app with a dependency-free local LAN bridge.
- **checksums.sha256** — verify all five archives.

### ✅ Build evidence

- ESP32 firmware compiled; motion and bounded HTTP/JSON parser checks passed. Jerk-limited S-curves synchronize pan/tilt, preserve velocity and acceleration during retargeting, and check full-path position extrema before accepting motion. Normal jog release brakes smoothly; safety STOP immediately holds. Epoch/sequence fencing rejects stale packets. Endless station Wi-Fi retry, combined offsets, authenticated disarmed calibration, explicit heartbeat lease, connection-loss hold and isolated HTTP task.
- SolidJS 2 rc.13 client built; transport/storage/browser and local bridge tests passed. Press-and-hold remote, 100 ms rate refresh, 500 ms jog timeout, pointer/keyboard cancellation, presets, calibration wizard, mobile controls, import/export, privacy and no-auto-ARM reconnect verified with simulated devices.
- {validation['checks']} CAD, STL/3MF and sampled-clearance checks passed.
- Desktop/mobile WebGL interactions, part visibility, view presets, downloads and guide checked with Playwright.

### 🔌 Corrected USB flange size

The owner-confirmed exterior plate is 21 × 8 mm. Its pocket is 21.6 × 8.6 mm with 0.3 mm clearance per side. The separate body opening is provisionally 16.6 × 6 mm. The owner-confirmed mounting pitch is 15 mm centre-to-centre. Hole diameter remains provisionally 3.2 mm; measure before printing. The fit coupon, dimension sheet and exports match.

### 🧵 Tilt-servo cable routing

Rear pivot-shell exit, integral arm tie eyes, a through-notch in the rotating platform, and a separate rear base entry provide a documented three-wire lead route. A neutral-only orange cable guide appears in the viewer; it hides during motion/explosion because cable deformation is not simulated. Verify actual connector fit, extension length and freedom from pinching across full travel.

### 📐 Compact mechanical redesign

100 × 82 × 38 mm base (53% smaller footprint, 55% less bounding-box volume), Ø92 mm pan platform and shallow lower arm shells. Default camera fit is the 55 × 51 × 41 mm PowerConf C200 envelope; exact model and folded-clip fit remain unconfirmed. The existing ESP32, both SG90 servos, USB-C module and capacitor are retained. Verify stability, cable clearance, RF performance and actual component fit on the bench.

### 🔩 Short cover screws

Both symmetrical arm covers now use M2 × 8 mm screws into four integral standoffs per side, replacing the former M2 × 30 mm screws. The arm CAD, printable exports and assembly guide match. Verify printed pilot fit and screw-head height before tightening.

### 🔌 Recessed USB-C mounting

The exterior USB-C flange now sits 0.2 mm below the right wall in a measured-fit pocket, with 3 mm reinforced backing. Its PCB remains inside; the fit coupon, hardware model and mounting guide match this change. Confirm actual module dimensions, plug seating and screw-head clearance before printing.

### 🔎 Final audit

Release cleanup handles sequence exhaustion without escaping UI handlers; new presets capture the latest commanded position after braking. JSON schema scanners enforce standard whitespace. Absolute moves synchronize arrival; jogging runs axes independently. Position readouts remain commanded estimates: standard SG90 servos do not expose measured position.

Known unresolved item: the Python CAD/image toolchain pins Pillow 12.2.0 and has 13 GitHub security alerts. The patched 12.3.0 conflicts with the current upstream threejs-materials dependency cap; a compatible upstream update or reviewed fork is still needed. This dependency is not used by the ESP32 or browser runtime. Hardware fit, power/current headroom, runtime stack/heap margins, wireless recovery and loaded servo behavior still require bench qualification.

### 🧪 Prototype status

Hardware dimensions are provisional. Print the fit coupon first, balance the camera, and check your actual servo horns/USB module/capacitor. Requires a 6805 pan bearing and a 625 opposite tilt bearing. No physical fit, load or motor testing is claimed. The public viewer simulates the CAD and does not control motors.

Live studio: https://worxbend.github.io/camx/
Control demo: https://worxbend.github.io/camx/control/?demo=1
Real control: upload the matching LittleFS image and open http://DEVICE_IP/control/, or use the local bridge.
'''
(dest/'RELEASE_NOTES.md').write_text(notes,encoding='utf-8')
print('Release packages:',', '.join(p.name for p in sorted(dest.iterdir())))
