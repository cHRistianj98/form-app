import {ACTIVITY_LEVELS, DEFAULT_PROFILE} from './profile.js';
import {FAVORITE_FOODS} from './favoriteFoods.js';
export {FAVORITE_FOODS} from './favoriteFoods.js';
import {NUTRIENTS,NUTRIENT_FIELDS} from './nutrients.js';
import {enrichGenericFood} from './genericNutrition.js';
import {createHomemadeFoods} from './homemadeFoods.js';
import {isPartialNutrient,isUpperBoundNutrient} from './nutritionQualifiers.js';
import {SUPPLEMENTS} from './supplements.js';
export {NUTRIENTS} from './nutrients.js';

// Orientacyjne wartości na 100 g. Brakujące składniki uzupełniamy z jawnie
// dopasowanych rekordów USDA; niedostępne dane nigdy nie oznaczają zera.
const f = (id, name, kcal, protein, carbs, fat, extra = {}) => enrichGenericFood({
  id: `base:${id}`, name, brand: '', source: 'Orientacyjne', image: `/foods/${id}.webp`,
  kcal, protein, carbs, fat, ...extra,
});
export const BASE_FOODS = [
  f('egg','Jajko kurze',143,12.6,0.7,9.5,{fiber:0,sugars:0.4,salt:0.36,calcium:56,iron:1.75,potassium:138,b12:0.89,vitaminD:2.0}),
  f('onion','Cebula',40,1.1,9.3,0.1,{fiber:1.7,sugars:4.2,salt:0.01,potassium:146,vitaminC:7.4}),
  f('banana','Banan',89,1.1,22.8,0.3,{fiber:2.6,sugars:12.2,potassium:358,magnesium:27,vitaminC:8.7}),
  f('chicken','Pierś z kurczaka, surowa',110,23.1,0,1.2,{salt:0.19,potassium:256}),
  f('rice','Ryż biały, suchy',360,7.1,79.5,0.7,{fiber:1.3}),
  f('ricec','Ryż biały, ugotowany',130,2.7,28.2,0.3,{fiber:0.4}),
  f('potato','Ziemniaki, gotowane',87,1.9,20.1,0.1,{fiber:1.8,potassium:379,vitaminC:7}),
  f('salmon','Łosoś',208,20.4,0,13.4,{b12:3.2,vitaminD:10.9,potassium:363}),
  f('oats','Płatki owsiane',389,16.9,66.3,6.9,{fiber:10.6,iron:4.7,magnesium:177}),
  f('apple','Jabłko',52,0.3,13.8,0.2,{fiber:2.4,sugars:10.4,potassium:107}),
  f('bread','Chleb pszenny',265,9.0,49.0,3.2,{fiber:2.7,salt:1.2}),
  f('wholebread','Chleb pełnoziarnisty',247,13.0,41.0,4.2,{fiber:7.0,salt:1.1}),
  f('tw','Twaróg półtłusty',133,18.7,3.7,4.7,{calcium:90}),
  f('skyr','Skyr naturalny',60,11.0,4.0,0.2,{calcium:120}),
  f('milk','Mleko 2%',50,3.4,4.8,2.0,{sugars:4.8,calcium:120,b12:0.5}),
  f('olive','Oliwa z oliwek',884,0,0,100,{saturatedFat:13.8}),
  f('butter','Masło',717,0.9,0.1,81.1,{saturatedFat:51.4}),
  f('tomato','Pomidor',18,0.9,3.9,0.2,{fiber:1.2,sugars:2.6,potassium:237,vitaminC:13.7}),
  f('cucumber','Ogórek',15,0.7,3.6,0.1,{fiber:0.5,potassium:147}),
  f('lettuce','Sałata zielona liściasta',15,1.4,2.9,0.2,{fiber:1.3}),
  f('carrot','Marchew',41,0.9,9.6,0.2,{fiber:2.8,sugars:4.7,potassium:320}),
  f('tuna','Tuńczyk w sosie własnym',116,25.5,0,0.8,{salt:0.9,b12:2.2}),
  f('pasta','Makaron pszenny, suchy',350,12.0,72.0,1.5,{fiber:3.2}),
  f('pastac','Makaron pszenny, ugotowany',158,5.8,30.9,0.9,{fiber:1.8}),
  f('beef','Wołowina mielona 15% tłuszczu',250,17.2,0,19.3,{iron:2.0,b12:2.0}),
  f('roll','Bułka pszenna',270,9,55,1.5,{fiber:2.3}),
  f('peanut','Masło orzechowe',590,25,20,50,{fiber:6,sugars:6,magnesium:160}),
  f('walnut','Orzechy włoskie',654,15.2,13.7,65.2,{fiber:6.7,magnesium:158}),
  f('orange','Pomarańcza',47,0.9,11.8,0.1,{fiber:2.4,sugars:9.4,vitaminC:53}),
  f('strawberry','Truskawki',32,0.7,7.7,0.3,{fiber:2,sugars:4.9,vitaminC:59}),
  f('broccoli','Brokuły',34,2.8,6.6,0.4,{fiber:2.6,vitaminC:89,potassium:316}),
  f('eggwhite','Białko jaja',52,10.9,0.7,0.2,{salt:0.42}),
  f('yogurt','Jogurt naturalny',61,3.5,4.7,3.3,{calcium:121}),
  f('chocolate','Czekolada gorzka',598,7.8,45.9,42.6,{fiber:10.9}),
  f('tortilla','Tortilla pszenna',310,8.3,51,8.5,{fiber:3.4,salt:1.4}),
  f('ham','Szynka z indyka',115,20,2,3,{salt:2.1}),
  f('cheese','Ser cheddar',402,24.9,1.3,33.1,{calcium:721,salt:1.6}),
  f('kefir','Kefir naturalny',50,3.5,4.7,2,{calcium:120}),
  f('avocado','Awokado',160,2,8.5,14.7,{fiber:6.7,potassium:485}),
  f('kiwi','Kiwi',61,1.1,14.7,0.5,{fiber:3,vitaminC:93}),
  f('honey','Miód',304,0.3,82.4,0,{sugars:82.1}),
  f('oil','Olej rzepakowy',884,0,0,100),
  f('cottage','Serek wiejski',97,11.4,3,4.3,{calcium:80,salt:0.7}),
];

export const HOMEMADE_FOODS=createHomemadeFoods(BASE_FOODS,FAVORITE_FOODS);

export function canonicalText(text = '') {
  return text.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g,'l').trim();
}
// The legacy entries.grams column stores the amount in the food's unit.
// No density conversion: data per 100 ml scales directly by ml, per 100 g by g.
export const foodUnit = food => food.unit === 'capsule' ? 'kaps.' : food.unit === 'tablet' ? 'tabl.' : food.unit === 'ml' ? 'ml' : 'g';
export const foodBasis = food => ['capsule','tablet'].includes(food.unit) ? 1 : 100;
export const foodBasisLabel = food => `${foodBasis(food)} ${foodUnit(food)}`;
export function scaleFood(food, quantity) {
  const resolved=enrichGenericFood(food);
  return Object.fromEntries(NUTRIENT_FIELDS.map((k) => [k, resolved[k] == null || resolved[k] === '' ? null : Number(resolved[k]) * Number(quantity || 0) / foodBasis(resolved)]));
}
export const fmt = (n, digits = 0) => Number(n || 0).toLocaleString('pl-PL',{maximumFractionDigits:digits,minimumFractionDigits:0});
export function nutrientLabel(value, lessThan=false, digits=1) {
  if (value == null) return '—';
  // Round an upper bound upwards: <0.005 g must never be displayed as <0 g.
  const upper = Math.ceil(Number(value)*10**digits)/10**digits;
  return lessThan ? `< ${fmt(upper,digits)}` : fmt(value,digits);
}

export function foodNutrientLabel(food,key,value=food[key],digits=1) {
  if(value==null) return '—';
  const partial=isPartialNutrient(food,key),upper=isUpperBoundNutrient(food,key);
  if(partial) {
    const lower=Math.floor(value*10**digits)/10**digits;
    return `${upper?'≈':'≥'} ${fmt(upper?value:lower,digits)}`;
  }
  return nutrientLabel(value,upper,digits);
}

export function foodOptions(query='',personal=[],remote=[]) {
  const all=[...personal,...FAVORITE_FOODS,...HOMEMADE_FOODS,...BASE_FOODS,...remote];
  const seen=new Set();
  const terms=canonicalText(query).split(/\s+/).filter(Boolean);
  return all.filter(food=>{
    if (seen.has(food.id)) return false;
    seen.add(food.id);
    const text=canonicalText(food.name+' '+(food.brand||'')+' '+(food.aliases||[]).join(' '));
    return terms.every(term=>text.includes(term));
  }).slice(0,terms.length?50:18);
}
export function parseNum(value) { const n = Number(String(value).replace(',','.')); return Number.isFinite(n) ? n : 0; }
export const DAY_LABELS = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'];
export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function shiftDay(day, diff) {
  const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate()+diff); return localDay(d);
}
export function dateTitle(day) { const d = new Date(`${day}T12:00:00`); return `${DAY_LABELS[d.getDay()]}, ${d.getDate()} ${d.toLocaleDateString('pl-PL',{month:'long'})}`; }
export const MEALS = [{id:'breakfast',name:'Śniadanie',icon:'sunrise'},{id:'lunch',name:'Obiad',icon:'utensils'},{id:'dinner',name:'Kolacja',icon:'moon'},{id:'snack',name:'Przekąski',icon:'cookie'}];
export const ACTIVITY_TYPES = [
  {id:'strength',name:'Siłownia',icon:'dumbbell'}, {id:'run',name:'Bieganie',icon:'footprints'},
  {id:'walk',name:'Spacer',icon:'footprints'}, {id:'bike',name:'Rower',icon:'bike'},
  {id:'other',name:'Inny trening',icon:'flame'},
];
export function activityKcal(type, minutes, distance, weight) {
  if (type === 'run' && Number(distance) > 0) return Math.round(weight * distance);
  const metNet = {strength:2.5,run:7,walk:2,bike:5,other:3}[type] || 3;
  return Math.max(0, Math.round(metNet * weight * minutes / 60));
}
export function calcTargets(profile, weight) {
  const p = {...DEFAULT_PROFILE, ...profile};
  const number = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  const w = number(weight, number(p.startWeight, 93));
  const height = number(p.height, 186), age = number(p.age, 28);
  const female = p.sex === 'female';
  const bmr = 10*w + 6.25*height - 5*age + (female ? -161 : 5);
  const activity = ACTIVITY_LEVELS.find(a=>a.id===p.activityLevel) || ACTIVITY_LEVELS[1];
  const mifflin = bmr * activity.pal;
  // DRI 2023 EER for adults aged 19+. Units: years, cm, kg, kcal/day.
  // Source: Health Canada, linked in profile.js. EER already includes activity.
  const coefficients = female ? {
    inactive:[584.90,-7.01,5.72,11.71], low:[575.77,-7.01,6.60,12.14],
    active:[710.25,-7.01,6.54,12.34], very:[511.83,-7.01,9.07,12.56],
  } : {
    inactive:[753.07,-10.83,6.50,14.10], low:[581.47,-10.83,8.30,14.94],
    active:[1004.82,-10.83,6.52,15.91], very:[-517.88,-10.83,15.61,19.11],
  };
  const [constant, a, h, m] = coefficients[activity.id];
  const eer = constant + a*age + h*height + m*w;
  const method = p.energyMethod === 'eer2023' && age >= 19 ? 'eer2023' : 'mifflin';
  const maintenance = method === 'eer2023' ? eer : mifflin;
  const deficitPercent = Math.max(0, Math.min(25, Number(p.deficitPercent) || 0));
  const requestedDeficit = p.deficitMode === 'kcal' ? Math.max(0, Number(p.deficit) || 0) : maintenance * deficitPercent / 100;
  const automaticCalories = Math.max(0, Math.round(maintenance - requestedDeficit));
  const manual = Number(p.manualCalories) > 0;
  const calories = manual ? Number(p.manualCalories) : automaticCalories;
  const protein = Math.round(Number(p.manualProtein) > 0 ? Number(p.manualProtein) : number(p.proteinFactor, 2) * w);
  const fat = Math.round(number(p.fatFactor, 0.8) * number(p.targetWeight, 85));
  const macroCalories = protein*4 + fat*9;
  const carbs = Math.max(0, Math.round((calories - macroCalories)/4));
  return {
    bmr:Math.round(bmr), base:Math.round(maintenance), calories, protein, fat, carbs, fiber:30,
    automaticCalories, manual, method, activity, weight:w,
    mifflin:Math.round(mifflin), eer:age>=19?Math.round(eer):null,
    deficit:Math.round(maintenance-calories), requestedDeficit:Math.round(requestedDeficit),
    macroCalories, macrosFit:macroCalories<=calories,
  };
}

// A fixed daily plan includes usual activity through PAL/EER. Logs are useful
// estimates, but do not increase the food budget a second time.
export function calcDailyBalance(targets, eaten) {
  return {budget:targets.calories, remaining:targets.calories-(Number(eaten)||0)};
}

export function foodImage(food) {
  // Resolve the current image even for old diary snapshots that lack this field.
  if (typeof food.image === 'string' && (/^\/foods\/[a-z][a-z0-9-]*\.webp$/.test(food.image) || /^https:\/\/images\.openfoodfacts\.org\//.test(food.image))) return food.image;
  if (typeof food.image==='string' && food.image.length<=160000 && /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(food.image)) return food.image;
  const catalog = [...SUPPLEMENTS,...FAVORITE_FOODS,...HOMEMADE_FOODS,...BASE_FOODS];
  const base = catalog.find(f=>f.id===food.id) || catalog.find(f=>canonicalText(f.name)===canonicalText(food.name));
  return base?.image || null;
}
export function calcStepsKcal(steps, activities) {
  // Informacyjny szacunek ruchu ponad umowną bazę 3 tys. kroków.
  // Odejmujemy kroki z biegu / spaceru, by nie liczyć ich ponownie.
  // Ten szacunek nie zwiększa celu kalorii zawierającego już aktywność.
  const exerciseSteps = activities.reduce((total,a) => total + (a.includedInSteps ?
    (a.type === 'run' ? (Number(a.distance)>0 ? a.distance * 1250 : a.minutes * 150) :
     a.type === 'walk' ? a.minutes * 100 : 0) : 0), 0);
  return Math.max(0, Math.round((Math.max(0,steps - 3000 - exerciseSteps)) * 0.04));
}
