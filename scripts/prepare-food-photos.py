"""Download attributed Wikimedia photos and produce small, local WebP assets.

Requires Pillow (python -m pip install Pillow). Run from the project root.
The attribution JSON is shipped with the app; no runtime image service is needed.
"""
import concurrent.futures
import html
import io
import json
from pathlib import Path
import re
import sys
import time
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache' / 'image-tools'))
from PIL import Image, ImageOps

OUT = ROOT / 'public' / 'foods'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = json.loads((ROOT / 'scripts' / 'food-photo-sources.json').read_text(encoding='utf-8'))

def request(url, binary=False):
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'FormaNutri/1.0 (personal food diary; Wikimedia photo attribution)'})
            with urllib.request.urlopen(req, timeout=35) as response:
                data = response.read()
            return data if binary else json.loads(data)
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)

def wiki(host, **params):
    return request('https://' + host + '/w/api.php?' + urllib.parse.urlencode({'format': 'json', 'action': 'query', **params}))

def plain(value):
    return html.unescape(re.sub('<[^>]+>', '', value or '')).strip()

metadata = wiki('commons.wikimedia.org', prop='imageinfo', iiprop='extmetadata|url', iiurlwidth=480,
                titles='|'.join('File:' + filename for filename in SOURCES.values()))
files = {p['title'][5:].replace('_', ' '): p for p in metadata['query']['pages'].values()}
chosen = {key: {'file': filename} for key, filename in SOURCES.items()}

def download(pair):
    key, item = pair
    info = files[item['file'].replace('_', ' ')]['imageinfo'][0]
    meta = info.get('extmetadata', {})
    field = lambda key: plain(meta.get(key, {}).get('value', ''))
    license_name = field('LicenseShortName')
    if not license_name:
        raise RuntimeError('Missing license: ' + item['file'])
    image = Image.open(io.BytesIO(request(info.get('thumburl', info['url']).split('?')[0], binary=True)))
    image = ImageOps.exif_transpose(image).convert('RGB')
    image.thumbnail((480, 480), Image.Resampling.LANCZOS)
    image.save(OUT / (key + '.webp'), 'WEBP', quality=82, method=6)
    print(key + ': ' + item['file'] + ' [' + license_name + ']', flush=True)
    return key, {'image': '/foods/' + key + '.webp', 'title': item['file'],
                 'author': field('Artist') or field('Credit') or 'Autor niepodany; źródło: Wikimedia Commons', 'license': license_name,
                 'licenseUrl': field('LicenseUrl'), 'source': info['descriptionurl'],
                 'changes': 'Resized and converted to WebP; cropped in the interface.'}

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    photos = dict(pool.map(download, chosen.items()))
if any(photo['license'].startswith('GFDL') for photo in photos.values()):
    license_text = request('https://www.gnu.org/licenses/old-licenses/fdl-1.2.txt', binary=True)
    (OUT / 'GFDL-1.2.txt').write_bytes(license_text)
    for photo in photos.values():
        if photo['license'].startswith('GFDL'):
            photo['licenseUrl'] = '/foods/GFDL-1.2.txt'
(OUT / 'credits.json').write_text(json.dumps(photos, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Saved ' + str(len(photos)) + ' attributed WebP photographs.', flush=True)
