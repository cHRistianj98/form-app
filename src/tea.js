import ingredients from './dishIngredients.json' with {type:'json'};
import {NUTRIENT_FIELDS} from './nutrients.js';
import {calculateMixture} from './dishNutrition.js';
import {DEFAULT_TEA_RECIPE,TEA_CUP_ML,TEA_ID,hasTeaExtras,normalizeTeaRecipe,teaRecipeOf} from './teaRecipe.js';

export const TEA_ADDONS=[
  {key:'lemon',name:'Cytryna',unit:'plaster',grams:10,description:'1 plaster = 10 g miąższu'},
  {key:'orange',name:'Pomarańcza',unit:'plaster',grams:20,description:'1 plaster = 20 g miąższu'},
  {key:'ginger',name:'Imbir',unit:'plasterek',grams:2,description:'1 plasterek = 2 g'},
  {key:'sugar',name:'Cukier',unit:'łyżeczka',grams:5,description:'1 płaska łyżeczka = 5 g'},
];
const source=key=>({name:ingredients[key].description,url:ingredients[key].url});
export const TEA_SOURCES=[source('blackTeaBrewed'),source('lemon'),source('orange'),source('ginger'),source('sugar'),
  {name:'Lipton Earl Grey — karta produktu (napar)',url:'https://sifu.unileversolutions.com/pdf/get/ES/es?cuEanCode=3228881018403&name=te-negro-earl-grey-lipton-caja-de-25-sobres'}];
const ingredient=key=>({...ingredients[key].nutrients,partialNutrients:ingredients[key].partialNutrients});
const number=value=>Number(value).toLocaleString('pl-PL',{maximumFractionDigits:2});

export function teaExtrasLabel(recipe) {
  return TEA_ADDONS.filter(addon=>recipe[addon.key]>0).map(addon=>`${addon.name}: ${number(recipe[addon.key]*addon.grams)} g`).join(', ');
}

export function createTeaFood(input=DEFAULT_TEA_RECIPE) {
  const recipe=normalizeTeaRecipe(input);
  if(!recipe)throw new Error('Niepoprawne dodatki do herbaty');
  const rows=[{food:ingredient('blackTeaBrewed'),quantity:TEA_CUP_ML}];
  if(recipe.sugar)rows.push({food:ingredient('sugar'),quantity:recipe.sugar*5});
  const fruit=TEA_ADDONS.filter(addon=>addon.key!=='sugar'&&recipe[addon.key]>0);
  if(recipe.consumeAdditions) {
    for(const addon of fruit)rows.push({food:ingredient(addon.key),quantity:recipe[addon.key]*addon.grams});
  }else if(fruit.length) {
    // Extraction into an infusion is not the same as eating all the fruit.
    // Keep the known tea/sugar contribution and mark unmeasured transfers as
    // partial/unknown instead of inventing an extraction percentage.
    const infusion=Object.fromEntries(NUTRIENT_FIELDS.map(key=>[key,fruit.every(addon=>ingredient(addon.key)[key]===0)?0:null]));
    rows.push({food:infusion,quantity:1});
  }
  const values=calculateMixture(rows,TEA_CUP_ML);
  const extras=teaExtrasLabel(recipe);
  return {id:TEA_ID,name:hasTeaExtras(recipe)?'Herbata Earl Grey z dodatkami':'Herbata Earl Grey',brand:'Lipton',source:'Szacunek naparu',
    unit:'ml',basisQuantity:100,defaultQuantity:TEA_CUP_ML,image:'/foods/fav-lipton-earl-grey.webp',imageFit:'cover',
    aliases:['herbata','herbata czarna','earl grey','earl gray','lipton earl grey','kubek herbaty'],
    servingSizes:[{label:'1 kubek — 250 ml',quantity:250},{label:'2 kubki — 500 ml',quantity:500}],
    ...values,teaRecipe:recipe,sourceUrl:ingredients.blackTeaBrewed.url,
    imageNote:'Grafika poglądowa. Wartości dotyczą zaparzonej herbaty; to szacunek z tabel naparu, nie suchych liści.',
    estimateNotes:`1 kubek to 250 ml gotowego naparu. Przyjęto 1 ml naparu jako 1 g oraz ogólną tabelę czarnej herbaty USDA, jako przybliżenie Earl Grey z aromatem bergamotki. Ilość i czas parzenia oraz woda zmieniają skład. ${extras?`Dodatki na 1 kubek: ${extras}. `:''}${fruit.length?(recipe.consumeAdditions?'Wliczono pełną ilość owoców i imbiru jako zjedzonych dodatków, bez skórek cytrusów. Witaminy z surowych składników, bez korekty strat od ciepła.':'Wliczono znaną ilość naparu i cukru. Ilość składników przechodzących z pozostawionych plastrów jest nieznana; takie sumy pozostają częściowe.'):''} Cukier liczymy jako 5 g na płaską łyżeczkę; ułamki łyżeczki są dozwolone. Podane ilości dodatków skalują się razem z liczbą kubków.`,
  };
}

export function configuredTeaFood(food,recipe) {
  const normalized=normalizeTeaRecipe(recipe);
  if(!normalized)return null;
  // Editing only the amount preserves the saved composition of older entries.
  if(JSON.stringify(normalized)===JSON.stringify(normalizeTeaRecipe(teaRecipeOf(food))))return food;
  return createTeaFood(normalized);
}

export const TEA_FOOD=createTeaFood();
