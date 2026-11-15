import ingredients from './dishIngredients.json' with {type:'json'};
import {calculateDish} from './dishNutrition.js';
import {NUTRIENT_FIELDS} from './nutrients.js';

const RETENTION_URL='https://www.ars.usda.gov/ARSUserFiles/80400530/pdf/retn06.pdf';
const PIZZA_URL='https://www.monsieur-cuisine.com/pl/recipe/pizza-wloska';
const NUTELLA_URL='https://www.nutella.com/pl/pl/produkty/krem/nutella';
// USDA Retention Factors release 6: 0305 flour/meal sauteed, 0103 eggs fried,
// 0001 cheese baked. Only listed vitamin corrections are applied; this remains
// an estimate, not an analysis of the user's cooking method.
const FLOUR_FRIED={vitaminC:0.8,b1:0.75,b2:0.9,b3:0.9,b6:0.9,folate:0.65,b12:1,vitaminA:0.85};
const EGG_FRIED={vitaminC:0.8,b1:0.85,b2:0.95,b3:0.95,b6:0.95,folate:0.75,b12:0.85,vitaminA:1};
const CHEESE_BAKED={vitaminC:0.65,b1:0.75,b2:1,b3:1,b6:0.75,folate:0.8,b12:0.55,vitaminA:1};
const generic=key=>({...ingredients[key].nutrients,partialNutrients:ingredients[key].partialNutrients});
const source=key=>({name:`USDA: ${ingredients[key].description}`,url:ingredients[key].url});
const part=(food,quantity,retention)=>({food,quantity,retention});
const zero=Object.fromEntries(NUTRIENT_FIELDS.map(key=>[key,0]));
const make=(id,name,rows,yieldGrams,extra)=>({
  id:`dish:${id}`,name,brand:'Domowa kuchnia',source:'Domowy szacunek',unit:'g',basisQuantity:100,
  image:`/foods/dish-${id}.webp`,...calculateDish(rows,yieldGrams),...extra,
});

export function createHomemadeFoods(baseFoods,favoriteFoods) {
  const base=id=>baseFoods.find(f=>f.id===`base:${id}`);
  const favorite=id=>favoriteFoods.find(f=>f.id===`favorite:${id}`);
  // Keep the user's branded milk/flour/sauce label data, including unknowns.
  const crepes=calculateDish([
    part(favorite('laciate-milk-32'),350), // ml, never treated as 350 g of milk.
    part(base('egg'),100,EGG_FRIED),      // 2 eggs, 50 g edible portion each.
    part(generic('flour'),300,FLOUR_FRIED),
    part(base('olive'),4*0.91),           // ml -> g; assumed olive oil density.
  ],650);
  const nutella={kcal:539,protein:6.3,carbs:57.5,fat:30.9,sugars:56.3,saturatedFat:10.6,salt:0.107};
  const crepeNotes='Ciasto na całą partię: 350 ml mleka Łaciate 3,2%, 2 jajka (100 g bez skorupek), około 300 g mąki pszennej i 4 ml oliwy (około 3,64 g). Założono 650 g usmażonych placków, bez dodatkowego tłuszczu, cukru ani soli. Zważ porcję razem z nadzieniem.';
  const vitaminsNote='Wybrane straty witamin oszacowano tabelami USDA; pozostałe składniki bez korekty strat. Braki na etykietach oznaczają częściowe sumy (≥), nie zero.';
  return [
    make('rosol-noodles','Rosół z makaronem',[
      part(generic('stock'),80),part(generic('noodles'),20),
    ],100,{
      aliases:['rosół','rosol','rosół domowy','zupa z makaronem','bulion drobiowy'],
      servingSizes:[{label:'300 g',quantity:300},{label:'400 g',quantity:400},{label:'500 g',quantity:500}],
      estimateNotes:'Na 100 g gotowej zupy: 80 g domowego wywaru drobiowego i 20 g ugotowanego, lekko solonego makaronu jajecznego. Wywar jest tabelarycznym odpowiednikiem rosołu, bez osobno doliczonego mięsa. Ilość makaronu, tłuszczu i soli może znacznie zmienić wynik. Waż całą porcję zupy z makaronem.',
      recipeSources:[source('stock'),source('noodles')],
    }),
    make('italian-pizza','Pizza włoska domowa z mozzarellą i salami',[
      part(favorite('basia-pizza-flour'),400),part(zero,220),part(generic('yeast'),4),
      part(generic('sugar'),5),part({...zero,salt:100},6),part(base('olive'),20),
      part(favorite('mutti-pizza-sauce'),200),part(generic('mozzarella'),250,CHEESE_BAKED),part(generic('salami'),100),
    ],1000,{
      aliases:['pizza','pizza włoska','pizza domowa','lidlomix','monsieur cuisine','salami mozzarella'],
      servingSizes:[{label:'100 g',quantity:100},{label:'200 g',quantity:200},{label:'300 g',quantity:300}],
      estimateNotes:'Cała partia: 400 g mąki Basia na pizzę, 220 ml wody, 4 g świeżych drożdży, 5 g cukru, 6 g soli i 20 g oliwy według ciasta Monsieur Cuisine. Dodatki: 200 g sosu Mutti z czosnkiem i bazylią, 250 g mozzarelli pełnotłustej i 100 g salami. Założono 1000 g całej pizzy po pieczeniu (całej partii, także gdy dzielisz ją na kilka pizz). Ser i salami są szacunkami ogólnymi. '+vitaminsNote,
      recipeSources:[{name:'Ciasto: pizza włoska Monsieur Cuisine',url:PIZZA_URL},source('mozzarella'),source('salami'),source('yeast'),{name:'Retencja witamin USDA',url:RETENTION_URL}],
    }),
    make('crepes-nutella','Naleśniki z Nutellą',[
      part(crepes,80),part(nutella,20),
    ],100,{
      aliases:['naleśniki','nalesniki','naleśnik nutella','nutella','naleśniki czekoladowe'],
      servingSizes:[{label:'100 g',quantity:100},{label:'150 g',quantity:150},{label:'200 g',quantity:200}],
      estimateNotes:'Na 100 g gotowego dania: 80 g usmażonego naleśnika i 20 g Nutelli. '+crepeNotes+' '+vitaminsNote,
      recipeSources:[{name:'Nutella: tabela producenta',url:NUTELLA_URL},source('flour'),{name:'Retencja witamin USDA',url:RETENTION_URL}],
    }),
    make('crepes-jam','Naleśniki z dżemem',[
      part(crepes,80),part(generic('jam'),20),
    ],100,{
      aliases:['naleśniki','nalesniki','naleśnik dżem','dżem','dzem','marmolada'],
      servingSizes:[{label:'100 g',quantity:100},{label:'150 g',quantity:150},{label:'200 g',quantity:200}],
      estimateNotes:'Na 100 g gotowego dania: 80 g usmażonego naleśnika i 20 g tradycyjnego dżemu z cukrem (ogólna tabela USDA, nie dżem niskosłodzony). '+crepeNotes+' '+vitaminsNote,
      recipeSources:[source('jam'),source('flour'),{name:'Retencja witamin USDA',url:RETENTION_URL}],
    }),
  ];
}
