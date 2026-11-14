import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {BASE_FOODS, calcDailyBalance, calcTargets, foodImage} from '../src/foods.js';
import {DEFAULT_PROFILE, normalizeProfile} from '../src/profile.js';
import {onRequest} from '../functions/api/[[path]].js';
import worker from '../worker/index.js';

test('personal starting plan is 2600 kcal, 180 g protein and consistent macro energy',()=>{
  const target=calcTargets(DEFAULT_PROFILE,93);
  assert.equal(target.calories,2600);
  assert.equal(target.protein,180);
  assert.equal(target.fat,68);
  assert.equal(target.carbs,317);
  assert.equal(target.protein*4+target.fat*9+target.carbs*4,2600);
});

test('Mifflin uses current weight and selected PAL; percent and zero deficits work',()=>{
  const p={...DEFAULT_PROFILE,manualCalories:0};
  assert.equal(calcTargets(p,93).base,3132);
  assert.equal(calcTargets(p,93).calories,2662);
  assert.equal(calcTargets({...p,deficitPercent:0},93).calories,3132);
  assert.equal(calcTargets({...p,deficitMode:'kcal',deficit:0},93).calories,3132);
  assert.equal(calcTargets({...p,deficitMode:'kcal',deficit:300},93).calories,2832);
  assert.equal(calcTargets(p,85).calories,2553);
  assert.equal(calcTargets({...p,sex:'female',age:35,height:165,activityLevel:'inactive'},65).bmr,1345);
});

test('DRI 2023 adult equations use cm/kg and category-specific total energy without another PAL multiplier',()=>{
  const p={...DEFAULT_PROFILE,energyMethod:'eer2023',manualCalories:0,deficitPercent:0};
  for(const [activityLevel,expected] of [['inactive',2970],['low',3211],['active',3394],['very',3860]]) {
    assert.equal(calcTargets({...p,activityLevel},93).calories,expected,activityLevel);
  }
  for(const [activityLevel,expected] of [['inactive',2045],['low',2209],['active',2346],['very',2579]]) {
    assert.equal(calcTargets({...p,sex:'female',height:165,age:35,activityLevel},65).calories,expected,activityLevel);
  }
  assert.equal(calcTargets({...p,activityLevel:'low',deficitPercent:15},93).calories,2730);
});

test('manual target stays fixed when weight and activity change; protein can be fixed or per current kg',()=>{
  assert.equal(calcTargets({...DEFAULT_PROFILE,activityLevel:'very'},100).calories,2600);
  assert.equal(calcTargets(DEFAULT_PROFILE,100).protein,180);
  assert.equal(calcTargets({...DEFAULT_PROFILE,manualProtein:0},93).protein,186);
  assert.equal(calcTargets({...DEFAULT_PROFILE,manualCalories:1000},93).macrosFit,false);
});

test('daily budget does not credit activity already included in the plan',()=>{
  const target=calcTargets(DEFAULT_PROFILE,93);
  assert.deepEqual(calcDailyBalance(target,1700),{budget:2600,remaining:900});
  assert.equal(calcDailyBalance({...target,workout:800,steps:20000},2700).remaining,-100);
});

test('migration replaces built-in old targets and preserves explicit preferences without touching diary records',()=>{
  const old={height:186,startWeight:93,targetWeight:85,age:28,sex:'male',manualCalories:0,deficit:450,proteinFactor:1.8,fatFactor:0.8};
  const migrated=normalizeProfile(old);
  assert.equal(migrated.manualCalories,2600);
  assert.equal(migrated.manualProtein,180);
  assert.equal(migrated.deficitMode,'percent');
  assert.equal(old.manualCalories,0);
  const custom=normalizeProfile({...old,manualCalories:2400,deficit:0,proteinFactor:2.2});
  assert.equal(custom.manualCalories,2400);
  assert.equal(custom.deficitMode,'kcal');
  assert.equal(custom.deficit,0);
  assert.equal(calcTargets(custom,93).protein,187);
  const automatic={...DEFAULT_PROFILE,manualCalories:0,manualProtein:0,deficitPercent:0};
  assert.deepEqual(normalizeProfile(automatic),automatic);
});

test('all base products and old diary snapshots resolve to real local WebP files with attribution',()=>{
  const credits=JSON.parse(readFileSync(new URL('../public/foods/credits.json',import.meta.url)));
  for(const food of BASE_FOODS) {
    const {image,...oldFood}=food;
    assert.equal(foodImage(oldFood),image,food.id);
    const bytes=readFileSync(new URL('../public'+image,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    const credit=credits[food.id.slice(5)];
    assert.ok(credit.author&&credit.license&&credit.source,food.id);
    assert.ok(existsSync(new URL('../public'+credit.image,import.meta.url)));
  }
  assert.equal(foodImage({id:'own:1',name:'Mój nieznany produkt'}),null);
  assert.equal(foodImage({id:'own:2',name:'Inny',image:'javascript:alert(1)'}),null);
});

test('Worker profile API persists the new model, rejects invalid settings and retains product images',async()=>{
  let savedProfile=null, savedFood=null, savedEntry=null;
  const env={APP_PASSWORD:'test-password',SESSION_SECRET:'test-session-key-longer-than-20',DB:{
    prepare(sql) {
      return {
        bind(...args) {return {run:async()=>{
          if(sql.startsWith('INSERT INTO settings')) savedProfile=args[0];
          if(sql.startsWith('INSERT INTO foods')) savedFood=args[1];
          if(sql.startsWith('INSERT INTO entries')) savedEntry=args[4];
          return {success:true};
        }};},
        all:async()=>({results:[]}),
        first:async()=>sql.includes('settings')&&savedProfile?{value_json:savedProfile}:null,
      };
    }
  }};
  let cookie='';
  const ask=(path,method='GET',body)=>worker.fetch(new Request('https://forma.test/api/'+path,{
    method, headers:{'Content-Type':'application/json',Cookie:cookie},
    ...(body?{body:JSON.stringify(body)}:{}),
  }),env,{});
  const login=await ask('login','POST',{password:env.APP_PASSWORD});
  cookie=login.headers.get('Set-Cookie').split(';')[0];
  const profile={...DEFAULT_PROFILE,energyMethod:'eer2023',activityLevel:'active',deficitPercent:10,manualCalories:0,manualProtein:175};
  assert.equal((await ask('profile','POST',profile)).status,200);
  assert.deepEqual(JSON.parse(savedProfile),profile);
  const state=await (await ask('state')).json();
  assert.deepEqual(state.profile,profile);
  for(const change of [{activityLevel:'invalid'},{energyMethod:'invalid'},{deficitPercent:NaN},{deficitPercent:26},{manualProtein:-1},{manualCalories:800},{age:18}]) {
    assert.equal((await ask('profile','POST',{...profile,...change})).status,400,JSON.stringify(change));
  }
  const food={...BASE_FOODS[0],id:'own:test',name:'Moje jajko'};
  assert.equal((await ask('foods','POST',food)).status,200);
  assert.equal(JSON.parse(savedFood).image,food.image);
  assert.equal((await ask('entries','POST',{id:'entry:test',day:'2026-11-14',meal:'breakfast',grams:100,food})).status,200);
  assert.equal(JSON.parse(savedEntry).image,food.image);
});
