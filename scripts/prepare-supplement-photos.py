"""Download the six product packshots and export local 480px WebP files.
Uses real manufacturer images. Requires Pillow; network access only when run.
"""
from pathlib import Path
from html.parser import HTMLParser
import html
import io
import json
import re
import sys
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.cache/image-tools'))
from PIL import Image,ImageOps,ImageChops

class ProductImage(HTMLParser):
    def __init__(self):
        super().__init__();self.url=None
    def handle_starttag(self,tag,attrs):
        row=dict(attrs)
        if tag=='meta' and row.get('property')=='og:image':self.url=row.get('content')

def fetch(url):
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'*/*'})
    return urllib.request.urlopen(request,timeout=35).read()

sources=json.loads((ROOT/'scripts/supplement-photo-sources.json').read_text(encoding='utf-8'))
credits_path=ROOT/'public/foods/credits.json'
credits=json.loads(credits_path.read_text(encoding='utf-8'))
cache=ROOT/'.cache/supplement-photos';cache.mkdir(parents=True,exist_ok=True)
for key,source in sources.items():
    original=cache/f'{key}.image'
    if not source.get('image'):
        page=fetch(source['page']).decode('utf-8')
        parser=ProductImage();parser.feed(page)
        # Essensey's og:image may point at the last promotional gallery slide.
        # The Product JSON-LD identifies the front packshot instead.
        product=re.search(r'"image"\s*:\s*"(https:[^"]+)"',page)
        image_url=product[1] if product else parser.url
        if not image_url:raise RuntimeError(f'No packshot for {key}')
        source['image']=html.unescape(image_url)
    source_marker=cache/f'{key}.url'
    if not original.exists() or not source_marker.exists() or source_marker.read_text(encoding='utf-8')!=source['image']:
        original.write_bytes(fetch(source['image']))
        source_marker.write_text(source['image'],encoding='utf-8')
    image=ImageOps.exif_transpose(Image.open(io.BytesIO(original.read_bytes()))).convert('RGBA')
    white=Image.new('RGBA',image.size,'white')
    white.alpha_composite(image)
    rgb=white.convert('RGB')
    difference=ImageChops.difference(rgb,Image.new('RGB',rgb.size,'white')).convert('L').point(lambda value:255 if value>18 else 0)
    bounds=difference.getbbox()
    if bounds:image=image.crop(bounds)
    image.thumbnail((440,440),Image.Resampling.LANCZOS)
    canvas=Image.new('RGB',(480,480),'white')
    canvas.paste(image,((480-image.width)//2,(480-image.height)//2),image)
    filename=f'supp-{key}.webp'
    target=ROOT/'public/foods'/filename
    canvas.save(target,'WEBP',quality=87,method=6)
    credits[f'supplement:{key}']={
        'image':'/foods/'+filename,'title':source['name'],'author':source['author'],
        'license':'Zdjęcie producenta — prawa zastrzeżone; identyfikacja produktu w prywatnym dzienniku.',
        'source':source['page'],'licenseUrl':source['page'],
        'changes':'Wycentrowano opakowanie na białym tle 480 × 480 px i zapisano jako WebP. Opakowanie może różnić się wersją etykiety.',
    }
    print(filename,target.stat().st_size,'bytes')
    (ROOT/'scripts/supplement-photo-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    credits_path.write_text(json.dumps(credits,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
