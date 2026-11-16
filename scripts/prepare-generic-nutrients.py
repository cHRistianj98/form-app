"""Build the reviewed generic-food subset from official USDA SR Legacy CSV.

Run: python scripts/prepare-generic-nutrients.py [path/to/official.zip]
No third-party dependencies. The download is cached; app builds work offline.
"""
import csv
import hashlib
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip'
# Explicit matches, never name-based inference. Each Polish variant is shown in
# the UI so that raw/cooked, peel, salt and species assumptions remain visible.
MATCHES = {
    'egg': (171287, 'Jajko całe, surowe'),
    'onion': (170000, 'Cebula surowa'),
    'banana': (173944, 'Banan surowy, bez skórki'),
    'chicken': (171077, 'Pierś kurczaka surowa, bez skóry i kości'),
    'rice': (169756, 'Ryż biały długoziarnisty, suchy, niewzbogacany'),
    'ricec': (169757, 'Ryż biały długoziarnisty, ugotowany bez soli'),
    'potato': (170438, 'Miąższ ziemniaków gotowanych w skórce, bez soli'),
    'salmon': (175167, 'Łosoś atlantycki hodowlany, surowy'),
    'oats': (173904, 'Płatki owsiane suche, niewzbogacane'),
    'apple': (171688, 'Jabłko surowe ze skórką'),
    'wholebread': (172688, 'Chleb pełnoziarnisty pszenny; receptura ogólna USDA'),
    'milk': (172205, 'Mleko 2%, bez dodatku witamin A i D'),
    'olive': (171413, 'Oliwa z oliwek'),
    'butter': (173430, 'Masło bez dodatku soli'),
    'tomato': (170457, 'Pomidor czerwony, dojrzały, surowy'),
    'cucumber': (168409, 'Ogórek surowy ze skórką'),
    'lettuce': (169249, 'Sałata zielona liściasta, surowa'),
    'carrot': (170393, 'Marchew surowa'),
    'tuna': (171986, 'Tuńczyk jasny w wodzie, odsączony, bez dodatku soli'),
    'pasta': (168927, 'Makaron pszenny suchy, niewzbogacany'),
    'pastac': (168928, 'Makaron pszenny ugotowany bez soli, niewzbogacany'),
    'beef': (171796, 'Wołowina mielona surowa, 15% tłuszczu'),
    'peanut': (172470, 'Masło orzechowe gładkie, bez dodatku soli'),
    'walnut': (170187, 'Orzechy włoskie, część jadalna'),
    'orange': (169097, 'Pomarańcza surowa, bez skórki'),
    'strawberry': (167762, 'Truskawki surowe'),
    'broccoli': (170379, 'Brokuły surowe'),
    'eggwhite': (172183, 'Białko jaja surowe'),
    'yogurt': (171284, 'Jogurt naturalny z mleka pełnego'),
    'chocolate': (170273, 'Czekolada gorzka 70–85% kakao'),
    'ham': (168092, 'Szynka z indyka chuda; receptura ogólna USDA'),
    'cheese': (173414, 'Ser cheddar pełnotłusty'),
    'avocado': (171705, 'Awokado surowe, miąższ'),
    'kiwi': (168153, 'Kiwi zielone surowe, bez skórki'),
    'honey': (169640, 'Miód'),
    'oil': (172336, 'Olej rzepakowy niskoerukowy'),
    'cottage': (172179, 'Serek ziarnisty ze śmietanką, około 4% tłuszczu'),
}
# No adequate match in this dataset: do not substitute cottage cheese for
# Polish twarog, Greek yogurt for skyr, or fortified US kefir for Polish kefir.
# US white bread/rolls/tortillas contain fortification not stated by the user.
UNMATCHED = {
    'bread': 'Brak dopasowanej receptury niewzbogacanego chleba pszennego.',
    'roll': 'Brak dopasowanej receptury niewzbogacanej bułki pszennej.',
    'tortilla': 'Brak dopasowanej receptury niewzbogacanej tortilli pszennej.',
    'tw': 'Brak odpowiednika polskiego twarogu półtłustego.',
    'skyr': 'Brak ogólnego skyru naturalnego.',
    'kefir': 'Brak ogólnego kefiru 2% bez wzbogacania.',
}
# IDs and units from nutrient.csv. No kcal/macros are imported or recalculated.
FIELDS = {
    'fiber': (1079, 'G'), 'sugars': (2000, 'G'),
    'saturatedFat': (1258, 'G'), 'salt': (1093, 'MG'),
    'calcium': (1087, 'MG'), 'iron': (1089, 'MG'),
    'potassium': (1092, 'MG'), 'magnesium': (1090, 'MG'),
    'zinc': (1095, 'MG'),
    'vitaminC': (1162, 'MG'), 'vitaminD': (1114, 'UG'),
    'vitaminE': (1109, 'MG'), 'vitaminK': (1185, 'UG'),
    'b1': (1165, 'MG'), 'b2': (1166, 'MG'), 'b5': (1170, 'MG'),
    'b6': (1175, 'MG'), 'biotin': (1176, 'UG'),
    'folate': (1177, 'UG'), 'b12': (1178, 'UG'),
}


def main():
    archive_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '.cache/usda-sr-legacy-2018.zip'
    if not archive_path.exists():
        archive_path.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(URL, headers={'User-Agent': 'FormaNutri/1.0'})
        with urllib.request.urlopen(request, timeout=60) as response:
            archive_path.write_bytes(response.read())
    with zipfile.ZipFile(archive_path) as archive:
        def rows(filename):
            name = next(n for n in archive.namelist() if n.split('/')[-1] == filename)
            return csv.DictReader(io.TextIOWrapper(archive.open(name), encoding='utf-8-sig'))

        foods = {int(r['fdc_id']): r for r in rows('food.csv')}
        definitions = {int(r['id']): r for r in rows('nutrient.csv')}
        for field, (nutrient_id, unit) in FIELDS.items():
            assert definitions[nutrient_id]['unit_name'] == unit, field
        for nutrient_id in [1105, 1107, 1108, 1120]:
            assert definitions[nutrient_id]['unit_name'] == 'UG'
        assert definitions[1167]['unit_name'] == 'MG'  # niacin
        assert definitions[1210]['unit_name'] == 'G'   # tryptophan
        nutrients = {fdc_id: {} for fdc_id, _ in MATCHES.values()}
        for row in rows('food_nutrient.csv'):
            fdc_id = int(row['fdc_id'])
            if fdc_id in nutrients and row['amount'] != '':
                nutrients[fdc_id][int(row['nutrient_id'])] = float(row['amount'])

    result = {}
    for key, (fdc_id, variant) in MATCHES.items():
        raw = nutrients[fdc_id]
        # No vitamin-enriched source may accidentally enter this subset.
        assert raw.get(1186, 0) == 0, f'{key}: added folic acid'
        values = {}
        for field, (nutrient_id, _) in FIELDS.items():
            if nutrient_id in raw:
                amount = raw[nutrient_id]
                # EU salt equivalent = sodium * 2.5; mg sodium -> g salt.
                values[field] = round(amount * 2.5 / 1000, 6) if field == 'salt' else amount
        # EU retinol equivalents (RE), not US RAE or IU. Missing components
        # stay unknown; a rounded RAE=0 is not proof of absent carotenoids.
        components = [1105, 1107, 1108, 1120]
        if all(n in raw for n in components):
            values['vitaminA'] = round(raw[1105] + raw[1107]/6 + (raw[1108]+raw[1120])/12, 6)
        # Niacin equivalents include tryptophan (60 mg = 1 mg NE).
        # Without both components there is no complete NE estimate.
        if 1167 in raw and 1210 in raw:
            values['b3'] = round(raw[1167] + raw[1210]*1000/60, 6)
        result[f'base:{key}'] = {
            'fdcId': fdc_id,
            'description': foods[fdc_id]['description'],
            'variant': variant,
            'nutrients': values,
            'conversionInputs': {str(n): raw[n] for n in [1093, 1105, 1107, 1108, 1120, 1167, 1210] if n in raw},
        }

    output = {
        'dataset': 'USDA FoodData Central — SR Legacy, April 2018',
        'url': 'https://fdc.nal.usda.gov/download-datasets/',
        'downloadUrl': URL,
        'sha256': hashlib.sha256(archive_path.read_bytes()).hexdigest(),
        'basisQuantity': 100, 'unit': 'g',
        'foods': result,
        'unmatched': {f'base:{key}': reason for key, reason in UNMATCHED.items()},
    }
    destination = ROOT / 'src/genericFoodNutrients.json'
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(result)} generic foods; {sum(len(f["nutrients"]) for f in result.values())} source values.')


if __name__ == '__main__':
    main()
