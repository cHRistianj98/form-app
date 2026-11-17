"""Convert generated meal artwork to small app-local WebP thumbnails.

Run: python scripts/prepare-meal-images.py breakfast.png lunch.png dinner.png
Requires Pillow. The source files are preserved.
"""
from pathlib import Path
import sys
import argparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache/image-tools'))
from PIL import Image, ImageOps

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('sources',nargs='*')
parser.add_argument('--snack')
args=parser.parse_args()
if args.sources and len(args.sources)!=3:parser.error('Provide breakfast, lunch and dinner sources together.')
jobs=list(zip(['breakfast','lunch','dinner'],args.sources))
if args.snack:jobs.append(('snack',args.snack))
if not jobs:parser.error('Provide the three meal images or --snack SOURCE.')
out = ROOT / 'public/meals'
out.mkdir(parents=True, exist_ok=True)
for key, source in jobs:
    image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    image.thumbnail((320, 320), Image.Resampling.LANCZOS)
    destination = out / f'{key}.webp'
    image.save(destination, 'WEBP', quality=86, method=6)
    print(f'{key}: {image.size}, {destination.stat().st_size} bytes')
