from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'exports'
for name in ['assembled','rear','structure','exploded']:
 path=out/'images'/name
 im=Image.open(path.with_suffix('.png')).convert('RGB')
 im.save(path.with_suffix('.jpg'),quality=94);im.save(path.with_suffix('.webp'),quality=94);im.save(path.with_suffix('.tiff'),compression='tiff_lzw')
