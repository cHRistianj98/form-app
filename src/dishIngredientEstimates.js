import {NUTRIENT_FIELDS} from './nutrients.js';

export const fridaSource={name:'DTU National Food Institute – Frida 6.1 (CC BY 4.0)',url:'https://doi.org/10.11583/DTU.32312844'};
export const afcdLicense={name:'FSANZ – licencja Australian Food Composition Database',url:'https://www.foodstandards.gov.au/science-data/monitoringnutrients/afcd/datauserlicenceagreement'};
export const afcdSource=(id,name)=>({name:`FSANZ · AFCD 3 – ${name}`,url:`https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd/search/food/${id}`});
export const mextSource=(id,name)=>({name:`MEXT – ${name}`,url:`https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=${id}&MODE=0`});
export const stockB5Source={name:'USDA – bulion drobiowy, rozcieńczony',url:'https://fdc.nal.usda.gov/food-details/174551/nutrients'};
export const noodlesDSource={name:'USDA – ugotowany makaron jajeczny, bez dodatku soli',url:'https://fdc.nal.usda.gov/food-details/168926/nutrients'};

// Supplemental values per 100 g. Biotin and vitamin D are in µg, B3 in mg NE,
// and B5 in mg. AFCD Release 3 values are attributed to Food Standards Australia
// New Zealand under its CC BY-SA 3.0 Australia-based data licence.
const estimates={
  'base:egg':{biotin:23.55}, // Frida 1662
  'base:butter':{biotin:0}, // Frida 1015
  'base:olive':{biotin:0}, // Frida 1467
  'base:oil':{biotin:0,b3:0}, // AFCD F006159, canola oil
  'base:potato':{biotin:.3}, // MEXT 02019, boiled peeled potato
  'base:pasta':{biotin:4,vitaminA:0}, // AFCD F006458, dry white pasta
  chickenRoasted:{biotin:4.2}, // AFCD F002590, baked skinless breast
  mushroomsCooked:{biotin:5.8}, // AFCD F005945, cooked white mushrooms without oil
  garlicPowder:{biotin:3.5}, // MEXT 17075
  pepper:{biotin:20}, // MEXT 17063
  paprika:{biotin:39}, // MEXT 17079
  flour:{biotin:2.27}, // Frida 1301, white wheat flour
  sugar:{biotin:0,b3:0}, // Frida 77
  powderedSugar:{biotin:0,b3:0}, // Trace starch in powdered sucrose
  eggYolk:{biotin:47.13}, // Frida 1230
  cocoa:{biotin:26}, // AFCD F002980, cocoa powder
  cornstarch:{biotin:.1}, // MEXT 02035
  bakingPowder:{biotin:0,b3:0}, // Frida 1312
  salmonBaked:{biotin:8.8}, // MEXT 10145, baked farmed Atlantic salmon
  stock:{
    b3:1.584+(.03/.2)*2.52, // USDA 172884 niacin plus AFCD F008936 tryptophan NE per g protein
    b5:(.02/2.02)*2.52, // USDA 174551 B5 per g protein, scaled to USDA 172884
    biotin:(4.2/31.02)*2.52, // AFCD F002590 biotin per g protein, scaled to USDA 172884
  },
  tomatoPuree:{biotin:1.5}, // Frida 1246
  garlic:{biotin:2}, // MEXT 06223
  parsley:{biotin:.4}, // Frida 8
  basil:{biotin:2}, // Fresh herb proxy Frida 8, concentrated fivefold by drying
  oregano:{biotin:2}, // Fresh herb proxy Frida 8, concentrated fivefold by drying
  noodles:{biotin:2.5,vitaminD:.1}, // AFCD F006444 B7 and USDA 168926 D
  yeast:{biotin:60}, // Frida 319, fresh compressed yeast
  mozzarella:{biotin:1.5}, // Frida 97
  salami:{biotin:7}, // Frida 358
  hazelnutSpread:{biotin:16,b3:1.86,fiber:3.7}, // AFCD F008777
  jam:{biotin:1.8}, // Frida 997, strawberry jam as a fruit jam proxy
  milkWhole:{biotin:1.55}, // Frida 6
};

export function applyIngredientEstimate(food,key) {
  const estimate=estimates[key];
  if(!estimate)return food;
  return {
    ...food,...estimate,
    partialNutrients:food.partialNutrients?.filter(key=>!Object.hasOwn(estimate,key)),
  };
}

export function fillIngredientGaps(food,reference,gramsPerUnit=1) {
  const nutrients={...food};
  for(const key of NUTRIENT_FIELDS) {
    if(nutrients[key]==null&&reference[key]!=null)nutrients[key]=reference[key]*gramsPerUnit;
  }
  return nutrients;
}
