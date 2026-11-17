import test from 'node:test';
import assert from 'node:assert/strict';
import {calcDailyBalance,calcDailyMovement,calcTargets} from '../src/foods.js';
import {recentEnergyDays,nutritionReport} from '../src/nutritionStats.js';
import {DEFAULT_PROFILE} from '../src/profile.js';
import {progressPresentation} from '../src/progressPresentation.js';

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
