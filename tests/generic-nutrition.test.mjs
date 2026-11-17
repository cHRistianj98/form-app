import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE_FOODS,FAVORITE_FOODS,scaleFood} from '../src/foods.js';
import {enrichGenericFood,genericNutritionGap,genericNutritionInfo} from '../src/genericNutrition.js';
import {NUTRIENT_FIELDS} from '../src/nutrients.js';
import {nutritionReport,sumNutrition} from '../src/nutritionStats.js';
import {DEFAULT_PROFILE} from '../src/profile.js';

const data=JSON.parse(readFileSync(new URL('../src/genericFoodNutrients.json',import.meta.url),'utf8'));
const estimates=JSON.parse(readFileSync(new URL('../src/genericFoodEstimates.json',import.meta.url),'utf8'));
const get=id=>BASE_FOODS.find(f=>f.id===`base:${id}`);
const legacy=id=>({id:`base:${id}`,name:get(id).name,source:'Orientacyjne',kcal:get(id).kcal,protein:get(id).protein,carbs:get(id).carbs,fat:get(id).fat});
const entry=(food,grams,day='2026-11-14')=>({food,grams,day});
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<0.000001,`${actual} != ${expected}`);

test('all 45 generic foods have reviewed composition sources including six explicit supplementary estimates',()=>{
  assert.equal(BASE_FOODS.length,45);
  assert.equal(Object.keys(data.foods).length,39);
  assert.equal(Object.keys(data.unmatched).length,6);
  assert.equal(Object.keys(estimates.foods).length,6);
  assert.match(data.sha256,/^[a-f0-9]{64}$/);
  for(const food of BASE_FOODS) {
    const info=genericNutritionInfo(food);
    assert.ok(info,food.id);
    assert.equal(genericNutritionGap(food),null,food.id);
    assert.equal(data.basisQuantity,100);
    assert.equal(data.unit,'g');
    if(info.fdcId)assert.match(info.url,new RegExp(`/food-details/${info.fdcId}/nutrients$`));
    else assert.ok(info.sourceIds.length>0&&info.url.startsWith('https:'));
    for(const [key,value] of Object.entries(info.nutrients)) {
      assert.ok(NUTRIENT_FIELDS.includes(key),key);
      assert.ok(!['kcal','protein','carbs','fat'].includes(key),key);
      assert.ok(Number.isFinite(value)&&value>=0,`${food.id}:${key}`);
      assert.equal(food[key]!=null,true,`${food.id}:${key}`);
    }
  }
});

test('raw tomato, leaf lettuce and cucumber include source-backed minerals and vitamins per 100 g',()=>{
  const tomato=get('tomato');
  assert.equal(genericNutritionInfo(tomato).fdcId,170457);
  assert.equal(tomato.calcium,10);assert.equal(tomato.magnesium,11);
  assert.equal(tomato.iron,0.27);assert.equal(tomato.vitaminK,7.9);
  assert.equal(tomato.folate,15);assert.equal(tomato.b6,0.08);
  // The already recorded C=13.7 is preserved, not replaced by USDA C=13.7.
  assert.equal(scaleFood(tomato,200).vitaminC,27.4);
  assert.equal(scaleFood(tomato,200).folate,30);
  const lettuce=get('lettuce');
  assert.equal(genericNutritionInfo(lettuce).fdcId,169249);
  assert.equal(lettuce.potassium,194);assert.equal(lettuce.vitaminK,126.3);
  assert.equal(lettuce.folate,38);assert.equal(lettuce.vitaminC,9.2);
  assert.equal(get('cucumber').vitaminK,16.4);
});

test('EU vitamin A RE, niacin NE, salt and microgram units use the correct conversions',()=>{
  for(const record of Object.values(data.foods)) {
    const n=record.nutrients,c=record.conversionInputs;
    if(n.vitaminA!=null) near(n.vitaminA,c[1105]+c[1107]/6+(c[1108]+c[1120])/12);
    if(n.b3!=null) near(n.b3,c[1167]+c[1210]*1000/60);
    if(n.salt!=null) near(n.salt,c[1093]*2.5/1000);
  }
  near(get('carrot').vitaminA,8285/6+3477/12);
  near(scaleFood(get('carrot'),50).vitaminA,(8285/6+3477/12)/2);
  assert.equal(scaleFood(get('lettuce'),50).vitaminK,63.15);
  assert.equal(scaleFood(get('onion'),50).iron,0.105);
  assert.equal(get('milk').vitaminD,0); // Reported zero from the unfortified record.
});

test('dry/cooked foods and unfortified sources remain distinct',()=>{
  assert.equal(genericNutritionInfo(get('rice')).fdcId,169756);
  assert.equal(genericNutritionInfo(get('ricec')).fdcId,169757);
  assert.equal(get('rice').magnesium,25);assert.equal(get('ricec').magnesium,12);
  assert.equal(get('rice').folate,8);assert.equal(get('ricec').folate,3);
  assert.equal(get('pasta').folate,18);assert.equal(get('pastac').folate,7);
  assert.equal(genericNutritionInfo(get('milk')).fdcId,172205);
});

test('six previously missing foods gain traceable estimated micros without changing known values or old snapshots',()=>{
  for(const id of ['bread','roll','tortilla','tw','skyr','kefir']) {
    const info=genericNutritionInfo(get(id));
    assert.ok(Object.keys(info.nutrients).length>=18,id);
    assert.ok(info.method.length>40,id);
    const old=legacy(id),before=structuredClone(old),portion=scaleFood(old,150);
    assert.deepEqual(old,before);
    near(portion.kcal,before.kcal*1.5);
    near(portion.protein,before.protein*1.5);
    assert.ok(portion.b1>0);assert.ok(portion.magnesium>0);
  }
  assert.equal(get('tw').calcium,90);
  assert.equal(get('bread').salt,1.2);
  assert.equal(get('skyr').b12,.7);
  assert.equal(get('skyr').magnesium,12);
  assert.equal(get('skyr').biotin,undefined);
  assert.ok(get('bread').biotin>0);
  assert.deepEqual(estimates.foods['base:tortilla'].sourceIds,[169761,172336]);
  assert.match(genericNutritionInfo(get('tortilla')).method,/mąki niewzbogacanej/);
  assert.match(estimates.frida.sha256,/^[a-f0-9]{64}$/);
  assert.equal(estimates.frida.license,'CC BY 4.0');
});

test('legacy generic entries gain only missing data in calculations without mutating snapshots',()=>{
  const old={...legacy('tomato'),iron:0,vitaminC:99,magnesium:null,folate:''};
  const before=structuredClone(old);
  const portion=scaleFood(old,200);
  assert.equal(portion.kcal,36);assert.equal(portion.protein,1.8);
  assert.equal(portion.iron,0);assert.equal(portion.vitaminC,198);
  assert.equal(portion.magnesium,22);assert.equal(portion.folate,30);
  assert.deepEqual(old,before);
  const filled=enrichGenericFood(old);
  assert.equal(enrichGenericFood(filled),filled); // Idempotent.
  assert.equal(filled.potassium,237);
  assert.equal(get('oats').magnesium,177); // Preserve previous catalog estimate.
  assert.equal(get('cheese').calcium,721);
  assert.equal(get('milk').b12,0.5);
});

test('unknown biotin stays unknown and labels, personal foods and ml/tablets never get generic estimates',()=>{
  assert.equal(scaleFood(get('tomato'),100).biotin,null);
  for(const food of FAVORITE_FOODS) assert.equal(enrichGenericFood(food),food);
  const candidates=[
    {...legacy('tomato'),id:'own:tomato'},
    {...legacy('tomato'),id:'off:1234567890123'},
    {...legacy('tomato'),brand:'Markowy'},
    {...legacy('tomato'),source:'Własny'},
    {...legacy('tomato'),source:'Twoja tabela'},
    {...legacy('tomato'),unit:'ml'},
    {...legacy('tomato'),unit:'tablet',basisQuantity:1},
    {...legacy('tomato'),basisQuantity:1},
  ];
  for(const food of candidates) {
    assert.equal(enrichGenericFood(food),food);
    assert.equal(genericNutritionInfo(food),null);
    assert.equal(scaleFood(food,100).magnesium,null);
  }
  assert.equal(enrichGenericFood(null),null);
});

test('day and calendar-week statistics include old generic micronutrients and retain honest coverage',()=>{
  const entries=[entry(legacy('tomato'),200),entry(legacy('lettuce'),50),
    entry({id:'own:unknown',name:'Inny produkt',kcal:10,protein:1,carbs:1,fat:0},100)];
  const summary=sumNutrition(entries);
  near(summary.totals.vitaminK,15.8+63.15);
  assert.deepEqual(summary.coverage.vitaminK,{known:2,total:3,complete:false,upper:false});
  assert.equal(summary.genericEntryCount,2);
  assert.equal(summary.totals.biotin,null);
  assert.equal(summary.coverage.biotin.known,0);
  const week=nutritionReport({entries,daily:[],profile:DEFAULT_PROFILE,day:'2026-11-14',period:'week',today:'2026-11-14'});
  assert.equal(week.summary.totals.vitaminK,summary.totals.vitaminK);
  assert.equal(week.summary.genericEntryCount,2);
});
