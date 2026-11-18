"""Prepare six explicit generic-food estimates from official composition tables.

Download DTU Frida 6.1 (CC BY 4.0) from https://doi.org/10.11583/DTU.32312844
to .cache/frida-6.1.xlsx, then run this script. Uses only Python's standard library.
Existing USDA data and recorded calories/macros are not rewritten.
"""
from pathlib import Path
from xml.etree import ElementTree as ET
import hashlib
import json
import zipfile

ROOT=Path(__file__).resolve().parents[1]
FRIDA_URL='https://doi.org/10.11583/DTU.32312844'
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
COLUMNS={'fiber':'N','salt':'Q','vitaminA':'U','vitaminD':'Y','vitaminE':'AD','vitaminK':'AJ',
 'b1':'AT','b2':'AV','b3':'AW','b6':'AY','b5':'AZ','biotin':'BA','folate':'BB','b12':'BD',
 'vitaminC':'BE','potassium':'BI','calcium':'BJ','magnesium':'BK','iron':'BM','zinc':'BO','selenium':'BT',
 'sugars':'CT','saturatedFat':'FZ'}

FAVORITE_FRIDA = {
    'piatnica-cream-18': (671, 'Śmietana fermentowana 18%'),
    'hochland-gouda': (1227, 'Ser topiony o zbliżonej zawartości tłuszczu'),
    'lidl-protein-cheese': (1211, 'Ser dojrzewający o obniżonej zawartości tłuszczu'),
    'lidl-protein-cup': (1693, 'Skyr naturalny 0,2%'),
    'laciate-milk-32': (6, 'Mleko pełne 3,5%'),
    'lidl-turkey-breast': (729, 'Wędlina z piersi indyka (gotowana lub wędzona)'),
    'vanilla-aerosol-cream': (1174, 'Śmietanka do ubijania 38% jako składnik śmietanki słodzonej'),
    'lidl-aerosol-cream': (1174, 'Śmietanka do ubijania 38% jako składnik śmietanki słodzonej'),
}

def extract_frida(path):
    with zipfile.ZipFile(path) as book:
        strings=[''.join(node.itertext()) for node in ET.fromstring(book.read('xl/sharedStrings.xml')).findall('s:si',NS)]
        result={}
        wanted={861,956,307,874,1153,1693}|{source_id for source_id,_ in FAVORITE_FRIDA.values()}
        with book.open('xl/worksheets/sheet2.xml') as stream:
            for _,row in ET.iterparse(stream,events=['end']):
                if row.tag!=f'{{{NS["s"]}}}row':continue
                values={}
                for cell in row.findall('s:c',NS):
                    value=cell.find('s:v',NS)
                    if value is not None:values[cell.attrib['r'].rstrip('0123456789')]=strings[int(value.text)] if cell.attrib.get('t')=='s' else value.text
                if values.get('C')=='→Unit':
                    assert values[COLUMNS['selenium']]=='µg/100g'
                if values.get('C','').isdigit() and int(values['C']) in wanted:
                    result[int(values['C'])]={'name':values['B'],'fat':float(values['O']),
                      'nutrients':{key:float(values[col]) for key,col in COLUMNS.items() if col in values}}
                row.clear()
        assert set(result)==wanted
        assert result[1693]['name']=='Skyr, 0.2 % fat'
        assert result[861]['name']=='Bread, white'
        assert result[956]['name']=='Bread, white, roll'
        return result

def main():
    path=ROOT/'.cache/frida-6.1.xlsx'
    records=extract_frida(path)
    def record(ids,variant,method,nutrients):
        return {'sourceName':'DTU Frida 6.1','sourceUrl':FRIDA_URL,'sourceIds':ids,
          'variant':variant,'method':method,'nutrients':{key:round(value,6) for key,value in nutrients.items()}}
    foods={}
    for key,source_id,variant in [('bread',861,'Chleb pszenny biały; receptura ogólna DTU'),
      ('roll',956,'Bułka pszenna biała; receptura ogólna DTU'),('skyr',1693,'Skyr naturalny, 0,2% tłuszczu')]:
        foods[f'base:{key}']=record([source_id],variant,'Szacunek z tabel na 100 g produktu. Wariant i receptura mogą zmieniać skład.',records[source_id]['nutrients'])

    lean,full=records[307],records[874]
    ratio=(4.7-lean['fat'])/(full['fat']-lean['fat'])
    quark={key:lean['nutrients'][key]*(1-ratio)+full['nutrients'][key]*ratio for key in lean['nutrients'] if key in full['nutrients']}
    foods['base:tw']=record([307,874],'Twaróg półtłusty; przybliżenie serem quark do 4,7% tłuszczu',
      'Mikroskładniki interpolowano między chudym i tłustym quarkiem z tabel DTU. To orientacyjny odpowiednik polskiego twarogu, nie analiza jego receptury. Wcześniejsze wartości, w tym wapń 90 mg, pozostają zachowane.',quark)
    kefir=records[1153]['nutrients'].copy()
    for key in ['vitaminA','vitaminD','vitaminE','saturatedFat']:kefir[key]*=2/records[1153]['fat']
    foods['base:kefir']=record([1153],'Kefir naturalny 2%; przybliżenie tabelą kefiru 1,5%',
      'Minerały i witaminy rozpuszczalne w wodzie z ogólnego kefiru DTU. Witaminy A, D, E i nasycone oszacowano proporcjonalnie do 2% tłuszczu.',kefir)

    # Flour tortillas in SR Legacy use enriched flour. Estimate an unfortified
    # homemade variant instead, preserving the app's existing 100 g macros.
    ingredients=json.loads((ROOT/'src/dishIngredients.json').read_text(encoding='utf-8'))
    usda=json.loads((ROOT/'src/genericFoodNutrients.json').read_text(encoding='utf-8'))
    flour=ingredients['flour']['nutrients'];oil=usda['foods']['base:oil']['nutrients']
    tortilla={key:flour[key]*.7+oil[key]*.06 for key in COLUMNS if flour.get(key) is not None and oil.get(key) is not None}
    tortilla['salt']=flour.get('salt',0)*.7+oil.get('salt',0)*.06+.8
    foods['base:tortilla']={'sourceName':'USDA — szacunek z niewzbogacanej mąki i oleju',
      'sourceUrl':ingredients['flour']['url'],'sourceIds':[ingredients['flour']['fdcId'],usda['foods']['base:oil']['fdcId']],
      'variant':'Tortilla pszenna; orientacyjna receptura z mąki niewzbogacanej',
      'method':'Na 100 g gotowego placka przyjęto 70 g mąki niewzbogacanej, 6 g oleju rzepakowego, 0,8 g soli i 23,2 g wody. Bez korekty strat witamin. To szacunek typowej receptury, nie etykieta konkretnej tortilli; kalorie i makro pozostają dotychczasowe.',
      'sources':[{'name':'Mąka pszenna niewzbogacana USDA','url':ingredients['flour']['url']},
        {'name':'Olej rzepakowy USDA','url':f'https://fdc.nal.usda.gov/food-details/{usda["foods"]["base:oil"]["fdcId"]}/nutrients'}],
      'nutrients':{key:round(value,6) for key,value in tortilla.items()}}

    # These are selenium-only estimates for selected labelled products. The
    # original label values stay authoritative. Convert milk mass to volume.
    favorite_selenium={}
    def favorite(key,unit,value,variant,url):
        favorite_selenium[f'favorite:{key}']={'unit':unit,'value':round(value,6),'variant':variant,'url':url}

    for key,(source_id,variant) in FAVORITE_FRIDA.items():
        value=records[source_id]['nutrients']['selenium']
        unit='g'
        if key=='laciate-milk-32':
            unit='ml'
            value*=1.03
            variant+=' (1,03 g/ml)'
        if key in ('vanilla-aerosol-cream','lidl-aerosol-cream'):
            fat=21 if key=='vanilla-aerosol-cream' else 27.7
            value*=fat/records[source_id]['fat']
            variant+='; ilość śmietanki oszacowana z tłuszczu na etykiecie'
        favorite(key,unit,value,variant,FRIDA_URL)

    for key,base,variant in [('laciate-butter','butter','Masło niesolone'),('alesto-walnuts','walnut','Orzechy włoskie')]:
        item=usda['foods'][f'base:{base}']
        favorite(key,'g',item['nutrients']['selenium'],variant,f'https://fdc.nal.usda.gov/food-details/{item["fdcId"]}/nutrients')
    for key,source_key,unit,density,variant in [
        ('basia-pizza-flour','flour','g',1,'Mąka pszenna niewzbogacana'),
        ('reduced-fat-cocoa','cocoa','g',1,'Kakao niesłodzone w proszku'),
        ('mutti-pizza-sauce','tomatoPuree','g',1,'Przecier pomidorowy'),
        ('lidl-protein-milk','proteinFortifiedMilk','ml',1.03,'Mleko odtłuszczone wzbogacone białkiem (1,03 g/ml)'),
        ('cincin-rose-zero','alcoholFreeWine','ml',1,'Wino bezalkoholowe (przyjęto 1 g/ml)'),
    ]:
        item=ingredients[source_key]
        favorite(key,unit,item['nutrients']['selenium']*density,variant,item['url'])
    out={'dataset':'Uzupełniające szacunki ogólnych produktów — DTU Frida 6.1 i USDA',
      'basisQuantity':100,'unit':'g','verifiedAt':'2026-11-17',
      'frida':{'name':'The Danish Food Composition Database, version 6.1','author':'DTU National Food Institute',
        'url':FRIDA_URL,'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
        'sha256':hashlib.sha256(path.read_bytes()).hexdigest()},'foods':foods,'favoriteSelenium':favorite_selenium}
    (ROOT/'src/genericFoodEstimates.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Prepared {len(foods)} generic estimates with {sum(len(r["nutrients"]) for r in foods.values())} source values.')

if __name__=='__main__':main()
