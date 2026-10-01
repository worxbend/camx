"""Export additional mesh formats, build the guide, and create a portable archive."""
from pathlib import Path
import json,zipfile,hashlib,shutil
import trimesh,markdown
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'exports'
assert not (ROOT/"firmware/include/credentials.h").exists(), "Refusing public packaging with private credentials.h present; use a clean checkout with unconfigured firmware"
for path in sorted((out/'parts').glob('*.stl')):
 m=trimesh.load(path,force='mesh')
 for ext in ['obj','ply','off']:m.export(path.with_suffix('.'+ext))
from PIL import Image
for path in (out/'images').glob('*.png'):
 Image.open(path).convert('RGB').save(path.with_suffix('.tiff'),compression='tiff_lzw')
body=markdown.markdown((ROOT/'docs/assembly.md').read_text(encoding='utf-8'),extensions=['tables','fenced_code','toc']).replace('../exports/','../downloads/')
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CAMX — build guide</title><style>body{font:17px/1.7 system-ui;background:#0b1017;color:#d2dce4;margin:0}main{max-width:900px;margin:auto;padding:36px 24px}a{color:#a6e8cf}h1,h2,h3{color:#f6f8fa;line-height:1.25}h1{font-size:40px}h2{margin-top:48px}pre{background:#17232e;padding:20px;overflow:auto;border-radius:10px;font-size:14px}code{font-size:.9em}table{display:block;overflow:auto;border-collapse:collapse}td,th{padding:10px 14px;border-bottom:1px solid #293742;text-align:left}img{width:100%;border-radius:16px}.back{display:flex;gap:25px;margin-bottom:30px}strong{color:#fff}</style><main><div class="back"><a href="../index.html">← 3D studio</a><a href="../downloads/camx-files.zip" download>Download project files</a></div>'''+body+'</main></html>'
(ROOT/'docs/build.html').write_text(html.replace('structural-review.md','structural-review.html').replace('firmware-api.md','firmware-api.html'),encoding='utf-8')
review=markdown.markdown((ROOT/'docs/structural-review.md').read_text(),extensions=['tables','fenced_code'])
(ROOT/'docs/structural-review.html').write_text(html[:html.index('<h1')]+review+'</main></html>',encoding='utf-8')
api=markdown.markdown((ROOT/'docs/firmware-api.md').read_text(),extensions=['tables','fenced_code'])
(ROOT/'docs/firmware-api.html').write_text(html[:html.index('<h1')]+api+'</main></html>',encoding='utf-8')
# Add firmware artifacts to generated deliverables. Sources remain included in archive.
(out/'firmware').mkdir(exist_ok=True)
for name in ['firmware.bin','firmware.elf','bootloader.bin','partitions.bin']:
 shutil.copy2(ROOT/'firmware/.pio/build/esp32dev'/name,out/'firmware'/name)
# boot_app0 required for a clean flash with default Arduino partition layout.
boot_app=Path.home()/'.platformio/packages/framework-arduinoespressif32/tools/partitions/boot_app0.bin'
if boot_app.exists():shutil.copy2(boot_app,out/'firmware/boot_app0.bin')
(out/'firmware/README.txt').write_text('Prefer PlatformIO upload. For classic ESP32 / 4MB only:\npython -m esptool --chip esp32 --port YOUR_PORT write_flash 0x1000 bootloader.bin 0x8000 partitions.bin 0xe000 boot_app0.bin 0x10000 firmware.bin\nPublic binaries are Wi-Fi unconfigured. Copy firmware/include/credentials.example.h to credentials.h, set your credentials and token, then build locally. Never publish configured binaries. Never flash only firmware.bin at address zero. See docs/assembly.md for wiring and first startup.\n')
# Hash every generated file before assembling the archive. Do not recurse into prior archives.
files=[p for p in out.rglob('*') if p.is_file() and p.name not in ['camx-files.zip','checksums.sha256']]
checks=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(out))+'\n' for p in sorted(files))
(out/'checksums.sha256').write_text(checks)
with zipfile.ZipFile(out/'camx-files.zip','w',zipfile.ZIP_DEFLATED) as z:
 for folder in ['cad','firmware/include','firmware/src','docs','tools','tests','exports']:
  for p in (ROOT/folder).rglob('*'):
   if p.is_file() and p.name not in ['camx-files.zip','credentials.h'] and '__pycache__' not in p.parts:z.write(p,p.relative_to(ROOT))
 for n in ['README.md','requirements.txt','firmware/platformio.ini','.gitignore','.gitattributes']:
  if (ROOT/n).exists():z.write(ROOT/n,n)
 for p in (ROOT/'viewer').rglob('*'):
  if p.is_file() and not {'node_modules','dist','public','test-results','playwright-report'}.intersection(p.relative_to(ROOT/'viewer').parts):z.write(p,p.relative_to(ROOT))
 for p in (ROOT/'.github/workflows').glob('*.yml'):z.write(p,p.relative_to(ROOT))
print('Packaged',len(files),'exports:',out/'camx-files.zip')
