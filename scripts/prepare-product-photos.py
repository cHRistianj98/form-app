"""Download product packshots and save local WebP assets. Requires Pillow.

Nutrition values remain in src/favoriteFoods.js, sourced from the user's table.
Run manually; the app build never depends on these external image services.
"""
import concurrent.futures
import io
import json
from pathlib import Path
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache' / 'image-tools'))
from PIL import Image, ImageOps

OUT = ROOT / 'public' / 'foods'
OUT.mkdir(parents=True, exist_ok=True)
sources = json.loads((ROOT / 'scripts' / 'product-photo-sources.json').read_text(encoding='utf-8'))
credits_path = OUT / 'credits.json'
credits = json.loads(credits_path.read_text(encoding='utf-8')) if credits_path.exists() else {}

def download(pair):
    key, source = pair
    filename = 'fav-' + key + '.webp'
    if '--missing' in sys.argv and (OUT / filename).exists() and 'fav-' + key in credits:
        return 'fav-' + key, credits['fav-' + key]
    for attempt in range(3):
        try:
            if source.get('localPath'):
                data = (ROOT / source['localPath']).read_bytes()
                break
            request = urllib.request.Request(source['url'], headers={
                'User-Agent': 'FormaNutri/1.0 (personal food diary; product photography)',
            })
            with urllib.request.urlopen(request, timeout=30) as response:
                data = response.read()
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    photo = ImageOps.exif_transpose(Image.open(io.BytesIO(data)))
    photo = photo.convert('RGBA' if photo.mode in ('RGBA', 'LA', 'P') else 'RGB')
    photo.thumbnail((480, 480), Image.Resampling.LANCZOS)
    photo.save(OUT / filename, 'WEBP', quality=86, method=6)
    print(filename + ': ' + str(photo.size), flush=True)
    return 'fav-' + key, {
        'image': '/foods/' + filename, 'title': source['title'], 'author': source['author'],
        'source': source['source'], 'license': source['license'],
        'licenseUrl': source.get('licenseUrl', ''),
        'changes': 'Resized and converted to WebP. Original aspect ratio preserved.',
    }

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    photos = dict(pool.map(download, sources.items()))
credits.update(photos)
credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Saved ' + str(len(photos)) + ' product packshots.', flush=True)
