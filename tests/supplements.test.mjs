import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SUPPLEMENTS,isSupplement,supplementCatalog,supplementCount,supplementLogId} from '../src/supplements.js';
import {BASE_FOODS,foodBasis,foodImage,scaleFood} from '../src/foods.js';
import {sumNutrition,nutritionReport,totalLabel} from '../src/nutritionStats.js';
import {DEFAULT_PROFILE} from '../src/profile.js';
import worker from '../worker/index.js';

const get=id=>SUPPLEMENTS.find(food=>food.id===`supplement:${id}`);
const entry=(food,quantity=1,day='2026-11-16')=>({id:supplementLogId(day,food.id),day,meal:'supplements',grams:quantity,food});

test('six exact supplement variants use per-capsule manufacturer data and real local WebP packshots',()=>{
  assert.equal(SUPPLEMENTS.length,6);
  const credits=JSON.parse(readFileSync(new URL('../public/foods/credits.json',import.meta.url),'utf8'));
  for(const food of SUPPLEMENTS){
    assert.ok(isSupplement(food));assert.equal(foodBasis(food),1);assert.equal(food.unit,'capsule');
    assert.match(food.sourceUrl,/^https:\/\/(essensey\.com|www\.nowfoods\.com)\//);
    assert.equal(foodImage({id:food.id}),food.image);
    assert.equal(credits[food.id].source,food.sourceUrl);
    const bytes=readFileSync(new URL('../public'+food.image,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  }
  assert.equal(get('essensey-magnesium-b6').magnesium,187.5);
  assert.equal(scaleFood(get('essensey-magnesium-b6'),2).magnesium,375);
  assert.equal(scaleFood(get('essensey-magnesium-b6'),2).b6,1.4);
  assert.equal(get('essensey-biotin-horsetail-zinc').biotin,2500);
  assert.equal(get('essensey-biotin-horsetail-zinc').vitaminC,325);
  assert.equal(get('essensey-vitamin-d3-forte').vitaminD,100);
  assert.equal(get('now-omega-3').epa,180);assert.equal(get('now-omega-3').dha,120);
  assert.equal(get('now-omega-3').kcal,10);assert.equal(get('now-omega-3').fat,1);
  assert.equal(get('essensey-ashwagandha-forte').withanolides,10);
});

test('combined supplement nutrients scale with counts; unknown macro values stay unknown',()=>{
  const rows=SUPPLEMENTS.map(food=>entry(food,food.id.includes('magnesium')||food.id.includes('omega')?2:1));
  const summary=sumNutrition(rows);
  const expected={magnesium:375,b6:1.4,vitaminC:325,biotin:2500,zinc:25,vitaminD:100,fishOil:2000,epa:360,dha:240,ashwagandhaExtract:666,withanolides:10,horsetailExtract:150,silica:10.5};
  for(const [key,value] of Object.entries(expected))assert.equal(summary.totals[key],value,key);
  assert.equal(summary.totals.kcal,20);assert.equal(summary.totals.fat,2);
  assert.equal(summary.totals.protein,null);assert.equal(summary.totals.carbs,null);
  assert.equal(get('essensey-zinc').magnesium,null); // Capsule excipient is not a declared magnesium dose.
  assert.equal(totalLabel(summary,'kcal',0),'≥ 20');
  const beef=BASE_FOODS.find(food=>food.id==='base:beef');
  assert.ok(beef.zinc>0);
  const combined=sumNutrition([...rows,{id:'entry:beef',day:'2026-11-16',meal:'lunch',food:beef,grams:100}]);
  assert.equal(combined.totals.zinc,25+beef.zinc);
});

test('date-specific counters and calendar reports never repeat yesterday or include future intakes',()=>{
  const food=get('essensey-zinc');
  const rows=[entry(food,1,'2026-11-16'),entry(food,2,'2026-11-17'),entry(food,3,'2026-11-18')];
  assert.equal(supplementCount(rows,'2026-11-16',food.id),1);
  assert.equal(supplementCount(rows,'2026-11-19',food.id),0);
  assert.equal(nutritionReport({entries:rows,daily:[],profile:DEFAULT_PROFILE,day:'2026-11-16',today:'2026-11-17'}).summary.totals.zinc,15);
  const week=nutritionReport({entries:rows,daily:[],profile:DEFAULT_PROFILE,day:'2026-11-16',period:'week',today:'2026-11-17'});
  assert.equal(week.summary.totals.zinc,45);assert.equal(week.loggedDays,2);
  const own={id:'own:supplement:test',kind:'supplement',unit:'tablet',name:'Własny',zinc:2};
  assert.equal(supplementCatalog([own,{id:'own:food',name:'Danie'}]).length,7);
});

test('Worker upserts a single per-day count, preserves label data and custom WebP, and deletes intake',async()=>{
  const records=new Map(),foods=new Map();
  const env={APP_PASSWORD:'test-supplements',SESSION_SECRET:'test-supplements-session-secret-long-enough',DB:{prepare(sql){return{
    bind(...args){return{run:async()=>{
      if(sql.startsWith('INSERT INTO entries'))records.set(args[0],{id:args[0],day:args[1],meal:args[2],grams:args[3],food_json:args[4]});
      if(sql.startsWith('DELETE FROM entries'))records.delete(args[0]);
      if(sql.startsWith('INSERT INTO foods'))foods.set(args[0],{id:args[0],food_json:args[1]});
      return{success:true};
    }};},
    all:async()=>({results:sql.includes('FROM entries')?[...records.values()]:sql.includes('FROM foods')?[...foods.values()]:[]}),first:async()=>null,
  };}}};
  let cookie='';
  const ask=(path,method='GET',body)=>worker.fetch(new Request('https://forma.test/api/'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env,{});
  cookie=(await ask('login','POST',{password:env.APP_PASSWORD})).headers.get('Set-Cookie').split(';')[0];
  for(const food of SUPPLEMENTS)assert.equal((await ask('entries','POST',entry(food))).status,200,food.name);
  const mag=get('essensey-magnesium-b6');
  assert.equal((await ask('entries','POST',entry(mag,2))).status,200);
  let state=await(await ask('state')).json();
  assert.equal(state.entries.length,6);assert.equal(state.entries.find(e=>e.food.id===mag.id).grams,2);
  assert.equal(sumNutrition(state.entries).totals.magnesium,375);
  assert.deepEqual(state.entries.find(e=>e.food.id===mag.id).food,mag);
  const image='data:image/webp;base64,'+readFileSync(new URL('../public/foods/supp-essensey-zinc.webp',import.meta.url)).toString('base64');
  const custom={...mag,id:'own:supplement:test',name:'Mój suplement',image,unit:'tablet'};
  assert.equal((await ask('foods','POST',custom)).status,200);
  assert.equal((await ask('entries','POST',entry(custom,3))).status,200);
  state=await(await ask('state')).json();assert.equal(state.foods[0].image,image);
  assert.equal(state.entries.find(e=>e.food.id===custom.id).food.image,image);
  for(const changes of [{grams:0.5},{grams:-1},{grams:0},{meal:'breakfast'},{id:'entry:duplicate'}])assert.equal((await ask('entries','POST',{...entry(mag),...changes})).status,400,JSON.stringify(changes));
  for(const changes of [{kind:'food'},{unit:'g'},{basisQuantity:100},{magnesium:-1},{sourceUrl:'javascript:alert(1)'},{image:'data:text/html;base64,AAAA'}])assert.equal((await ask('entries','POST',entry({...mag,...changes}))).status,400,JSON.stringify(changes));
  assert.equal((await ask('entries/'+encodeURIComponent(supplementLogId('2026-11-16',mag.id)),'DELETE')).status,200);
  state=await(await ask('state')).json();assert.equal(supplementCount(state.entries,'2026-11-16',mag.id),0);
});
