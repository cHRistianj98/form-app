import test from 'node:test';
import assert from 'node:assert/strict';
import {calcDailyBalance,calcDailyMovement,calcTargets} from '../src/foods.js';
import {recentEnergyDays,nutritionReport} from '../src/nutritionStats.js';
import {DEFAULT_PROFILE} from '../src/profile.js';
import {progressPresentation} from '../src/progressPresentation.js';
import {buildNutritionExport} from '../src/nutritionExport.js';

const day='2026-11-17';
const entry=(date,kcal)=>({day:date,grams:100,food:{id:'own:test',name:'Posiłek',kcal,protein:10,carbs:20,fat:5}});

test('movement grows the selected day budget and net history subtracts the same amount once',()=>{
  const entries=[entry(day,518)],daily=[{day,steps:6200}],activities=[];
  const movement=calcDailyMovement(6200,activities);
  assert.deepEqual(movement,{workout:0,stepsBurn:128,total:128});
  assert.deepEqual(calcDailyBalance(calcTargets(DEFAULT_PROFILE,93),518,movement.total),{budget:2728,remaining:2210});
  const history=recentEnergyDays({entries,daily,activities,day});
  assert.equal(history.length,7);
  assert.equal(history.at(-1).eaten,518);assert.equal(history.at(-1).net,390);
  assert.equal(history.at(-2).net,null);
  const report=nutritionReport({entries,daily,activities,profile:DEFAULT_PROFILE,day,today:day});
  assert.equal(report.goals.kcal,2728);assert.equal(report.summary.totals.kcal,518);
  assert.equal(report.goals.protein,180);
});

test('training and steps are date specific, covered walking steps are not counted twice, and future logs stay out',()=>{
  const previous='2026-11-16';
  const activities=[{day:previous,type:'walk',minutes:30,kcal:150,includedInSteps:true},{day:previous,type:'strength',minutes:45,kcal:200},{day:'2026-11-18',kcal:999}];
  const daily=[{day:previous,steps:8000},{day,steps:6200}];
  const history=recentEnergyDays({entries:[entry(previous,100),entry(day,518)],daily,activities,day});
  assert.equal(history.at(-2).movement,430);assert.equal(history.at(-2).net,-330);
  assert.equal(history.at(-1).movement,128);assert.equal(history.at(-1).net,390);
  const report=nutritionReport({entries:[],daily,activities,profile:DEFAULT_PROFILE,day,period:'week',today:day});
  assert.equal(report.goals.kcal,2600*7+430+128);
  assert.equal(report.days.find(d=>d.day==='2026-11-18').movement,0);
});

test('missing food energy remains unknown while a recorded zero can have a negative net value',()=>{
  const activities=[{day,kcal:300}];
  const unknown=recentEnergyDays({entries:[entry(day,null)],daily:[],activities,day}).at(-1);
  const zero=recentEnergyDays({entries:[entry(day,0)],daily:[],activities,day}).at(-1);
  assert.equal(unknown.net,null);assert.equal(zero.net,-300);
});

test('progress keeps full large percentages and uncertainty metadata without approximation symbols',()=>{
  assert.equal(progressPresentation(103,5,{partial:true}).text,'2060%');
  assert.equal(progressPresentation(103,5,{partial:true}).approximate,true);
  assert.equal(progressPresentation(52.94,100,{upper:true}).text,'53%');
  assert.equal(progressPresentation(100000,1).text,'10000000%');
});

test('Garmin active total replaces both local movement estimates, with zero distinct from missing data',()=>{
  const activities=[{kcal:300}],estimate=calcDailyMovement(8000,activities);
  assert.equal(estimate.total,500);
  const movement=calcDailyMovement(8000,activities,247);
  assert.equal(movement.total,247);assert.equal(movement.source,'garmin');assert.equal(movement.workout,300);
  assert.deepEqual(calcDailyBalance(calcTargets(DEFAULT_PROFILE,93),1000,movement.total),{budget:2847,remaining:1847});
  assert.equal(calcDailyMovement(8000,activities,0).total,0);
  for(const missing of [undefined,null,'247',-1,NaN,Infinity,30001])assert.deepEqual(calcDailyMovement(8000,activities,missing),estimate);
});

test('history, reports and text export use the same day-specific Garmin calories once, even with logged workouts',()=>{
  const previous='2026-11-16',future='2026-11-18';
  const daily=[{day:previous,steps:8000,garminActiveKcal:0},{day,steps:8000,garminActiveKcal:247},{day:future,garminActiveKcal:999}];
  const activities=[{day,type:'strength',minutes:45,kcal:300},{day:previous,kcal:200},{day:future,kcal:999}];
  const entries=[entry(previous,1000),entry(day,1000)];
  const history=recentEnergyDays({entries,daily,activities,day});
  assert.equal(history.at(-1).movement,247);assert.equal(history.at(-1).net,753);
  assert.equal(history.at(-2).movement,0);assert.equal(history.at(-2).net,1000);
  const report=nutritionReport({entries,daily,activities,profile:DEFAULT_PROFILE,day,period:'week',today:day});
  assert.equal(report.goals.kcal,2600*7+247);assert.equal(report.days.find(d=>d.day===future).movement,0);
  const exported=buildNutritionExport({entries,daily,activities,profile:DEFAULT_PROFILE,day,period:'week',today:day}).text;
  assert.match(exported,/247 kcal aktywnych z Garmin Connect/);assert.match(exported,/0 kcal aktywnych z Garmin Connect/);
  assert.match(exported,/2600 kcal \+ 247 kcal ruchu = 2847 kcal/);
  assert.match(exported,/Znane spożycie minus ruch: 1753 kcal/);
  assert.doesNotMatch(exported,/kroki ponad bazę 200 kcal \+ treningi 300 kcal =/);
});
