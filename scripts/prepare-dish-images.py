"""Convert generated dish illustrations to local WebP assets.
Usage: python scripts/prepare-dish-images.py soup.png pizza.png crepes.png
       python scripts/prepare-dish-images.py --dish cocoa-crumble-cheesecake cheesecake.png --dish tomato-soup-noodles soup.png
Requires Pillow; preserves the source images.
"""
from pathlib import Path
import sys
import json
import argparse

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.cache/image-tools'))
from PIL import Image,ImageOps

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('sources',nargs='*',help='Original three images: broth, pizza and crepes')
parser.add_argument('--dish',action='append',nargs=2,metavar=('ID','SOURCE'),default=[])
args=parser.parse_args()
if args.sources and len(args.sources)!=3: parser.error('Provide the original three images or use --dish ID SOURCE.')
jobs=list(zip(args.sources,[['rosol-noodles'],['italian-pizza'],['crepes-nutella','crepes-jam']]))
jobs.extend((source,[key]) for key,source in args.dish)
if not jobs: parser.error('Provide images to convert.')
out=ROOT/'public/foods'
prompts=(ROOT/'scripts/dish-image-prompts.json').read_bytes()
known={file.removeprefix('/foods/dish-').removesuffix('.webp') for row in json.loads(prompts)['images'] for file in row['files']}
for source,keys in jobs:
    if not set(keys)<=known: parser.error('Dish ID must be listed in dish-image-prompts.json.')
    if not Path(source).is_file(): parser.error(f'Image does not exist: {source}')
(out/'dish-image-prompts.json').write_bytes(prompts)
credits_path=out/'credits.json'
credits=json.loads(credits_path.read_text(encoding='utf-8'))
for source,keys in jobs:
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
