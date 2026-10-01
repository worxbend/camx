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
zip_files('camx-print-parts.zip',list((ROOT/'exports/parts').glob('*.stl'))+list((ROOT/'exports/parts').glob('*.3mf'))+[ROOT/'exports/assembly/print_layout.3mf',ROOT/'docs/assembly.md',ROOT/'exports/drawings/wiring.svg',ROOT/'exports/drawings/dimensions.svg'])
zip_files('camx-firmware.zip',list((ROOT/'exports/firmware').glob('*'))+list((ROOT/'firmware/src').glob('*'))+list((ROOT/'firmware/include').glob('*'))+[ROOT/'firmware/platformio.ini',ROOT/'docs/firmware-api.md',ROOT/'tests/http_test.cpp',ROOT/'docs/assembly.md',ROOT/'exports/drawings/wiring.svg'])
with zipfile.ZipFile(dest/'camx-viewer.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in (ROOT/'viewer/dist').rglob('*'):
  if p.is_file():z.write(p,p.relative_to(ROOT/'viewer/dist'))
(dest/'checksums.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(dest.glob('*.zip'))))
notes=f'''## 📷 CAMX — made to move

A symmetrical U-yoke ESP32 camera pan/tilt mechanism based on the owner's revised sketch, with matching rounded side shells, one tilt servo and one passive bearing side, with a build123d model and a browser 3D studio.

### 📦 Pick your download

- **camx-project.zip** — full source, CAD, firmware, drawings, previews and build guide.
- **camx-print-parts.zip** — thirteen printable parts in STL/3MF, plus the print layout and guide.
- **camx-firmware.zip** — PlatformIO source and compiled classic ESP32 binaries (Wi-Fi unconfigured; build locally with ignored credentials.h).
- **camx-viewer.zip** — ready-to-serve static website, including CAD downloads.
- **checksums.sha256** — verify all four archives.

### ✅ Build evidence

- ESP32 firmware compiled; motion and bounded HTTP/JSON parser checks passed. Station Wi-Fi, combined pan/tilt offsets, optional bearer token, connection-loss hold and isolated HTTP task.
- {validation['checks']} CAD, STL/3MF and sampled-clearance checks passed.
- Desktop/mobile WebGL interactions, part visibility, view presets, downloads and guide checked with Playwright.

### 🧪 Prototype status

Hardware dimensions are provisional. Print the fit coupon first, balance the camera, and check your actual servo horns/USB module/capacitor. Requires a 6805 pan bearing and a 625 opposite tilt bearing. No physical fit, load or motor testing is claimed. The public viewer simulates the CAD and does not control motors.

Live studio: https://worxbend.github.io/camx/
'''
(dest/'RELEASE_NOTES.md').write_text(notes,encoding='utf-8')
print('Release packages:',', '.join(p.name for p in sorted(dest.iterdir())))
