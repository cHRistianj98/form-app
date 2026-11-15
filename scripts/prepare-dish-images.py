"""Convert generated dish illustrations to local WebP assets.
Usage: python scripts/prepare-dish-images.py soup.png pizza.png crepes.png
Requires Pillow; preserves the source images.
"""
from pathlib import Path
import sys
import json

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.cache/image-tools'))
from PIL import Image,ImageOps

if len(sys.argv)!=4: raise SystemExit(__doc__)
out=ROOT/'public/foods'
prompts=(ROOT/'scripts/dish-image-prompts.json').read_bytes()
(out/'dish-image-prompts.json').write_bytes(prompts)
credits_path=out/'credits.json'
credits=json.loads(credits_path.read_text(encoding='utf-8'))
for source,keys in zip(sys.argv[1:],[['rosol-noodles'],['italian-pizza'],['crepes-nutella','crepes-jam']]):
    image=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    image.thumbnail((480,480),Image.Resampling.LANCZOS)
    for key in keys:
        target=ROOT/f'public/foods/dish-{key}.webp'
        image.save(target,'WEBP',quality=85,method=6)
        credits[f'dish:{key}']={
            'image':f'/foods/dish-{key}.webp','title':f'Domowe danie: {key}',
            'author':'Wygenerowano dla aplikacji Forma przy użyciu imagegen',
            'license':'Grafika wygenerowana AI',
            'source':'/foods/dish-image-prompts.json','licenseUrl':'/foods/dish-image-prompts.json',
            'changes':'Zmniejszono do 480 px i skonwertowano do WebP. Grafika poglądowa, nie zdjęcie rzeczywistej porcji.',
        }
        print(f'{target.name}: {target.stat().st_size} bytes')
credits_path.write_text(json.dumps(credits,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
