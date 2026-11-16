// Products supplied by the user. Keep their table as the nutrition source;
// packaging photographs do not override these values or imply a specific flavour.
import {NUTRIENT_FIELDS} from './nutrients.js';
const product = (id, name, brand, unit, kcal, protein, carbs, fat, extra={}) => ({
  id:`favorite:${id}`, name, brand, unit, source:'Twoja tabela',
  image:`/foods/fav-${id}.webp`, imageFit:'contain',
  kcal, protein, carbs, fat, ...extra,
});
const labelled = (...args) => ({...Object.fromEntries(NUTRIENT_FIELDS.map(key=>[key,null])),...product(...args)});

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
  product('lidl-protein-cup','High Protein, kubek','Lidl','g',71,10,6.7,0.3,{
    imageNote:'Zdjęcie poglądowe serii High Protein. Smak kubka nie został określony.',
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
];
