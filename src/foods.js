// Orientacyjne wartości na 100 g. Dane mikroskładników podawane są tylko tam,
// gdzie mamy rozsądny szacunek; brak danych nigdy nie oznacza zera.
const f = (id, name, kcal, protein, carbs, fat, extra = {}) => ({
  id: `base:${id}`, name, brand: '', source: 'Orientacyjne',
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
  f('lettuce','Sałata',15,1.4,2.9,0.2,{fiber:1.3}),
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

export const NUTRIENTS = [
  ['fiber','Błonnik','g'], ['sugars','Cukry','g'], ['saturatedFat','Tłuszcze nasycone','g'],
  ['salt','Sól','g'], ['calcium','Wapń','mg'], ['iron','Żelazo','mg'],
  ['potassium','Potas','mg'], ['magnesium','Magnez','mg'],
  ['vitaminC','Witamina C','mg'], ['vitaminD','Witamina D','µg'], ['b12','Witamina B12','µg'],
];

export function canonicalText(text = '') {
  return text.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g,'l').trim();
}
export function scaleFood(food, grams) {
  const fields = ['kcal','protein','carbs','fat',...NUTRIENTS.map(([k])=>k)];
  return Object.fromEntries(fields.map((k) => [k, food[k] == null || food[k] === '' ? null : Number(food[k]) * Number(grams || 0) / 100]));
}
export const fmt = (n, digits = 0) => Number(n || 0).toLocaleString('pl-PL',{maximumFractionDigits:digits,minimumFractionDigits:0});
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
  const w = weight || profile.startWeight || 93;
  const bmr = 10*w + 6.25*(profile.height || 186) - 5*(profile.age || 28) + (profile.sex === 'female' ? -161 : 5);
  const base = Math.round(bmr * 1.2);
  const calories = profile.manualCalories && Number(profile.manualCalories) > 0 ? Number(profile.manualCalories) : Math.max(1200, Math.round(base - (profile.deficit || 450)));
  const protein = Math.round((profile.proteinFactor || 1.8) * (profile.targetWeight || 85));
  const fat = Math.round((profile.fatFactor || 0.8) * (profile.targetWeight || 85));
  const carbs = Math.max(0,Math.round((calories - protein*4 - fat*9)/4));
  return {bmr: Math.round(bmr),base,calories,protein,fat,carbs,fiber:30};
}
export function calcStepsKcal(steps, activities) {
  // Unikamy doliczania pierwszych 3 tys. kroków objętych PAL 1.2,
  // oraz ponownego liczenia kroków z biegu / spaceru dodanych jako trening.
  const exerciseSteps = activities.reduce((total,a) => total + (a.includedInSteps ?
    (a.type === 'run' ? (Number(a.distance)>0 ? a.distance * 1250 : a.minutes * 150) :
     a.type === 'walk' ? a.minutes * 100 : 0) : 0), 0);
  return Math.max(0, Math.round((Math.max(0,steps - 3000 - exerciseSteps)) * 0.04));
}
