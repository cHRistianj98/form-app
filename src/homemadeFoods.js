import ingredients from './dishIngredients.json' with {type:'json'};
import {calculateDish} from './dishNutrition.js';
import {afcdLicense,afcdSource,applyIngredientEstimate,fillIngredientGaps,fridaSource,mextSource,noodlesDSource,stockB5Source} from './dishIngredientEstimates.js';
import {genericNutritionInfo} from './genericNutrition.js';
import {NUTRIENT_FIELDS} from './nutrients.js';
import {favoriteSeleniumInfo} from './favoriteFoods.js';

const RETENTION_URL='https://www.ars.usda.gov/ARSUserFiles/80400530/pdf/retn06.pdf';
const PIZZA_URL='https://www.monsieur-cuisine.com/pl/recipe/pizza-wloska';
const NUTELLA_URL='https://www.nutella.com/pl/pl/produkty/krem/nutella';
const TOMATO_SOUP_URL='https://www.monsieur-cuisine.com/pl/recipe/zupa-pomidorowa-z-makaronem-5';
const CHEESECAKE_URL='https://aniagotuje.pl/przepis/sernik-krolewski';
const PILOS_QUARK_URL='https://www.fitatu.com/catalog/pl/twarog-sernikowy-nie-wymaga-mielenia-6-tluszczu--115390620';
const KARPATKA_URL='https://www.winiary.pl/przepisy/karpatka/';
// USDA Retention Factors release 6: 0305 flour/meal sauteed, 0103 eggs fried,
// 0001 cheese baked. Only listed vitamin corrections are applied; this remains
// an estimate, not an analysis of the user's cooking method.
const FLOUR_FRIED={vitaminC:0.8,b1:0.75,b2:0.9,b3:0.9,b6:0.9,folate:0.65,b12:1,vitaminA:0.85};
const EGG_FRIED={vitaminC:0.8,b1:0.85,b2:0.95,b3:0.95,b6:0.95,folate:0.75,b12:0.85,vitaminA:1};
const CHEESE_BAKED={vitaminC:0.65,b1:0.75,b2:1,b3:1,b6:0.75,folate:0.8,b12:0.55,vitaminA:1};
const generic=key=>applyIngredientEstimate({...ingredients[key].nutrients,partialNutrients:ingredients[key].partialNutrients},key);
const source=key=>({name:`USDA: ${ingredients[key].description}`,url:ingredients[key].url});
const part=(food,quantity,retention)=>({food,quantity,retention});
const zero=Object.fromEntries(NUTRIENT_FIELDS.map(key=>[key,0]));
const make=(id,name,rows,yieldGrams,extra)=>({
  id:`dish:${id}`,name,brand:'Domowa kuchnia',source:'Domowy szacunek',unit:'g',basisQuantity:100,
  image:`/foods/dish-${id}.webp`,...calculateDish(rows,yieldGrams),...extra,
});

export function createHomemadeFoods(baseFoods,favoriteFoods) {
  const base=id=>{
    const key=`base:${id}`;
    return applyIngredientEstimate(baseFoods.find(f=>f.id===key),key);
  };
  const favorite=id=>favoriteFoods.find(f=>f.id===`favorite:${id}`);
  const seleniumSource=id=>{
    const {variant,url}=favoriteSeleniumInfo(favorite(id));
    return {name:`Selen: ${variant}`,url};
  };
  const milk=fillIngredientGaps(favorite('laciate-milk-32'),generic('milkWhole'),1.03);
  const crepes=calculateDish([
    part(milk,350),                        // Values per 100 ml after the density conversion.
    part(base('egg'),100,EGG_FRIED),      // 2 eggs, 50 g edible portion each.
    part(generic('flour'),300,FLOUR_FRIED),
    part(base('olive'),4*0.91),           // ml -> g; assumed olive oil density.
  ],650);
  const nutella=fillIngredientGaps(
    {kcal:539,protein:6.3,carbs:57.5,fat:30.9,sugars:56.3,saturatedFat:10.6,salt:0.107},
    generic('hazelnutSpread'),
  );
  const crepeNotes='Ciasto na całą partię: 350 ml mleka Łaciate 3,2%, 2 jajka (100 g bez skorupek), około 300 g mąki pszennej i 4 ml oliwy (około 3,64 g). Założono 650 g usmażonych placków, bez dodatkowego tłuszczu, cukru ani soli. Zważ porcję razem z nadzieniem.';
  const milkNotes='Brakujące dane mleka oszacowano z mleka pełnego przy gęstości 1,03 g/ml i z tabel biotyny DTU Frida.';
  const vitaminsNote='Dla wybranych witamin zastosowano współczynniki retencji USDA.';
  const stockNotes='Biotynę bulionu oszacowano z piersi kurczaka, a B3 i B5 z wywarów porównawczych, przeliczając po zawartości białka.';
  const stockSources=[
    source('stock'),stockB5Source,afcdSource('F008936','wywar porównawczy do B3'),
    afcdSource('F002590','pierś kurczaka do oszacowania biotyny wywaru'),afcdLicense,
  ];
  const milkSource=source('milkWhole');
  const retentionSource={name:'Retencja witamin USDA',url:RETENTION_URL};
  const pepperSource=mextSource('17_17063_7','biotyna czarnego pieprzu');
  const garlicPowderSource=mextSource('17_17075_8','biotyna suszonego czosnku');
  const starchSource=mextSource('2_02035_6','biotyna skrobi kukurydzianej');
  const chickenBiotinSource=afcdSource('F002590','biotyna pieczonej piersi kurczaka');
  const pilosQuark=fillIngredientGaps(
    {kcal:108,protein:9,carbs:4.5,fat:6,saturatedFat:4,sugars:3.5,fiber:0},
    genericNutritionInfo(base('tw')).nutrients,
  );
  const butter=fillIngredientGaps(favorite('laciate-butter'),base('butter'));
  const pizzaFlour=fillIngredientGaps(favorite('basia-pizza-flour'),generic('flour'));
  const pizzaSauce=fillIngredientGaps(favorite('mutti-pizza-sauce'),generic('tomatoPuree'));
  return [
    make('chicken-mushroom-roulade','Rolada z piersi kurczaka z pieczarkami',[
      part(generic('chickenRoasted'),80),part(generic('mushroomsCooked'),18),
      part(base('oil'),1.5),part(generic('garlicPowder'),.1),part(generic('pepper'),.1),part({...zero,salt:100},.3),
    ],100,{
      aliases:['rolada','rolada mięsna','rolada miesna','rolada drobiowa','kurczak z pieczarkami','rolada z kurczaka'],
      servingSizes:[{label:'100 g',quantity:100},{label:'150 g',quantity:150},{label:'200 g',quantity:200}],
      estimateNotes:'Pieczona rolada z piersi kurczaka z nadzieniem z pieczarek, bez sera, boczku, panierki i sosu. Szacunek na 100 g GOTOWEJ rolady: 80 g upieczonej piersi bez skóry, 18 g ugotowanych pieczarek, 1,5 g oleju rzepakowego pozostałego po przygotowaniu, 0,1 g czosnku suszonego, 0,1 g pieprzu i 0,3 g soli. Pieczarki po obróbce oszacowano tabelą gotowanych pieczarek; tłuszcz doliczono osobno. Proporcje nadzienia, ilość oleju i odparowanie zmieniają wynik. Waż całą gotową roladę lub jej plastry, razem z farszem. Biotynę z pieczarek oszacowano z tabeli pieczarek smażonych bez oleju.',
      recipeSources:[
        source('chickenRoasted'),source('mushroomsCooked'),source('garlicPowder'),source('pepper'),
        chickenBiotinSource,afcdSource('F005945','biotyna pieczarek po obróbce'),
        afcdSource('F006159','olej rzepakowy'),garlicPowderSource,pepperSource,afcdLicense,
      ],
    }),
    make('roasted-chicken-breast','Pierś z kurczaka pieczona z przyprawami',[
      part(generic('chickenRoasted'),98.5),part(generic('garlicPowder'),.3),
      part(generic('paprika'),.3),part(generic('pepper'),.1),part({...zero,salt:100},.8),
    ],100,{
      aliases:['pierś pieczona','piers pieczona','pieczony kurczak','kurczak pieczony','pierś z przyprawą do kurczaka','czosnek sól pieprz'],
      servingSizes:[{label:'100 g',quantity:100},{label:'150 g',quantity:150},{label:'200 g',quantity:200}],
      estimateNotes:'Pierś z kurczaka bez skóry, pieczona z przyprawą do kurczaka, czosnkiem, solą i pieprzem. Szacunek na 100 g GOTOWEGO mięsa z przyprawami: 98,5 g upieczonej piersi, 0,3 g czosnku suszonego, 0,3 g papryki, 0,1 g pieprzu i 0,8 g soli łącznie. Nie znamy marki mieszanki, więc przyprawę do kurczaka zastąpiono takim orientacyjnym składem; sól z mieszanki jest już wliczona. Wariant bez panierki, sosu i dodanego oleju. Olej lub masło użyte do pieczenia dopisz osobno. Waż gotowe mięso po pieczeniu, nie surową pierś.',
      recipeSources:[
        source('chickenRoasted'),source('garlicPowder'),source('paprika'),source('pepper'),
        chickenBiotinSource,garlicPowderSource,mextSource('17_17079_6','biotyna papryki w proszku'),pepperSource,afcdLicense,
      ],
    }),
    make('boiled-potatoes','Ziemniaki gotowane',[
      part(base('potato'),100),
    ],100,{
      id:'base:potato',
      aliases:['ziemniaki','ziemniaki gotowane','kartofle','ziemniaki bez masła'],
      servingSizes:[{label:'150 g',quantity:150},{label:'200 g',quantity:200},{label:'300 g',quantity:300}],
      estimateNotes:'Porcja ugotowanych ziemniaków bez dodatku masła, śmietany, oleju i sosu. Biotyna pochodzi z tabeli gotowanych, obranych ziemniaków. Waż ziemniaki po ugotowaniu i odcedzeniu. Dodane tłuszcze i sól zapisuj osobno; odmiana ziemniaków i zawartość wody wpływają na wynik.',
      recipeSources:[
        {name:'USDA – ziemniaki gotowane, bez soli',url:'https://fdc.nal.usda.gov/food-details/170438/nutrients'},
        mextSource('2_02019_7','biotyna gotowanych ziemniaków'),
      ],
    }),
    make('cocoa-crumble-cheesecake','Sernik z kakaową kruszonką (bez rodzynek)',[
      part(pilosQuark,1000),part(generic('flour'),400),part(butter,400),
      part(generic('sugar'),280),part(base('egg'),250),part(generic('eggYolk'),34),
      part(generic('cocoa'),40),part(generic('cornstarch'),40),part(generic('bakingPowder'),8),
    ],2300,{
      aliases:['sernik','sernik królewski','sernik krolewski','sernik Pilos','sernik z wiaderka','sernik kakao','sernik z kruszonką','ciasto serowe'],
      servingSizes:[{label:'80 g',quantity:80},{label:'100 g',quantity:100},{label:'150 g',quantity:150}],
      estimateNotes:'Sernik bez rodzynek, z kakaowym spodem i kruszonką. Receptura szacunkowa w stylu sernika królewskiego: 1 kg twarogu sernikowego Pilos z wiaderka, 400 g mąki, 400 g masła Łaciate (300 g w cieście i 100 g w masie), 280 g cukru, 5 jajek (250 g bez skorupek), 2 żółtka (34 g), 40 g kakao, 40 g skrobi zamiast budyniu bez cukru i 8 g proszku do pieczenia. Przyjęto 2300 g wystudzonego ciasta, bez polewy i skórki cytrynowej. Dla Pilos przyjęto wariant 6% z pomocniczej tabeli Fitatu (108 kcal, 9 g białka, 4,5 g węgli i 6 g tłuszczu na 100 g). Inny wariant twarogu, ilość masła, cukru lub masa po pieczeniu zmieniają wynik. Waż gotowy kawałek razem z kruszonką. Brakujące dane twarogu oszacowano z quarku 4,7% z DTU Frida, a masła Łaciate z niesolonego masła USDA. Witaminy oszacowano z surowców, bez korekty strat podczas pieczenia.',
      recipeSources:[
        {name:'Receptura porównawcza – sernik królewski AniaGotuje',url:CHEESECAKE_URL},
        {name:'Pilos 6% – pomocnicza tabela Fitatu',url:PILOS_QUARK_URL},
        fridaSource,seleniumSource('laciate-butter'),source('flour'),source('cocoa'),source('cornstarch'),
        source('eggYolk'),source('bakingPowder'),afcdSource('F002980','biotyna kakao'),starchSource,afcdLicense,
      ],
    }),
    make('karpatka','Karpatka',[
      // Choux pastry: 1 glass of water, 150 g butter, 1 glass of flour, 4 eggs.
      part(zero,250),part(base('butter'),150),part(generic('flour'),160),part(base('egg'),200),part({...zero,salt:100},1),
      // Cream: 800 ml milk, 2 sugar-free pudding packets, 2 tbsp flour, 120 g sugar, 200 g butter.
      part(generic('milkWhole'),824),part(generic('cornstarch'),70),part(generic('flour'),20),
      part(generic('sugar'),120),part(base('butter'),200),part(generic('powderedSugar'),10),
    ],1700,{
      aliases:['karpatka','ciasto karpatka','karpatka z budyniem','ciasto parzone z kremem','krem budyniowy','ciasto budyniowe'],
      servingSizes:[{label:'100 g',quantity:100},{label:'1 kawałek (1/15 blachy) — 113 g',quantity:113},{label:'1/10 blachy — 170 g',quantity:170}],
      estimateNotes:'Domowa karpatka z ciasta parzonego i kremu budyniowego z masłem według przepisu Winiary na blachę 32 × 23 cm. Na blaty przyjęto 250 ml wody, 150 g masła, 160 g mąki pszennej, 4 jajka (200 g bez skorupek) i 1 g soli. Na krem przyjęto 800 ml mleka 3,2% (około 824 g), 70 g budyniu waniliowego bez cukru (oszacowanego jak skrobia kukurydziana), 20 g mąki, 120 g cukru i 200 g masła. Na wierzch doliczono 10 g cukru pudru. Szacowana masa gotowego ciasta to 1700 g, a energia całej blachy to około 4720 kcal. Winiary podaje 489,5 kcal na 1/10 blachy. Witaminy i minerały oszacowano z tabel surowców. Biotynę uzupełniono z tabel DTU Frida i MEXT, bez korekty strat podczas pieczenia i gotowania.',
      recipeSources:[
        {name:'Karpatka Winiary',url:KARPATKA_URL},source('milkWhole'),source('flour'),source('cornstarch'),
        source('sugar'),source('powderedSugar'),
        {name:'USDA – masło bez soli',url:'https://fdc.nal.usda.gov/food-details/173430/nutrients'},
        {name:'USDA – jajko całe, surowe',url:'https://fdc.nal.usda.gov/food-details/171287/nutrients'},
        fridaSource,starchSource,
      ],
    }),
    make('baked-salmon-olive-oil','Łosoś pieczony na oliwie',[
      part(generic('salmonBaked'),96.5),part(base('olive'),3),
      part({...zero,salt:100},.4),part(generic('pepper'),.1),
    ],100,{
      aliases:['łosoś pieczony','pieczony łosoś','łosoś z piekarnika','łosoś na oliwie','filet z łososia pieczony','łosoś z oliwą'],
      servingSizes:[{label:'100 g',quantity:100},{label:'150 g',quantity:150},{label:'200 g',quantity:200}],
      estimateNotes:'Filet z łososia atlantyckiego hodowlanego, pieczony w piekarniku z oliwą, solą i pieprzem. Szacunek na 100 g GOTOWEJ ryby: 96,5 g pieczonego łososia (tabela USDA dla łososia pieczonego bez tłuszczu), 3 g oliwy, która zostaje na rybie, 0,4 g dodanej soli i 0,1 g pieprzu. Założono około łyżki oliwy (10 g) na 300–350 g surowego filetu; część zostaje na blasze. Pieczenie odparowuje wodę, więc 100 g gotowej ryby to około 125–130 g surowego filetu. Wariant ze skórą, bez masła, panierki i sosu. Dziki łosoś ma mniej tłuszczu. Waż rybę po upieczeniu, bez ości i skóry, jeśli ich nie jesz.',
      recipeSources:[
        source('salmonBaked'),{name:'USDA – oliwa z oliwek',url:'https://fdc.nal.usda.gov/food-details/171413/nutrients'},
        source('pepper'),mextSource('10_10145_7','biotyna pieczonego łososia atlantyckiego'),pepperSource,fridaSource,
      ],
    }),
    make('tomato-soup-noodles','Pomidorowa z makaronem (Lidlomix, bez śmietany)',[
      part(generic('stock'),1000),part(generic('tomatoPuree'),150),part(base('pasta'),200),
      part(generic('garlic'),3),part(generic('parsley'),2),part(generic('basil'),0.2),
      part(generic('oregano'),0.2),part(generic('pepper'),0.1),
    ],1300,{
      aliases:['pomidorowa','zupa pomidorowa','pomidorowa z makaronem','pomidorowa bez śmietany','pomidorowka','pomidorówka','lidlomix pomidorowa','monsieur cuisine pomidorowa'],
      servingSizes:[{label:'300 g',quantity:300},{label:'400 g',quantity:400},{label:'500 g',quantity:500}],
      estimateNotes:'Według wskazanego przepisu Monsieur Cuisine „Zupa pomidorowa z makaronem”, w Twoim wariancie bez śmietany: 1000 g bulionu, 150 g przecieru pomidorowego i 200 g SUCHEGO makaronu gotowanego w zupie. Doliczono ząbek czosnku (3 g), listki z gałązki natki (2 g) oraz szczypty bazylii (0,2 g), oregano (0,2 g) i pieprzu (0,1 g). Pominięto 20 g śmietanki 30% z oryginału. Założono 1300 g gotowej zupy z makaronem po odparowaniu; wchłonięcie bulionu przez makaron nie zwiększa masy całej partii. Bulion oszacowano jak domowy wywar drobiowy USDA, a przecier jak purée pomidorowe bez dodatku soli. Inny bulion, koncentrat zamiast przecieru albo inna masa po gotowaniu zmienią wynik. Nie doliczono dodatkowej soli. Waż całą porcję zupy razem z ugotowanym makaronem; makaron jest już wliczony. '+stockNotes+' Bazylię i oregano przyjęto w postaci suszonej, a biotynę oszacowano z natki pietruszki z uwzględnieniem utraty wody.',
      recipeSources:[
        {name:'Monsieur Cuisine – zupa pomidorowa z makaronem',url:TOMATO_SOUP_URL},
        ...stockSources,source('tomatoPuree'),
        {name:'USDA – makaron pszenny suchy',url:'https://fdc.nal.usda.gov/food-details/168927/nutrients'},
        afcdSource('F006458','suchy makaron pszenny'),source('garlic'),source('parsley'),
        mextSource('6_06223_7','biotyna czosnku'),pepperSource,fridaSource,
      ],
    }),
    make('rosol-noodles','Rosół z makaronem',[
      part(generic('stock'),80),part(generic('noodles'),20),
    ],100,{
      aliases:['rosół','rosol','rosół domowy','zupa z makaronem','bulion drobiowy'],
      servingSizes:[{label:'300 g',quantity:300},{label:'400 g',quantity:400},{label:'500 g',quantity:500}],
      estimateNotes:'Na 100 g gotowej zupy: 80 g domowego wywaru drobiowego i 20 g ugotowanego, lekko solonego makaronu jajecznego. Wywar jest tabelarycznym odpowiednikiem rosołu, bez osobno doliczonego mięsa. Ilość makaronu, tłuszczu i soli może znacznie zmienić wynik. Waż całą porcję zupy z makaronem. '+stockNotes+' Witaminę D makaronu przyjęto z tabeli niesolonego makaronu jajecznego.',
      recipeSources:[...stockSources,source('noodles'),noodlesDSource,afcdSource('F006444','biotyna ugotowanego makaronu jajecznego')],
    }),
    make('italian-pizza','Pizza włoska domowa z mozzarellą i salami',[
      part(pizzaFlour,400),part(zero,220),part(generic('yeast'),4),
      part(generic('sugar'),5),part({...zero,salt:100},6),part(base('olive'),20),
      part(pizzaSauce,200),part(generic('mozzarella'),250,CHEESE_BAKED),part(generic('salami'),100),
    ],1000,{
      aliases:['pizza','pizza włoska','pizza domowa','lidlomix','monsieur cuisine','salami mozzarella'],
      servingSizes:[{label:'100 g',quantity:100},{label:'200 g',quantity:200},{label:'300 g',quantity:300}],
      estimateNotes:'Cała partia: 400 g mąki Basia na pizzę, 220 ml wody, 4 g świeżych drożdży, 5 g cukru, 6 g soli i 20 g oliwy według ciasta Monsieur Cuisine. Dodatki: 200 g sosu Mutti z czosnkiem i bazylią, 250 g mozzarelli pełnotłustej i 100 g salami. Założono 1000 g całej pizzy po pieczeniu (całej partii, także gdy dzielisz ją na kilka pizz). Ser i salami są szacunkami ogólnymi. Brakujące dane o mące Basia i sosie Mutti oszacowano z niewzbogacanej mąki pszennej i przecieru pomidorowego. Tłuszcz i tłuszcze nasycone w sosie zachowują granice z etykiety. '+vitaminsNote,
      recipeSources:[
        {name:'Ciasto – pizza włoska Monsieur Cuisine',url:PIZZA_URL},
        source('mozzarella'),source('salami'),source('yeast'),source('flour'),source('tomatoPuree'),fridaSource,retentionSource,
      ],
    }),
    make('crepes-nutella','Naleśniki z Nutellą',[
      part(crepes,80),part(nutella,20),
    ],100,{
      aliases:['naleśniki','nalesniki','naleśnik nutella','nutella','naleśniki czekoladowe'],
      servingSizes:[{label:'100 g',quantity:100},{label:'150 g',quantity:150},{label:'200 g',quantity:200}],
      estimateNotes:'Na 100 g gotowego dania: 80 g usmażonego naleśnika i 20 g Nutelli. '+crepeNotes+' '+milkNotes+' Błonnik, witaminy i minerały w Nutelli uzupełniono tabelami kremu kakaowo-orzechowego. '+vitaminsNote,
      recipeSources:[
        {name:'Nutella – tabela producenta',url:NUTELLA_URL},source('hazelnutSpread'),
        afcdSource('F008777','krem kakaowo-orzechowy'),afcdLicense,source('flour'),milkSource,fridaSource,retentionSource,
      ],
    }),
    make('crepes-jam','Naleśniki z dżemem',[
      part(crepes,80),part(generic('jam'),20),
    ],100,{
      aliases:['naleśniki','nalesniki','naleśnik dżem','dżem','dzem','marmolada'],
      servingSizes:[{label:'100 g',quantity:100},{label:'150 g',quantity:150},{label:'200 g',quantity:200}],
      estimateNotes:'Na 100 g gotowego dania: 80 g usmażonego naleśnika i 20 g tradycyjnego dżemu z cukrem. Biotynę dżemu oszacowano z tabeli dżemu truskawkowego. '+crepeNotes+' '+milkNotes+' '+vitaminsNote,
      recipeSources:[source('jam'),source('flour'),milkSource,fridaSource,retentionSource],
    }),
  ];
}
