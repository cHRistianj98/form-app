"""Convert new generated catalog photographs to local WebP assets.
Run: python scripts/prepare-extra-food-images.py --food garlic source.png
"""
from pathlib import Path
import argparse,json,sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.cache/image-tools'))
from PIL import Image,ImageOps
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--food',action='append',nargs=2,required=True,metavar=('ID','SOURCE'))
args=parser.parse_args()
prompts=(ROOT/'scripts/additional-food-image-prompts.json').read_bytes()
spec={item['id']:item for item in json.loads(prompts)['images']}
out=ROOT/'public/foods'
credits=json.loads((out/'credits.json').read_text(encoding='utf-8'))
for key,source in args.food:
    if key not in spec:parser.error('Unknown product ID.')
    image=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    image.thumbnail((480,480),Image.Resampling.LANCZOS)
    target=out/f'{key}.webp'
    image.save(target,'WEBP',quality=85,method=6)
    credits[key]={'image':spec[key]['image'],'title':spec[key]['name'],
      'author':'Wygenerowano dla aplikacji Forma przy użyciu imagegen','license':'Grafika wygenerowana AI',
      'source':'/foods/additional-food-image-prompts.json','licenseUrl':'/foods/additional-food-image-prompts.json',
      'changes':'Zmniejszono do 480 px i skonwertowano do WebP. Grafika poglądowa, nie zdjęcie rzeczywistej porcji.'}
    print(f'{target.name}: {target.stat().st_size} bytes')
(out/'additional-food-image-prompts.json').write_bytes(prompts)
(out/'credits.json').write_text(json.dumps(credits,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
