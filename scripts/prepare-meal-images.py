"""Convert generated meal artwork to small app-local WebP thumbnails.

Run: python scripts/prepare-meal-images.py breakfast.png lunch.png dinner.png
Requires Pillow. The source files are preserved.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache/image-tools'))
from PIL import Image, ImageOps

if len(sys.argv) != 4:
    raise SystemExit(__doc__)
out = ROOT / 'public/meals'
out.mkdir(parents=True, exist_ok=True)
for key, source in zip(['breakfast', 'lunch', 'dinner'], sys.argv[1:]):
    image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    image.thumbnail((320, 320), Image.Resampling.LANCZOS)
    destination = out / f'{key}.webp'
    image.save(destination, 'WEBP', quality=86, method=6)
    print(f'{key}: {image.size}, {destination.stat().st_size} bytes')
