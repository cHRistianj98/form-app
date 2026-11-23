"""Extract generic recipe ingredients from the official USDA SR Legacy ZIP.
Run after prepare-generic-nutrients.py (uses its cached official archive).
"""
import csv
import io
import json
from pathlib import Path
import runpy
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FIELDS = runpy.run_path(str(ROOT/'scripts/prepare-generic-nutrients.py'))['FIELDS']
MATCHES = {
    'stock':172884, 'noodles':169762, 'flour':169761, 'mozzarella':170845,
    'salami':174582, 'yeast':175042, 'sugar':169655, 'jam':169641,
    'cocoa':169593, 'cornstarch':169698, 'eggYolk':172184,
    'bakingPowder':172804, 'tomatoPuree':170460, 'garlic':169230,
    'parsley':170416, 'basil':171317, 'oregano':171328, 'pepper':170931,
    'chickenRoasted':171477, 'mushroomsCooked':169252,
    'garlicPowder':171325, 'paprika':171329,
    'blackTeaBrewed':173227, 'lemon':167746, 'orange':169097, 'ginger':169231,
    'hazelnutSpread':168000, 'proteinFortifiedMilk':171271, 'alcoholFreeWine':174157,
    'salmonBaked':175168, 'milkWhole':172217, 'powderedSugar':169656,
}
with zipfile.ZipFile(ROOT/'.cache/usda-sr-legacy-2018.zip') as archive:
    def rows(filename):
        name=next(n for n in archive.namelist() if n.split('/')[-1]==filename)
        return csv.DictReader(io.TextIOWrapper(archive.open(name),encoding='utf-8-sig'))
    descriptions={int(r['fdc_id']):r['description'] for r in rows('food.csv')}
    nutrients={n:{} for n in MATCHES.values()}
    for row in rows('food_nutrient.csv'):
        fdc_id=int(row['fdc_id'])
        if fdc_id in nutrients and row['amount']!='':
            nutrients[fdc_id][int(row['nutrient_id'])]=float(row['amount'])
result={}
for key,fdc_id in MATCHES.items():
    raw=nutrients[fdc_id]
    assert raw.get(1186,0)==0, key  # No added folic acid.
    mapping={'kcal':1008,'protein':1003,'carbs':1005,'fat':1004,
             **{field:n for field,(n,unit) in FIELDS.items()}}
    values={field:raw[n] for field,n in mapping.items() if n in raw}
    if 'salt' in values: values['salt']=round(values['salt']*2.5/1000,6)
    if all(n in raw for n in [1105,1107,1108,1120]):
        values['vitaminA']=round(raw[1105]+raw[1107]/6+(raw[1108]+raw[1120])/12,6)
    partial=[]
    if 1167 in raw and 1210 in raw:
        values['b3']=round(raw[1167]+raw[1210]*1000/60,6)
    elif 1167 in raw:
        values['b3']=raw[1167]
        partial.append('b3')  # Known niacin, missing tryptophan contribution to NE.
    result[key]={'fdcId':fdc_id,'description':descriptions[fdc_id],
                 'url':f'https://fdc.nal.usda.gov/food-details/{fdc_id}/nutrients','nutrients':values,'partialNutrients':partial}
(ROOT/'src/dishIngredients.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Prepared {len(result)} reviewed recipe ingredients.')
