import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNutritionExport,exportDates,isReportSupplement,shiftExportPeriod} from '../src/nutritionExport.js';
import {DEFAULT_PROFILE} from '../src/profile.js';
import {FAVORITE_FOODS} from '../src/foods.js';
import {NUTRIENT_FIELDS} from '../src/nutrients.js';
import {SUPPLEMENTS} from '../src/supplements.js';
import {createTeaFood} from '../src/tea.js';
import {DEFAULT_TEA_RECIPE} from '../src/teaRecipe.js';

const day='2026-11-18',profile={...DEFAULT_PROFILE};
const food=(id,extra={})=>({...Object.fromEntries(NUTRIENT_FIELDS.map(key=>[key,null])),id:`own:${id}`,name:id,unit:'g',kcal:1000,protein:100,carbs:100,fat:20,...extra});
const entry=(food,grams=100,date=day,meal='breakfast')=>({id:`entry:${food.id}:${date}:${grams}`,day:date,meal,grams,food});
const build=extra=>buildNutritionExport({day,today:day,profile,entries:[],daily:[],activities:[],...extra});
const block=(text,start,end)=>text.slice(text.indexOf(start),end?text.indexOf(end,text.indexOf(start)):undefined);

test('export covers calendar days, Monday-Sunday weeks and full leap/DST/year-boundary months',()=>{
  assert.deepEqual(exportDates(day),[day]);
  assert.equal(exportDates('2027-01-01','week')[0],'2026-12-28');assert.equal(exportDates('2027-01-01','week').at(-1),'2027-01-03');
  for(const [date,count,last] of [['2024-02-20',29,'2024-02-29'],['2026-02-20',28,'2026-02-28'],['2026-03-29',31,'2026-03-31'],['2026-10-25',31,'2026-10-31'],['2026-12-31',31,'2026-12-31']]) {
    const dates=exportDates(date,'month');assert.equal(dates.length,count);assert.equal(new Set(dates).size,count);assert.equal(dates.at(-1),last);
  }
  assert.equal(shiftExportPeriod('2026-01-31','month',1),'2026-02-01');assert.equal(shiftExportPeriod('2026-01-01','month',-1),'2025-12-01');
  assert.equal(shiftExportPeriod(day,'week',-1),'2026-11-11');assert.equal(shiftExportPeriod(day,'day',1),'2026-11-19');
  assert.throws(()=>exportDates(day,'year'));
});

test('day export includes meal quantities and recorded capsules/tablets, their combined nutrients and a request for assessment',()=>{
  const magnesium=SUPPLEMENTS.find(food=>food.id==='supplement:essensey-magnesium-b6');
  const tablet=FAVORITE_FOODS.find(food=>food.unit==='tablet');
  const report=build({entries:[entry(food('Obiad',{magnesium:20,vitaminC:10}),50,day,'lunch'),entry(magnesium,2,day,'supplements'),entry(tablet,1)]});
  assert.equal(report.foodEntries,1);assert.equal(report.supplementEntries,2);assert.equal(report.loggedDays,1);
  assert.ok(report.text.includes('Obiad — 50 g'));assert.ok(report.text.includes('Magnez + B6 (Essensey) — 2 kaps.'));
  assert.ok(report.text.includes('1 tabl.'));assert.ok(report.text.includes('Średnia znanej ilości: 385 mg/dzień'));
  assert.ok(report.text.includes('Jedzenie: 10 mg; suplementy: 375 mg (dane częściowe'));
  assert.ok(report.text.includes('Średnia znanej ilości: 85 mg/dzień'));
  assert.ok(report.text.includes('możliwe braki podaży'));assert.ok(report.text.includes('Źródła produktów i założenia'));
  assert.equal(isReportSupplement(entry(tablet)),true);assert.equal(isReportSupplement(entry(food('zupa'))),false);
});

test('calendar period filters out-of-range/future records and does not fill the diary from supplement schedules',()=>{
  const report=build({period:'week',entries:[entry(food('poniedziałek'),100,'2026-11-16'),entry(food('dzisiaj')),entry(food('PRZYSZŁY WPIS'),100,'2026-11-19'),entry(food('POZA ZAKRESEM'),100,'2026-11-15')]});
  assert.equal(report.from,'2026-11-16');assert.equal(report.to,'2026-11-22');assert.equal(report.elapsedDays,3);assert.equal(report.dayCount,7);assert.equal(report.entryCount,2);
  assert.equal(report.includedTo,day);assert.equal(report.text.includes('PRZYSZŁY WPIS'),false);assert.equal(report.text.includes('POZA ZAKRESEM'),false);
  assert.equal(report.supplementEntries,0);assert.equal(report.text.includes('Witamina D3 Forte'),false);
  const month=build({period:'month'});assert.equal(month.elapsedDays,18);assert.equal(month.dayCount,30);assert.equal(month.loggedDays,0);
  assert.ok(month.text.includes('0/18 uwzględnionych dni'));assert.ok(month.text.includes('Spożycie nieznane'));
  assert.equal(month.text.includes('Kalorie: 0 kcal'),false);assert.doesNotMatch(month.text,/NaN|Infinity|undefined/);
});

test('averages use only days with that nutrient, excluding empty days and unknown supplement-only energy',()=>{
  const d3=SUPPLEMENTS.find(food=>food.id==='supplement:essensey-vitamin-d3-forte');
  const report=build({period:'week',entries:[entry(food('A',{vitaminD:0}),100,'2026-11-16'),entry(d3,1,'2026-11-17','supplements'),entry(food('B',{kcal:2000,vitaminD:5}))]});
  const calories=block(report.text,'- Kalorie:','- Białko:');
  assert.ok(calories.includes('3000 kcal'));assert.ok(calories.includes('1500 kcal/dzień (2/3 dni z danymi; dane częściowe)'));
  const vitamin=block(report.text,'- Witamina D:','- Witamina E:');assert.ok(vitamin.includes('35 µg/dzień (3/3 dni z danymi)'));
  assert.ok(report.text.includes('Dni tylko z suplementami: 1'));
});

test('explicit zeros, partial recipe data, limits and tiny known values stay distinct without approximation symbols',()=>{
  const product=food('Granice',{fiber:0,vitaminD:.000001,fat:.005,upperBoundNutrients:['fat'],partialNutrients:['protein'],estimateNotes:'Tłuszcz < 0,1 g; suma ≥ 1. Szacunek ≈ 2.'});
  const report=build({entries:[entry(product)]});
  assert.ok(report.text.includes('Błonnik: 0 g'));assert.ok(report.text.includes('Witamina D: 0,000001 µg'));
  assert.ok(report.text.includes('Białko: 100 g (dane częściowe, dostępne wartości w 1/1 wpisów)'));
  assert.ok(report.text.includes('uwzględniono górną granicę z etykiety'));assert.ok(report.text.includes('Wapń: brak danych'));
  assert.doesNotMatch(report.text,/≥|≤|≈|~~|>|</);assert.ok(report.text.includes('co najmniej 1'));assert.ok(report.text.includes('mniej niż 0,1'));
});

test('recorded supplement compositions and consumed doses override current catalog data, with EPA/DHA not added to oil',()=>{
  const omega=SUPPLEMENTS.find(food=>food.id==='supplement:now-omega-3');
  const earlier={...omega,epa:100,fishOil:800,kcal:8};
  const report=build({period:'week',entries:[entry(earlier,1,'2026-11-16','supplements'),entry(omega,2,day,'supplements')]});
  assert.ok(report.text.includes('EPA: 460 mg'));assert.ok(report.text.includes('Olej rybi: 2800 mg'));
  assert.ok(report.text.includes('3 kaps. w 2 dniach'));assert.ok(report.text.includes('Plan z ustawień: 2 kaps. — codziennie'));
  assert.ok(report.text.includes('Skład przyjętej porcji: EPA: 100 mg'));
  assert.ok(report.text.includes('EPA i DHA są częścią oleju rybiego'));
});

test('historical weights and day goals exclude future measurements while movement is counted once',()=>{
  const run={id:'activity:run',day:'2026-11-16',type:'run',minutes:60,distance:5,kcal:400,includedInSteps:true};
  const d3=SUPPLEMENTS.find(food=>food.id==='supplement:essensey-vitamin-d3-forte');
  const report=build({period:'week',profile:{...profile,manualProtein:0,proteinFactor:2},entries:[entry(food('Meal'),100,'2026-11-16'),entry(d3,1,'2026-11-17','supplements')],daily:[{day:'2026-11-16',weight:91,steps:10000},{day:'2026-11-17',steps:10000},{day:'2026-11-19',weight:70,steps:100000}],activities:[run]});
  assert.ok(report.text.includes('Masa użyta w planie na 18.11.2026: 91 kg'));assert.ok(report.text.includes('białko 182 g'));
  assert.ok(report.text.includes('2600 kcal + 430 kcal ruchu = 3030 kcal'));
  assert.ok(report.text.includes('Zapisany ruch w uwzględnionych dniach: 710 kcal'));
  assert.ok(report.text.includes('Znane spożycie minus ruch: 570 kcal z 1 dnia ze znanymi kaloriami (spożycie częściowe)'));
  assert.equal(report.text.includes('70 kg'),false);
});

test('tea report includes actual total additions and honest infusion assumptions, and preserves source units',()=>{
  const tea=createTeaFood({...DEFAULT_TEA_RECIPE,sugar:2,lemon:1});
  const report=build({entries:[entry(tea,500)]});
  assert.ok(report.text.includes('2 kubki (500 ml)'));assert.ok(report.text.includes('Cytryna: 20 g, Cukier: 20 g'));
  assert.ok(report.text.includes('plastry pozostają w kubku; transfer składników nieznany'));
  assert.ok(report.text.includes('Witamina C: brak danych'));assert.ok(report.text.includes('173227/nutrients'));
  assert.ok(report.text.includes('µg RE'));assert.ok(report.text.includes('mg NE'));
});

test('full monthly export remains chronological and complete with no truncated text or mutations of saved data',()=>{
  const entries=exportDates('2026-10-20','month').flatMap(date=>[entry(food('Śniadanie',{calcium:100,vitaminC:50}),200,date),entry(food('Kolacja',{magnesium:100}),150,date,'dinner')]).reverse();
  const before=structuredClone(entries);
  const report=build({day:'2026-10-20',period:'month',entries});
  assert.equal(report.loggedDays,31);assert.equal(report.entryCount,62);assert.deepEqual(entries,before);
  assert.ok(report.text.indexOf('### 01.10.2026')<report.text.indexOf('### 31.10.2026'));
  assert.equal((report.text.match(/### \d{2}\.10\.2026/g)||[]).length,31);
  assert.ok(report.text.length>20000);assert.ok(report.text.endsWith('zapis produktu.'));
});

test('export includes only nutrition context, not storage secrets, image data or private daily notes',()=>{
  const report=build({profile:{...profile,password:'SECRET_PASSWORD'},daily:[{day,weight:94.75,notes:'PRIVATE_NOTES'}],entries:[entry(food('Nazwa\nFałszywy nagłówek',{image:'data:image/webp;base64,IMAGE_SECRET'}))]});
  assert.doesNotMatch(report.text,/SECRET_PASSWORD|PRIVATE_NOTES|IMAGE_SECRET|data:image/);
  assert.ok(report.text.includes('94,75 kg'));assert.ok(report.text.includes('Nazwa Fałszywy nagłówek — 100 g'));
});
