import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE_FOODS} from '../src/foods.js';
import {SUPPLEMENTS} from '../src/supplements.js';
import {assessDailyIntake,plannedSupplementOverlaps} from '../src/intakeAlerts.js';
import {nutritionReport} from '../src/nutritionStats.js';
import {buildNutritionExport} from '../src/nutritionExport.js';
import {DEFAULT_PROFILE} from '../src/profile.js';
import {progressPresentation} from '../src/progressPresentation.js';

const day='2026-11-17';
const product=id=>SUPPLEMENTS.find(food=>food.id===`supplement:${id}`);
const intake=(food,grams=1,date=day)=>({food,grams,day:date,meal:'supplements'});
const meal=(nutrients,date=day)=>({food:{id:'own:meal',name:'Posiłek',...nutrients},grams:100,day:date,meal:'lunch'});

test('UL warnings use quantities from food and supplements, except magnesium from natural foods',()=>{
  const d3=product('essensey-vitamin-d3-forte');
  const magnesium=product('essensey-magnesium-b6');
  let result=assessDailyIntake([intake(d3),intake(magnesium),meal({magnesium:500})]);
  assert.deepEqual(result.limits.map(row=>[row.key,row.status,row.value]),[['vitaminD','at',100]]);
  result=assessDailyIntake([intake(d3),intake(magnesium,2),meal({vitaminD:2,magnesium:500})]);
  assert.deepEqual(result.limits.map(row=>[row.key,row.status,row.value,row.supplementsOnly]),[
    ['vitaminD','over',102,false],['magnesium','over',375,true],
  ]);
  const selenium=product('essensey-selenium-pro-forte');
  const tuna=BASE_FOODS.find(food=>food.id==='base:tuna');
  const {limits}=assessDailyIntake([intake(selenium),{...meal({}),food:tuna}]);
  assert.equal(limits[0].key,'selenium');
  assert.equal(limits[0].value,280.4);
  assert.deepEqual(assessDailyIntake([meal({vitaminA:7000,b3:1000,folate:5000,iron:100,vitaminC:1000})]).limits,[]);
});

test('upper-bound label amounts support a possible warning rather than a confirmed excess',()=>{
  const zinc=product('essensey-zinc');
  const upper=meal({zinc:12,upperBoundNutrients:['zinc']});
  const {limits:[alert]}=assessDailyIntake([intake(zinc),upper]);
  assert.equal(alert.status,'possible');
  assert.equal(alert.value,27);
  const {limits:[definite]}=assessDailyIntake([intake(zinc,2),upper,meal({})]);
  assert.equal(definite.status,'over');
  assert.equal(definite.value,30);
});

test('daily rings show progress against each threshold and use the day’s confirmed UL status',()=>{
  const ring=(zinc,upper=false)=>{
    const reading=assessDailyIntake([meal({zinc,upperBoundNutrients:upper?['zinc']:[]})]).limitReadings.zinc;
    return progressPresentation(zinc,10,{mode:'daily-reference',intakeLimit:reading,upper});
  };
  assert.deepEqual([ring(5).tone,ring(5).fraction,ring(5).secondFraction],['reference',.5,0]);
  assert.deepEqual([ring(10).done,ring(10).fraction,ring(10).secondFraction],[true,1,0]);
  assert.deepEqual([ring(17.5).tone,ring(17.5).fraction,ring(17.5).secondFraction,ring(17.5).text],['done',1,.5,'175%']);
  assert.equal(ring(25).status,'Na poziomie UL');
  assert.equal(ring(26).tone,'exceeded');
  assert.equal(ring(26,true).tone,'limit');
  assert.equal(ring(17.5,true).done,false);
  assert.equal(progressPresentation(26,10,{mode:'reference'}).tone,'reference');
  assert.equal(progressPresentation(null,10,{mode:'daily-reference'}).tone,'unknown');
});

test('magnesium limit readings track the supplemental amount even below the limit',()=>{
  const magnesium=product('essensey-magnesium-b6');
  const food=meal({magnesium:500});
  assert.equal(assessDailyIntake([food]).limitReadings.magnesium,undefined);
  assert.deepEqual(assessDailyIntake([food,intake(magnesium)]).limitReadings.magnesium,
    {limit:250,total:187.5,knownMinimum:187.5,status:null});
});

test('overlap means distinct products, with active plan and recorded intake evaluated separately',()=>{
  const zinc=product('essensey-zinc');
  const biotin=product('essensey-biotin-horsetail-zinc');
  const planned=plannedSupplementOverlaps([zinc,biotin],DEFAULT_PROFILE.supplementPlan);
  assert.deepEqual(planned.map(row=>row.key),['zinc']);
  assert.deepEqual(planned[0].products.map(row=>row.amount),[15,10]);
  assert.match(planned[0].products[0].schedule,/Nieparzyste/);
  assert.deepEqual(plannedSupplementOverlaps([zinc,biotin],{[zinc.id]:{quantity:0,schedule:'daily'}}),[]);
  assert.deepEqual(assessDailyIntake([intake(zinc),intake(zinc)]).overlaps,[]);
  const result=assessDailyIntake([intake(zinc),intake(biotin)]);
  assert.equal(result.overlaps[0].key,'zinc');
  assert.equal(result.limits[0].status,'at');
});

test('weekly statistics and text report flag the affected day, and separate the two energy goals',()=>{
  const entries=[intake(product('essensey-vitamin-d3-forte'),2),meal({kcal:1000},'2026-11-18'),intake(product('essensey-vitamin-d3-forte'),8,'2026-11-19')];
  const options={entries,daily:[{day,garminActiveKcal:247}],profile:DEFAULT_PROFILE,day,period:'week',today:'2026-11-18'};
  const report=nutritionReport(options);
  assert.equal(report.baseCalories,2600*7);
  assert.equal(report.goals.kcal,2600*7+247);
  assert.deepEqual(report.days.filter(row=>row.intake.limits.length).map(row=>row.day),[day]);
  assert.equal(report.days.find(row=>row.day===day).intake.limits[0].value,200);
  const {text}=buildNutritionExport(options);
  assert.match(text,/Cel bazowy w okresie: 7800 kcal\. Cel z ruchem: 8047 kcal/);
  assert.match(text,/Witamina D: Powyżej UL\. znana suma 200 µg \/ UL 100 µg\/dzień/);
  assert.doesNotMatch(text,/znana suma 800 µg/);
  assert.equal(progressPresentation(200,100,{mode:'reference'}).done,false);
});
