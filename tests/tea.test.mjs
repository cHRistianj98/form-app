import test from 'node:test';
import assert from 'node:assert/strict';
import {FAVORITE_FOODS,foodOptions,scaleFood} from '../src/foods.js';
import {createTeaFood,configuredTeaFood,TEA_FOOD} from '../src/tea.js';
import {DEFAULT_TEA_RECIPE,TEA_ID,normalizeTeaRecipe,teaRecipeOf,validTeaRecipe} from '../src/teaRecipe.js';
import {defaultFoodQuantity,quantityInBaseUnits,teaCups,teaPortionLabel} from '../src/foodPortions.js';
import {sumNutrition} from '../src/nutritionStats.js';
import worker from '../worker/index.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const recipe=extra=>({...DEFAULT_TEA_RECIPE,...extra});

test('Lipton Earl Grey is a selectable 250 ml cup of brewed tea with estimated macro and micronutrients',()=>{
  assert.equal(FAVORITE_FOODS.find(f=>f.id===TEA_ID),TEA_FOOD);
  for(const query of ['herbata','lipton earl grey','kubek herbaty','earl gray'])assert.equal(foodOptions(query)[0].id,TEA_ID);
  assert.equal(defaultFoodQuantity(TEA_FOOD),250);assert.equal(TEA_FOOD.unit,'ml');
  assert.equal(TEA_FOOD.basisQuantity,100);assert.match(TEA_FOOD.sourceUrl,/173227/);
  const cup=scaleFood(TEA_FOOD,250);
  near(cup.kcal,2.5);near(cup.carbs,.75);near(cup.protein,0);near(cup.fat,0);
  near(cup.potassium,92.5);near(cup.magnesium,7.5);near(cup.folate,12.5);near(cup.b2,.035);
  near(cup.salt,.01875);assert.equal(cup.biotin,null);
  assert.match(TEA_FOOD.estimateNotes,/gotowego naparu/);
});

test('cups and fractional cups preserve volume, accept comma/dot, and never silently round arbitrary saved ml',()=>{
  assert.equal(quantityInBaseUnits('1',TEA_FOOD,'cup'),250);
  assert.equal(quantityInBaseUnits('0,5',TEA_FOOD,'cup'),125);
  assert.equal(quantityInBaseUnits('1.25',TEA_FOOD,'cup'),312.5);
  assert.equal(quantityInBaseUnits('400',TEA_FOOD,'cup'),100000);
  for(const n of ['401','0','1.234','-1',''])assert.equal(quantityInBaseUnits(n,TEA_FOOD,'cup'),null);
  assert.equal(quantityInBaseUnits('1',{unit:'ml',id:'own:milk'},'cup'),null);
  assert.equal(teaCups(72.5),.29);assert.equal(teaCups(251),null);
  assert.equal(teaPortionLabel(250),'1 kubek (250 ml)');assert.equal(teaPortionLabel(500),'2 kubki (500 ml)');
  assert.equal(teaPortionLabel(125),'0,5 kubka (125 ml)');assert.equal(teaPortionLabel(251),'251 ml');
});

test('flat teaspoons are 5 g of sugar per cup and scale once with the saved volume',()=>{
  const sweet=createTeaFood(recipe({sugar:1}));
  const cup=scaleFood(sweet,250),two=scaleFood(sweet,500),half=scaleFood(sweet,125);
  near(cup.kcal,21.85);near(cup.carbs,5.749);near(cup.sugars,4.99);
  near(two.kcal,43.7);near(half.kcal,10.925);
  near(scaleFood(createTeaFood(recipe({sugar:.5})),250).kcal,12.175);
  const summary=sumNutrition([{food:sweet,grams:500}]);near(summary.totals.kcal,43.7);
  assert.equal(sweet.teaRecipe.sugar,1);assert.equal(TEA_FOOD.teaRecipe.sugar,0);
});

test('discarded fruit slices retain known tea/sugar values as partial and do not claim all fruit vitamins were consumed',()=>{
  const food=createTeaFood(recipe({lemon:1,orange:1,ginger:1,sugar:1}));
  const cup=scaleFood(food,250);
  near(cup.kcal,21.85);near(cup.potassium,92.6);
  assert.equal(cup.vitaminC,null);assert.ok(food.partialNutrients.includes('kcal'));assert.ok(food.partialNutrients.includes('potassium'));
  assert.equal(food.b12,0);assert.match(food.estimateNotes,/pozostawionych plastrów/);
  assert.equal(food.teaRecipe.consumeAdditions,false);
});

test('whole edible fruit and ginger add their raw composition without diluting values by fruit mass',()=>{
  const food=createTeaFood(recipe({lemon:1,orange:1,ginger:1,sugar:1,consumeAdditions:true}));
  const cup=scaleFood(food,250);
  near(cup.kcal,35.75);near(cup.vitaminC,16.04);
  near(cup.fiber,.8);assert.ok(!food.partialNutrients.includes('vitaminC'));
  near(scaleFood(food,500).vitaminC,32.08);
  assert.match(food.estimateNotes,/bez korekty strat od ciepła/);
});

test('changing only quantity preserves a recorded composition; changing extras rebuilds once from ingredients',()=>{
  const saved={...createTeaFood(recipe({sugar:2})),kcal:99};
  assert.equal(configuredTeaFood(saved,teaRecipeOf(saved)),saved);
  const changed=configuredTeaFood(saved,recipe({sugar:1}));
  near(scaleFood(changed,250).kcal,21.85);
  near(scaleFood(configuredTeaFood(changed,recipe({sugar:2})),250).kcal,41.2);
  assert.equal(configuredTeaFood(saved,recipe({sugar:''})),null);
});

test('recipe parsing accepts zero and fractional counters but saved recipes require bounded numeric counts and known fields',()=>{
  assert.equal(normalizeTeaRecipe(recipe({sugar:'0,5'})).sugar,.5);
  assert.equal(validTeaRecipe(recipe({sugar:'0.5'})),false);
  assert.equal(validTeaRecipe(recipe({sugar:.5})),true);
  for(const extra of [{sugar:-1},{sugar:21},{sugar:Infinity},{sugar:1.001},{sugar:''},{sugar:'1e1'},{version:2},{consumeAdditions:'false'},{unknown:1}])assert.equal(validTeaRecipe(recipe(extra)),false,JSON.stringify(extra));
});

test('worker saves one composed tea snapshot and restores extras, partial nutrients and original estimates on read',async()=>{
  let saved;
  const env={APP_PASSWORD:'test-tea-password',SESSION_SECRET:'test-tea-session-secret-long-enough',DB:{
    prepare(sql){return {bind(...args){return {run:async()=>{if(sql.startsWith('INSERT INTO entries'))saved={id:args[0],day:args[1],meal:args[2],grams:args[3],food_json:args[4]};return {success:true};}};},all:async()=>({results:sql.includes('FROM entries')&&saved?[saved]:[]}),first:async()=>null};}
  }};
  let cookie='';
  const ask=(route,method='GET',body)=>worker.fetch(new Request('https://forma.test/api/'+route,{method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env,{});
  const login=await ask('login','POST',{password:env.APP_PASSWORD});cookie=login.headers.get('Set-Cookie').split(';')[0];
  const food=createTeaFood(recipe({lemon:2,ginger:.5,sugar:1}));
  const entry={id:'entry:tea',day:'2026-11-18',meal:'breakfast',grams:500,food};
  assert.equal((await ask('entries','POST',entry)).status,200);
  const state=await (await ask('state')).json();assert.equal(state.entries.length,1);assert.deepEqual(state.entries[0],entry);
  for(const change of [{teaRecipe:recipe({sugar:'1'})},{teaRecipe:recipe({sugar:-1})},{teaRecipe:recipe({sugar:21})},{teaRecipe:recipe({consumeAdditions:1})},{teaRecipe:recipe({extra:true})},{unit:'g'},{id:'own:tea'}])assert.equal((await ask('entries','POST',{...entry,food:{...food,...change}})).status,400,JSON.stringify(change));
});
