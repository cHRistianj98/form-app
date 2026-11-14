import test from 'node:test';
import assert from 'node:assert/strict';
import {FAVORITE_FOODS,foodBasis,foodOptions,scaleFood} from '../src/foods.js';
import {DAILY_REFERENCES,NUTRIENT_FIELDS} from '../src/nutrients.js';
import {calendarWeek,nutritionReport,sumNutrition,targetsOnDay,totalLabel} from '../src/nutritionStats.js';
import {DEFAULT_PROFILE} from '../src/profile.js';

const get=id=>FAVORITE_FOODS.find(f=>f.id===`favorite:${id}`);
const entry=(food,grams,day='2026-11-14')=>({id:`entry:${food.id}:${grams}:${day}`,food,grams,day,meal:'breakfast'});

test('new label data retains macros, sugar, saturated fat, fibre and salt without replacing unknowns',()=>{
  const rows=FAVORITE_FOODS.slice(7,15).map(f=>[f.kcal,f.protein,f.fat,f.carbs,f.sugars,f.saturatedFat,f.fiber,f.salt]);
  assert.deepEqual(rows,[
    [753,0.6,83,0.8,0.8,54,null,0],
    [711,18.1,67.8,4,2,7.1,6.1,0.03],
    [352,86,0.5,1,1,0.5,0,0.83],
    [340,11,0.9,71,1.7,0.3,null,0],
    [309,24,11,13,0.5,6.4,null,0.06],
    [110,20.7,2.1,1.7,1.4,0.8,0.6,1.8],
    [244,2.7,21,10,10,13,0,0.19],
    [291,2.3,27.7,8,8,20,null,0.08],
  ]);
  assert.equal(get('laciate-butter').vitaminA,725);
  assert.equal(get('laciate-butter').vitaminD,7.5);
  assert.equal(get('laciate-butter').vitaminK,17.25);
});

test('multivitamin scales per tablet and supplies 100 percent of its ten stated daily label references',()=>{
  const supplement=get('plusssz-multivitamin');
  assert.equal(foodBasis(supplement),1);
  const nutrients=scaleFood(supplement,1);
  for (const key of ['vitaminC','vitaminE','b1','b2','b3','b5','b6','biotin','folate','b12']) {
    assert.equal(nutrients[key],DAILY_REFERENCES[key].value,key);
    assert.equal(scaleFood(supplement,2)[key],nutrients[key]*2,key);
  }
  for (const key of ['kcal','protein','fat','carbs','fiber','vitaminA','vitaminD','vitaminK']) assert.equal(nutrients[key],null,key);
});

test('grams and microgram vitamins scale consistently for food and protein powder',()=>{
  const whey=scaleFood(get('olimp-whey-isolate'),30);
  assert.equal(whey.kcal,105.6);
  assert.equal(whey.protein,25.8);
  assert.equal(whey.vitaminA,36);
  assert.equal(whey.vitaminC,3.6);
  assert.equal(whey.b12,0.114);
  assert.equal(whey.b5,null);
  const butter=scaleFood(get('laciate-butter'),10);
  assert.equal(butter.vitaminA,72.5);
  assert.equal(butter.vitaminD,0.75);
  assert.equal(butter.vitaminK,1.725);
});

test('aggregation preserves true zero and all-unknown values, and shows coverage for partial sums',()=>{
  const whey=entry(get('olimp-whey-isolate'),100);
  const tablet=entry(get('plusssz-multivitamin'),1);
  assert.equal(sumNutrition([]).totals.kcal,null);
  assert.equal(sumNutrition([tablet]).totals.kcal,null);
  assert.equal(totalLabel(sumNutrition([tablet]),'kcal'),'—');
  const partial=sumNutrition([whey,tablet]);
  assert.equal(partial.totals.kcal,352);
  assert.equal(totalLabel(partial,'kcal',0),'≥ 352');
  assert.deepEqual(partial.coverage.kcal,{known:1,total:2,complete:false,upper:false});
  assert.equal(partial.totals.fiber,0);
  assert.equal(totalLabel(partial,'fiber'),'≥ 0');
  assert.equal(partial.totals.vitaminC,92);
  assert.equal(partial.coverage.vitaminC.complete,true);
  assert.equal(partial.totals.b5,6);
  assert.equal(partial.coverage.b5.known,1);
  assert.equal(totalLabel(sumNutrition([whey]),'fiber'),'0');
});

test('mixed bounds and missing data do not claim an exact or false lower/upper total',()=>{
  const milk=entry(get('lidl-protein-milk'),100);
  const tablet=entry(get('plusssz-multivitamin'),1);
  assert.equal(totalLabel(sumNutrition([milk]),'fat'),'< 0,5');
  assert.equal(totalLabel(sumNutrition([milk,tablet]),'fat'),'≈ 0,5');
  const tiny={...get('laciate-butter'),kcal:0.09};
  assert.equal(totalLabel(sumNutrition([entry(tiny,100),tablet]),'kcal',1),'≥ 0');
});

test('calendar weeks start on Monday across year boundaries and include Sunday',()=>{
  assert.deepEqual(calendarWeek('2027-01-01'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
  assert.equal(calendarWeek('2026-11-15')[0],'2026-11-09');
});

test('weekly report separates logged, empty and future days, uses full seven-day targets and honest averages',()=>{
  const profile={...DEFAULT_PROFILE};
  const entries=[entry(get('olimp-whey-isolate'),100,'2026-11-09'),entry(get('plusssz-multivitamin'),1,'2026-11-10'),entry(get('olimp-whey-isolate'),100,'2026-11-15')];
  const report=nutritionReport({entries,daily:[],profile,day:'2026-11-14',period:'week',today:'2026-11-14'});
  assert.equal(report.from,'2026-11-09');assert.equal(report.to,'2026-11-15');
  assert.equal(report.loggedDays,2);assert.equal(report.elapsedDays,6);
  assert.equal(report.goals.kcal,18200);assert.equal(report.goals.protein,1260);
  assert.equal(report.summary.totals.kcal,352);
  assert.equal(totalLabel(report.summary,'kcal',0,report.loggedDays),'≥ 176');
  assert.equal(report.days[2].summary.totals.kcal,null);
  assert.equal(report.days[6].future,true);
  assert.equal(report.days[6].summary.entryCount,0);
  assert.equal(report.summary.totals.vitaminC,92);
  assert.equal(report.summary.totals.vitaminC/(DAILY_REFERENCES.vitaminC.value*7)*100,92/560*100);
});

test('historical daily goals use only weight known by that day',()=>{
  const profile={...DEFAULT_PROFILE,manualCalories:0};
  const daily=[{day:'2026-11-11',weight:85},{day:'2026-11-01',weight:93}];
  assert.equal(targetsOnDay(profile,daily,'2026-11-10').weight,93);
  assert.equal(targetsOnDay(profile,daily,'2026-11-14').weight,85);
});

test('short aliases and named serving sizes are usable without losing original label data',()=>{
  assert.equal(foodOptions('plussz')[0].id,get('plusssz-multivitamin').id);
  assert.equal(foodOptions('izolat')[0].id,get('olimp-whey-isolate').id);
  assert.equal(foodOptions('mąka basia')[0].id,get('basia-pizza-flour').id);
  assert.equal(get('vanilla-aerosol-cream').servingSizes[0].quantity,10);
  for(const food of FAVORITE_FOODS.slice(7)) for(const key of NUTRIENT_FIELDS) assert.ok(Object.hasOwn(food,key),`${food.id}:${key}`);
});
