import {NUTRIENT_FIELDS} from './nutrients.js';

const supplement=(id,name,brand,values,extra)=>({
  ...Object.fromEntries(NUTRIENT_FIELDS.map(key=>[key,null])),
  id:`supplement:${id}`,name,brand,kind:'supplement',unit:'capsule',basisQuantity:1,
  source:'Tabela producenta',image:`/foods/supp-${id}.webp`,imageFit:'contain',
  verifiedAt:'2026-11-16',...values,...extra,
});

// Every value is PER ONE CAPSULE, not per suggested daily portion.
// Missing energy/macros stay unknown. EPA/DHA are included in fish oil, and
// withanolides/silica in their extracts; those nested amounts are not added.
export const SUPPLEMENTS=[
  supplement('essensey-ashwagandha-forte','Ashwagandha Forte','Essensey',{
    ashwagandhaExtract:666,withanolides:10,
  },{
    sourceUrl:'https://essensey.com/adaptogeny/ashwagandha-forte-w-90-kapsulkach.html',
    labelNote:'Tabela na 1 kapsułkę: 666 mg ekstraktu, w tym 10 mg witanolidów. Opakowanie 90 kapsułek, 72 g.',
    ingredients:'Ekstrakt z korzenia ashwagandhy standaryzowany na 1,5% witanolidów; kapsułka celulozowa HPMC; sole magnezowe kwasów tłuszczowych.',
  }),
  supplement('essensey-magnesium-b6','Magnez + B6','Essensey',{
    magnesium:187.5,b6:0.7,
  },{
    sourceUrl:'https://essensey.com/witaminy-i-mineraly/magnez-z-witamina-b6-w-90-kapsulkach.html',
    labelNote:'Producent podaje 375 mg magnezu i 1,4 mg B6 na 2 kapsułki. Tutaj połowa tych wartości na 1 kapsułkę. Opakowanie 90 kapsułek, 64,8 g.',
    ingredients:'Magnez z tlenku, cytrynianu, mleczanu i węglanu magnezu; kapsułka celulozowa HPMC; sole magnezowe kwasów tłuszczowych; witamina B6 jako chlorowodorek pirydoksyny.',
  }),
  supplement('now-omega-3','Omega-3 Fish Oil 1000 mg','NOW Foods',{
    kcal:10,fat:1,fishOil:1000,epa:180,dha:120,
  },{
    sourceUrl:'https://www.nowfoods.com/products/supplements/omega-3-fish-oil-molecularly-distilled-softgels',
    labelNote:'Tabela producenta na 2 kapsułki: 20 kcal, 2 g tłuszczu, 2000 mg oleju rybiego, 360 mg EPA i 240 mg DHA. W aplikacji wartości na 1 kapsułkę. Wariant 100 softgels, 180 EPA / 120 DHA.',
    ingredients:'Koncentrat oleju rybiego; otoczka żelatynowa z gliceryną i wodą; d-alfa-tokoferol. Zawiera ryby. Ilość witaminy E nie została zadeklarowana w tabeli.',
  }),
  supplement('essensey-biotin-horsetail-zinc','Biotyna + Skrzyp, Cynk','Essensey',{
    vitaminC:325,biotin:2500,zinc:10,horsetailExtract:150,silica:10.5,
  },{
    sourceUrl:'https://essensey.com/na-skore-wlosy-paznokcie/biotyna-skrzyp-cynk-w-90-kapsulkach.html',
    labelNote:'Tabela na 1 kapsułkę: 325 mg witaminy C, 2500 µg biotyny, 10 mg cynku i 150 mg ekstraktu skrzypu, w tym 10,5 mg krzemionki. Opakowanie 90 kapsułek, 63 g.',
    ingredients:'Kwas L-askorbinowy; ekstrakt skrzypu polnego standaryzowany na 7% krzemionki; kapsułka HPMC; glukonian cynku; sole magnezowe kwasów tłuszczowych; D-biotyna.',
  }),
  supplement('essensey-zinc','Cynk organiczny 15 mg','Essensey',{
    zinc:15,
  },{
    sourceUrl:'https://essensey.com/witaminy-i-mineraly/cynk-organiczny-w-120-kapsulkach.html',
    labelNote:'Tabela na 1 kapsułkę: 15 mg cynku. Opakowanie 120 kapsułek, 60 g.',
    ingredients:'Maltodekstryna; kapsułka celulozowa HPMC; glukonian cynku; sole magnezowe kwasów tłuszczowych.',
  }),
  supplement('essensey-vitamin-d3-forte','Witamina D3 Forte 4000 IU','Essensey',{
    vitaminD:100,
  },{
    sourceUrl:'https://essensey.com/witaminy/witamina-d3-forte-w-90-kapsulkach.html',
    labelNote:'Tabela na 1 kapsułkę: 100 µg witaminy D3, czyli 4000 IU (1 µg = 40 IU). Opakowanie 90 kapsułek, 45 g.',
    ingredients:'Maltodekstryna; kapsułka celulozowa HPMC; sole magnezowe kwasów tłuszczowych; witamina D3 jako cholekalcyferol.',
  }),
  supplement('olimp-creatine-1250','Kreatyna Creatine 1250 Mega Caps','Olimp Sport Nutrition',{
    kcal:5,protein:0,carbs:0,fat:0,saturatedFat:0,sugars:0,salt:0,
    creatineMonohydrate:1250,creatine:1100,
  },{
    verifiedAt:'2026-11-18',
    sourceUrl:'https://olimpstore.pl/olimp-creatine-1250-mega-caps-400-capsules-102',
    labelNote:'Wartości na 1 kapsułkę: 5 kcal, 1250 mg monohydratu, w tym 1100 mg kreatyny. Producent deklaruje 0 g białka, węglowodanów, tłuszczu, cukrów, tłuszczów nasyconych i soli. Opakowanie 400 kapsułek, 560 g. Twój plan 4 kapsułek daje 20 kcal, 5000 mg monohydratu i 4400 mg kreatyny. Nie przeliczamy kalorii ponownie z makro.',
    ingredients:'Mikronizowany monohydrat kreatyny; celuloza mikrokrystaliczna; sole magnezowe kwasów tłuszczowych; kapsułka żelatynowa.',
  }),
  supplement('essensey-collagen-plus','Kolagen+','Essensey',{
    collagen:500,vitaminC:30.5,
  },{
    verifiedAt:'2026-11-18',
    sourceUrl:'https://essensey.com/kolageny/kolagen-w-90-kapsulkach.html',
    labelNote:'Tabela na 2 kapsułki: 1000 mg hydrolizatu kolagenu typu I SOLUGEL i 61 mg witaminy C. W aplikacji połowa na 1 kapsułkę: 500 mg kolagenu i 30,5 mg witaminy C. Opakowanie 90 kapsułek, 61,2 g. Producent nie deklaruje kalorii ani makro; masa hydrolizatu nie jest deklaracją ilości białka.',
    ingredients:'Hydrolizat kolagenu typu I SOLUGEL (73,5%); kapsułka celulozowa HPMC; kwas L-askorbinowy (4,5%); sole magnezowe kwasów tłuszczowych.',
  }),
  supplement('essensey-selenium-pro-forte','Selen Pro Forte 200 µg','Essensey',{
    selenium:200,
  },{
    verifiedAt:'2026-11-18',
    sourceUrl:'https://essensey.com/witaminy-i-mineraly/selen-pro-forte-w-120-kapsulkach.html',
    labelNote:'Tabela na 1 kapsułkę: 200 µg selenu jako L-selenometionina. Opakowanie 120 kapsułek, 60 g. Producent nie deklaruje kalorii ani makro. Twój plan to 1 kapsułka we wtorek, czwartek i niedzielę.',
    ingredients:'Maltodekstryna; kapsułka celulozowa HPMC; L-selenometionina; sole magnezowe kwasów tłuszczowych.',
  }),
  supplement('essensey-melatonin','Melatonina 1 mg','Essensey',{
    melatonin:1,
  },{
    verifiedAt:'2026-11-18',
    sourceUrl:'https://essensey.com/ziola-i-suplementy-na-sen/melatonina-w-120-kapsulkach.html',
    labelNote:'Tabela na 1 kapsułkę: 1 mg melatoniny. Opakowanie 120 kapsułek, 60 g. Producent nie deklaruje kalorii ani makro. W planie 1 kapsułka dziennie opcjonalnie; do sum składników trafia wyłącznie zapisana ilość.',
    ingredients:'Maltodekstryna; kapsułka celulozowa HPMC; sole magnezowe kwasów tłuszczowych; melatonina (0,2%).',
  }),
];

export const isSupplement=food=>food?.kind==='supplement';
export const supplementLogId=(day,foodId)=>`intake:${day}:${foodId}`;
export const supplementCount=(entries,day,foodId)=>entries.filter(entry=>entry.day===day&&entry.food.id===foodId&&isSupplement(entry.food)).reduce((sum,entry)=>sum+entry.grams,0);
export const supplementCatalog=personal=>[...SUPPLEMENTS,...personal.filter(isSupplement)];
