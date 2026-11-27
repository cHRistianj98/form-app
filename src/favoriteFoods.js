// Product labels, user tables and estimates carry their own source.
import {NUTRIENT_FIELDS,MINERAL_KEYS,VITAMIN_KEYS} from './nutrients.js';
import {TEA_FOOD} from './tea.js';
import genericEstimates from './genericFoodEstimates.json' with {type:'json'};
const highProteinProxy=genericEstimates.foods['base:skyr'];
const highProteinMicros=Object.fromEntries([...MINERAL_KEYS,...VITAMIN_KEYS]
  .filter(key=>highProteinProxy.nutrients[key]!=null).map(key=>[key,highProteinProxy.nutrients[key]]));
const product = (id, name, brand, unit, kcal, protein, carbs, fat, extra={}) => ({
  id:`favorite:${id}`, name, brand, unit, source:'Twoja tabela',
  image:`/foods/fav-${id}.webp`, imageFit:'contain',
  kcal, protein, carbs, fat, ...extra,
});
const labelled = (...args) => ({...Object.fromEntries(NUTRIENT_FIELDS.map(key=>[key,null])),...product(...args)});

export function favoriteSeleniumInfo(food) {
  if(food?.source!=='Twoja tabela'||!Object.hasOwn(genericEstimates.favoriteSelenium,food.id))return null;
  const estimate=genericEstimates.favoriteSelenium[food?.id];
  if(food.unit!==estimate.unit||
    (food.basisQuantity!=null&&food.basisQuantity!==100))return null;
  return estimate;
}

export function fillFavoriteSelenium(food) {
  if(food?.selenium!=null&&food.selenium!=='')return food;
  const estimate=favoriteSeleniumInfo(food);
  return estimate?{...food,selenium:estimate.value}:food;
}

export const FAVORITE_FOODS = [
  product('lidl-protein-milk','Mleko wysokobiałkowe','Lidl — Pilos High Protein','ml',54,8,4.7,0.5,{fatLessThan:true}),
  product('piatnica-cream-18','Śmietana 18%','Piątnica','g',191,2.5,4.8,18),
  product('hochland-gouda','Gouda','Hochland','g',243,16,6.6,17,{
    sliceGrams:16,aliases:['serek topiony gouda','gouda w plastrach'],
    servingSizes:[{label:'1 plaster — 16 g',quantity:16},{label:'2 plastry — 32 g',quantity:32},{label:'3 plastry — 48 g',quantity:48}],
  }),
  product('lidl-protein-cheese','Ser wysokobiałkowy','Lidl — Milbona High Protein','g',198,31,0,8.2,{
    sliceGrams:14,aliases:['ser high protein','ser wysokobiałkowy w plastrach'],
    servingSizes:[{label:'1 plaster — 14 g',quantity:14},{label:'2 plastry — 28 g',quantity:28},{label:'3 plastry — 42 g',quantity:42}],
  }),
  labelled('lidl-protein-cup','Jogurt High Protein','Lidl','g',71,10,6.7,0.3,{
    ...highProteinMicros,defaultQuantity:200,
    aliases:['high protein kubek','high protein jogurt','jogurt wysokobiałkowy','jogurt hight protein','jogurt proteinowy'],
    servingSizes:[{label:'Opakowanie 200 g',quantity:200},{label:'Pół opakowania — 100 g',quantity:100}],
    imageNote:'Zdjęcie poglądowe serii High Protein. Smak kubka nie został określony. Mikroskładniki są szacunkowe.',
    sourceUrl:highProteinProxy.sourceUrl,
    estimateNotes:'Kalorie i makro pozostają z Twojej tabeli na 100 g: 71 kcal, 10 g białka, 6,7 g węglowodanów i 0,3 g tłuszczu. Całe opakowanie ma 200 g. Witaminy i minerały oszacowano tabelą naturalnego skyru 0,2% z DTU Frida 6.1 jako zbliżonego nabiału wysokobiałkowego. To przybliżenie, nie dane laboratoryjne tego jogurtu; smak i receptura mogą zmieniać skład. Cukry, nasycone, sól i składniki niepodane w źródle pozostają nieznane. Źródło: DTU National Food Institute, CC BY 4.0.',
  }),
  product('laciate-milk-32','Mleko Łaciate 3,2%','Mlekpol — Łaciate','ml',60,3.2,4.7,3.2),
  product('cincin-rose-zero','Cin&Cin Rosé 0%','Cin&Cin','ml',22,0,5.3,0),
  labelled('laciate-butter','Masło Łaciate','Mlekpol — Łaciate','g',753,0.6,0.8,83,{
    sugars:0.8,saturatedFat:54,fiber:null,salt:0,vitaminA:725,vitaminD:7.5,vitaminK:17.25,
    aliases:['masło','masło ekstra łaciate'],servingSizes:[{label:'10 g',quantity:10},{label:'20 g',quantity:20}],
  }),
  labelled('alesto-walnuts','Orzechy włoskie Alesto','Lidl — Alesto','g',711,18.1,4,67.8,{
    sugars:2,saturatedFat:7.1,fiber:6.1,salt:0.03,
    aliases:['orzechy alesto','orzechy włoskie'],servingSizes:[{label:'15 g',quantity:15},{label:'30 g',quantity:30}],
  }),
  labelled('olimp-whey-isolate','Olimp Whey Isolate 95, czekolada','Olimp','g',352,86,1,0.5,{
    sugars:1,saturatedFat:0.5,fiber:0,salt:0.83,
    vitaminA:120,vitaminC:12,vitaminD:0.75,vitaminE:1.8,b1:0.17,b2:0.21,b3:2.4,b6:0.21,biotin:7.5,folate:30,b12:0.38,
    aliases:['olimp whey isolate','izolat białka','odżywka białkowa','białko czekoladowe'],
    servingSizes:[{label:'30 g',quantity:30},{label:'40 g',quantity:40}],
  }),
  labelled('basia-pizza-flour','Mąka Basia na pizzę włoską','Basia','g',340,11,71,0.9,{
    sugars:1.7,saturatedFat:0.3,fiber:null,salt:0,
    aliases:['mąka basia','mąka pizza','mąka na pizzę'],servingSizes:[{label:'100 g',quantity:100},{label:'250 g',quantity:250}],
  }),
  labelled('reduced-fat-cocoa','Kakao o obniżonej zawartości tłuszczu','','g',309,24,13,11,{
    sugars:0.5,saturatedFat:6.4,fiber:null,salt:0.06,
    aliases:['kakao','cocoa'],servingSizes:[{label:'5 g',quantity:5},{label:'10 g',quantity:10}],
    imageNote:'Zdjęcie poglądowe kakao. Marka nie została podana.',
  }),
  labelled('lidl-turkey-breast','Wędlina z piersi indyka','Lidl','g',110,20.7,1.7,2.1,{
    sugars:1.4,saturatedFat:0.8,fiber:0.6,salt:1.8,
    aliases:['wędlina z indyka','szynka z indyka','pierś indyka lidl'],
    servingSizes:[{label:'50 g',quantity:50},{label:'100 g — opakowanie',quantity:100}],
    imageNote:'Zdjęcie poglądowe wędliny z indyka.',
  }),
  labelled('vanilla-aerosol-cream','Śmietanka słodzona waniliowa, aerozol (biała)','','g',244,2.7,10,21,{
    sugars:10,saturatedFat:13,fiber:0,salt:0.19,
    aliases:['śmietanka waniliowa','bita śmietana biała','śmietana w sprayu'],
    servingSizes:[{label:'10 g — łyżka',quantity:10},{label:'20 g',quantity:20}],
    imageNote:'Zdjęcie poglądowe bitej śmietany. Marka nie została podana.',
  }),
  labelled('lidl-aerosol-cream','Bita śmietana Lidl, aerozol (niebieska)','Lidl','g',291,2.3,8,27.7,{
    sugars:8,saturatedFat:20,fiber:null,salt:0.08,
    aliases:['bita śmietana lidl','bita śmietana niebieska','śmietana w sprayu'],
    servingSizes:[{label:'10 g',quantity:10},{label:'20 g',quantity:20}],
    imageNote:'Zdjęcie poglądowe bitej śmietany; wartości z Twojej etykiety.',
  }),
  labelled('plusssz-multivitamin','Plusssz 100% Multiwitamina, pomarańcza–mango','Plusssz','tablet',null,null,null,null,{
    basisQuantity:1,vitaminC:80,vitaminE:12,b1:1.1,b2:1.4,b3:16,b5:6,b6:1.4,biotin:50,folate:200,b12:2.5,
    aliases:['plussz','plusssz','multiwitamina','tabletka musująca','pomarańcza mango'],
    servingSizes:[{label:'1 tabletka',quantity:1}],
  }),
  labelled('mutti-pizza-sauce','Sos do pizzy z czosnkiem i bazylią','Mutti','g',33,1.7,5.2,0.5,{
    sugars:4.6,saturatedFat:0.1,fiber:null,salt:0.69,
    fatLessThan:true,upperBoundNutrients:['saturatedFat'],
    image:'/foods/tomato.webp',imageFit:'cover',
    imageNote:'Poglądowe zdjęcie pomidorów. Tłuszcz <0,5 g i nasycone <0,1 g na 100 g według Twojej etykiety.',
    aliases:['mutti','sos pomidorowy','sos do pizzy','czosnek bazylia'],
    servingSizes:[{label:'100 g',quantity:100},{label:'200 g — pół puszki',quantity:200},{label:'400 g — puszka',quantity:400}],
  }),
  TEA_FOOD,
  labelled('guseppe-four-cheese','Pizza Guseppe 4 Sery','Dr. Oetker','g',299,9.6,35,13,{
    sugars:3,saturatedFat:4.8,fiber:1.7,salt:0.98,
    // Generic frozen cheese pizza, USDA FoodData Central 170317.
    calcium:179,potassium:152,magnesium:23,zinc:1.32,selenium:21.5,
    source:'Dane producenta',sourceUrl:'https://www.oetker.pl/produkty/p/guseppe-4-cheese',
    imageNote:'Porcje i wartości odnoszą się do wagi przed pieczeniem.',
    estimateNotes:'Kalorie, makro, cukry, błonnik i sól pochodzą z tabeli Dr. Oetker na 100 g produktu w opakowaniu. Wapń, potas, magnez, cynk i selen to szacunki z tabeli podobnej pizzy serowej USDA FoodData Central (170317).',
    aliases:['pizza guseppe','pizza giuseppe','guseppe 4 cheese','pizza cztery sery','5900437005171'],
    defaultQuantity:335,
    servingSizes:[{label:'¼ pizzy — 83,75 g',quantity:83.75},{label:'½ pizzy — 167,5 g',quantity:167.5},{label:'Cała pizza — 335 g',quantity:335}],
  }),
  labelled('kania-mild-ketchup','Ketchup łagodny Kania','Lidl','g',148,1.1,35,0.1,{
    sugars:30,saturatedFat:0.1,fiber:1.1,salt:3.3,upperBoundNutrients:['saturatedFat'],
    // Generic tomato ketchup, USDA FoodData Central 168556.
    calcium:15,potassium:281,magnesium:13,iron:0.35,zinc:0.17,selenium:0.7,
    source:'Szacunek z etykiety',sourceUrl:'https://czytamyetykiety.pl/lidl-vs-biedronka-kto-ma-lepsze-ceny-i-sklady/',
    imageNote:'Opakowanie 560 g. Wartości oparte na etykiecie polskiego wariantu z 62% przecieru pomidorowego.',
    estimateNotes:'Kalorie, makro, cukry, błonnik i sól pochodzą z opublikowanej etykiety polskiego wariantu 560 g z 62% przecieru pomidorowego. Receptura może się różnić między partiami. Minerały, w tym selen, oszacowano na podstawie ogólnego ketchupu USDA FoodData Central (168556).',
    aliases:['keczup kania','ketchup lidl','ketchup lagodny 560 g','sos pomidorowy kania'],
    defaultQuantity:15,
    servingSizes:[{label:'10 g',quantity:10},{label:'15 g',quantity:15},{label:'30 g',quantity:30}],
  }),
  labelled('muller-mullermilch-chocolate','Müllermilch czekoladowe','Müller','g',71,3.4,10.7,1.6,{
    sugars:10.2,saturatedFat:1.1,fiber:null,salt:0.15,b1:0.23,b2:0.35,b6:0.28,b12:0.5,
    sourceUrl:'https://www.mullerpolska.pl/produkty/muellermilch/mullermilch-original/muellermilch-czekolada',
    aliases:['mleko czekoladowe','napój mleczny czekoladowy','muellermilch'],
    servingSizes:[{label:'100 g',quantity:100},{label:'Cała butelka — 400 g',quantity:400}],
  }),
  labelled('piatnica-strawberry-skyr','Skyr truskawkowy','Piątnica','g',78,9.6,10,0,{
    defaultQuantity:150,
    sugars:10,saturatedFat:0,fiber:null,salt:0.06,
    sourceUrl:'https://piatnica.com.pl/produkt/skyr-z-truskawkami-150-g/',
    aliases:['skyr truskawka'],
    servingSizes:[{label:'Cały kubek — 150 g',quantity:150}],
  }),
  labelled('lidl-turkey-frankfurters','Parówki z filetem z indyka','Lidl','g',190,15,0.9,14,{
    defaultQuantity:200,
    sugars:0.9,saturatedFat:4.3,fiber:null,salt:1.6,
    aliases:['parówki z indyka','parówki indycze','Pikok Pure','20902575'],
    servingSizes:[{label:'Całe opakowanie — 200 g',quantity:200}],
  }),
  labelled('lidl-mountain-wheat-rye-roll','Bułka górska pszenno-żytnia','Lidl','g',247,8.5,48,1.5,{
    defaultQuantity:75,
    source:'Dane produktu i szacunek',sourceUrl:'https://listapromek.pl/produkty/2514-bulka-typu-gorskiego',
    sugars:2.5,saturatedFat:.3,fiber:4.2,salt:1.2,
    // Frida 6.1 foods 956 and 667 (80:20). Vitamin E from food 667.
    calcium:43.8,iron:1.19,potassium:156,magnesium:23.6,zinc:.744,selenium:2.92,
    vitaminA:2.2,vitaminC:0,vitaminD:0,vitaminE:.44,vitaminK:0,
    b1:.157,b2:.078,b3:1.58,b5:.46,b6:.083,biotin:2.12,folate:63.1,b12:0,
    ingredients:'Mąka pszenna (59%), woda, mąka żytnia (6%), płatki ziemniaczane (5,8%), sól, drożdże, gluten pszenny, cukier i kwas askorbinowy (środek do przetwarzania mąki).',
    labelNote:'Możliwa obecność mleka, jaj, soi, sezamu i orzechów.',
    estimateNotes:'Makro, cukry, błonnik, tłuszcze nasycone i sól przyjęto z orientacyjnej tabeli ListaPromek dla bułki typu górskiego 75 g. Skład i gramatura pochodzą z informacji Lidl. Witaminy i minerały oszacowano, uśredniając profil bułki pszennej i pieczywa pszenno-żytniego w proporcji 80:20 (pozycje 956 i 667 w DTU Frida 6.1, CC BY 4.0). Witaminę E przyjęto z pieczywa pszenno-żytniego.',
    aliases:['bułka typu górskiego','bułka pszenno-żytnia','bułki górskie','5572327'],
    servingSizes:[{label:'1 bułka — 75 g',quantity:75}],
  }),
  // The retailer label prints 69 kcal, but its own macros and 134 kcal per
  // 140 g cup both give 96 kcal per 100 g; keep the internally consistent value.
  labelled('danio-cream','Danio śmietankowe','Danone','g',96,4.9,12.5,2.9,{
    sugars:11.7,saturatedFat:1.9,fiber:null,salt:0.1,
    // Vanilla low-fat yogurt with the same protein, USDA FoodData Central 170888;
    // vitamin A scaled by fat (2.9 g vs 1.25 g).
    calcium:171,iron:0.07,potassium:219,magnesium:16,zinc:0.83,selenium:4.9,
    b1:0.042,b2:0.201,b5:0.552,b6:0.045,folate:11,b12:0.53,vitaminA:28,
    source:'Dane producenta',
    sourceUrl:'https://dodomku.pl/Danone_Danio_Biale_Serek_homogenizowany_o_smaku_smietankowym_4_x_140_g/60547.html',
    labelNote:'Opakowanie 4 × 140 g (EAN 5900643031773). Zawiera mleko.',
    estimateNotes:'Makro, cukry, tłuszcze nasycone i sól pochodzą z etykiety Danio o smaku śmietankowym 4 × 140 g. Etykieta podaje 69 kcal na 100 g, ale 134 kcal na kubek 140 g oraz podane makro dają około 96 kcal na 100 g, więc przyjęto 96 kcal. Minerały i witaminy z grupy B oszacowano tabelą jogurtu waniliowego o obniżonej zawartości tłuszczu z USDA FoodData Central (170888), który ma tyle samo białka (4,9 g). Witaminę A przeliczono proporcjonalnie do tłuszczu. To przybliżenie, nie analiza laboratoryjna tego serka. Witaminy D, E, K, C, B3 i biotyna pozostają nieznane.',
    aliases:['danio','danio białe','serek danio','serek homogenizowany śmietankowy','5900643031773'],
    defaultQuantity:140,
    servingSizes:[{label:'1 kubek — 140 g',quantity:140}],
  }),
  labelled('pilos-sour-cream-12','Śmietana 12%','Pilos — Lidl','g',136,3,4,12,{
    source:'Etykieta i szacunek',
    sourceUrl:'https://www.calori.com/product/20857912/smietana-12-pilos',
    sugars:4,saturatedFat:8,fiber:0,salt:.1,
    // Frida 6.1 food 671. Scale fat-soluble vitamins by 12 / 18.5665.
    calcium:98.4,iron:.024,potassium:122.5,magnesium:9.91,zinc:.344,selenium:2.2,
    vitaminA:85.7,vitaminC:.1,vitaminD:.142,vitaminE:.168,vitaminK:6.73,
    b1:.032,b2:.18,b3:.587,b5:.3,b6:.034,biotin:1.4,folate:10,b12:.2,
    imageFit:'cover',imageNote:'Wygenerowane zdjęcie poglądowe śmietany.',
    estimateNotes:'Kalorie, makro, cukry, kwasy tłuszczowe nasycone i sól pochodzą z tabeli dla kubka Pilos 400 g (EAN 20857912). Przyjęto 0 g błonnika dla śmietanki z kulturami bakterii. Witaminy i minerały oszacowano z tabeli śmietany fermentowanej 18% (pozycja 671 w DTU National Food Institute, Frida 6.1, CC BY 4.0). Witaminy A, D, E i K przeliczono proporcjonalnie do 12% tłuszczu.',
    aliases:['śmietna 12%','śmietana kwaśna 12%','śmietana naturalna 12%','20857912'],
    servingSizes:[{label:'1 łyżka — ok. 15 g',quantity:15},{label:'2 łyżki — ok. 30 g',quantity:30},{label:'Całe opakowanie — 400 g',quantity:400}],
  }),
  labelled('pilos-cream-30','Śmietanka 30%','Pilos — Lidl','g',292,2.4,3.2,30,{
    source:'Etykieta i szacunek',
    sourceUrl:'https://shelfpedia.com/pl-pl/produkt/4335619334076-smietanka-30/',
    sugars:3.2,saturatedFat:20.7,fiber:0,salt:.07,
    // USDA FoodData Central 170858. B7 interpolated between Frida 662 and 1174.
    // Total vitamin K from Frida 1174, scaled by 30 / 38.0181.
    calcium:69,iron:.03,potassium:97,magnesium:7,zinc:.25,selenium:.5,
    vitaminA:284,vitaminC:.6,vitaminD:.6,vitaminE:.88,vitaminK:8.85,
    b1:.024,b2:.125,b3:.559,b5:.259,b6:.028,biotin:1.1,folate:4,b12:.2,
    imageFit:'cover',imageNote:'Wygenerowane zdjęcie poglądowe śmietanki.',
    estimateNotes:'Kalorie, makro, cukry, kwasy tłuszczowe nasycone, błonnik i sól pochodzą z tabeli dla śmietanki Pilos 200 g (EAN 4335619334076). Witaminy i minerały oszacowano na podstawie płynnej śmietanki do ubijania 30,9% z USDA FoodData Central (170858). Biotynę oszacowano interpolacją danych dla śmietanki 18% i 38%, a witaminę K przeliczono proporcjonalnie z wariantu 38% (pozycje 662 i 1174 w DTU National Food Institute, Frida 6.1, CC BY 4.0).',
    aliases:['śmietana 30%','śmietanka kremówka 30%','śmietanka kremowa 30%','4335619334076'],
    servingSizes:[{label:'1 łyżka — ok. 15 g',quantity:15},{label:'2 łyżki — ok. 30 g',quantity:30},{label:'Całe opakowanie — 200 g',quantity:200}],
  }),
  labelled('pilos-high-protein-chocolate-drink','Napój High Protein czekoladowy','Pilos — Lidl','g',64,10,5.03,.28,{
    defaultQuantity:350,
    source:'Etykieta i szacunek',
    sourceUrl:'https://fitrecenzje.pl/napoj-proteinowy-pilos-high-protein-recenzja/',
    sugars:4.84,saturatedFat:.19,fiber:.4,salt:.14,
    // Frida 6.1 food 1108. Calcium from a comparable Arla protein drink;
    // iron includes the contribution from 1.2% cocoa (USDA 169593).
    calcium:136,iron:.19,potassium:211,magnesium:21.6,zinc:.5,selenium:1.3,
    vitaminA:4.33,vitaminC:0,vitaminD:.007,vitaminE:.01,vitaminK:0,
    b1:.027,b2:.164,b3:2.4,b5:.36,b6:.027,biotin:2,folate:4.72,b12:.05,
    labelNote:'Cała butelka 350 g dostarcza 35 g białka. Zawiera mleko.',
    estimateNotes:'Dane etykiety napoju czekoladowego przeliczono z objętości na masę opakowania (332 ml odpowiada 350 g). Energia całej butelki to 224 kcal według porcji z etykiety, a deklarowane 35 g białka to 10 g na 100 g. Błonnik oszacowano z 1,2% kakao. Mikroskładniki oszacowano z odtłuszczonego mleka czekoladowego UHT (pozycja 1108 w DTU Frida 6.1, CC BY 4.0). Wapń przyjęto z porównywalnego napoju Arla Protein, żelazo uwzględnia kakao (USDA 169593), a ekwiwalent niacyny dostosowano do wyższej zawartości białka.',
    aliases:['napój mleczny proteinowy czekolada','napój wysokobiałkowy czekoladowy','czekoladowe mleko proteinowe','high orotein','35 g białka','35g','160556'],
    servingSizes:[{label:'Cała butelka — 350 g',quantity:350},{label:'Pół butelki — 175 g',quantity:175}],
  }),
].map(fillFavoriteSelenium);
