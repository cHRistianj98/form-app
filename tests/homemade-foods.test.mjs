import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE_FOODS,FAVORITE_FOODS,HOMEMADE_FOODS,foodBasis,foodImage,foodNutrientLabel,foodOptions,scaleFood} from '../src/foods.js';
import {calculateDish} from '../src/dishNutrition.js';
import {MINERAL_KEYS,NUTRIENT_FIELDS,VITAMIN_KEYS} from '../src/nutrients.js';
import {nutritionReport,sumNutrition,totalLabel} from '../src/nutritionStats.js';
import {DEFAULT_PROFILE} from '../src/profile.js';
import worker from '../worker/index.js';

const get=id=>HOMEMADE_FOODS.find(f=>f.id===`dish:${id}`);
const favorite=id=>FAVORITE_FOODS.find(f=>f.id===`favorite:${id}`);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const entry=(food,grams,day='2026-11-15')=>({id:`entry:${food.id}`,food,grams,day,meal:'lunch'});

test('eleven ready dishes are discoverable by Polish names, aliases and gram quantities',()=>{
  assert.equal(HOMEMADE_FOODS.length,11);
  for(const food of HOMEMADE_FOODS) {
    assert.equal(food.unit,'g');assert.equal(foodBasis(food),100);
    assert.equal(foodOptions(food.name)[0].id,food.id);
    assert.ok(food.estimateNotes.length>100&&food.estimateNotes.length<1800);
    for(const key of NUTRIENT_FIELDS) assert.ok(Object.hasOwn(food,key),`${food.id}:${key}`);
    const bytes=readFileSync(new URL('../public'+food.image,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(foodImage({id:food.id,name:food.name}),food.image);
  }
  assert.equal(foodOptions('rosol')[0].id,get('rosol-noodles').id);
  assert.ok(foodOptions('lidlomix').some(food=>food.id===get('italian-pizza').id));
  assert.equal(foodOptions('nalesniki dzem')[0].id,get('crepes-jam').id);
  assert.equal(foodOptions('nalesniki nutella')[0].id,get('crepes-nutella').id);
  assert.equal(foodOptions('sernik Pilos')[0].id,get('cocoa-crumble-cheesecake').id);
  assert.equal(foodOptions('sernik krolewski')[0].id,get('cocoa-crumble-cheesecake').id);
  assert.equal(foodOptions('pomidorowka')[0].id,get('tomato-soup-noodles').id);
  assert.equal(foodOptions('lidlomix pomidorowa')[0].id,get('tomato-soup-noodles').id);
});

test('mushroom roulade and seasoned breast use cooked chicken and scale finished portions',()=>{
  const roll=get('chicken-mushroom-roulade'),breast=get('roasted-chicken-breast');
  near(roll.kcal,165*.8+28*.18+884*.015+331*.001+251*.001);
  near(scaleFood(roll,150).kcal,roll.kcal*1.5);
  assert.match(roll.estimateNotes,/nadzieniem z pieczarek/);
  assert.match(roll.estimateNotes,/GOTOWEJ rolady/);
  assert.match(roll.estimateNotes,/bez sera, boczku, panierki/);
  near(breast.kcal,165*.985+331*.003+282*.003+251*.001);
  near(scaleFood(breast,175).kcal,breast.kcal*1.75);
  assert.match(breast.estimateNotes,/sól z mieszanki jest już wliczona/);
  assert.match(breast.estimateNotes,/nie surową pierś/);
  for(const food of [roll,breast])assert.ok(food.recipeSources.some(s=>s.url.includes('/171477/')));
  assert.equal(foodOptions('rolada')[0].id,roll.id);
  assert.equal(foodOptions('piers pieczona')[0].id,breast.id);
});

test('boiled potatoes reuse the established food identity, nutrients and new image without duplicate search results',()=>{
  const potato=HOMEMADE_FOODS.find(f=>f.id==='base:potato');
  const base=BASE_FOODS.find(f=>f.id===potato.id);
  assert.deepEqual(foodOptions('ziemniaki gotowane').map(f=>f.id),['base:potato']);
  for(const key of ['kcal','protein','carbs','fat','salt'])assert.equal(potato[key],base[key],key);
  near(scaleFood(potato,200).kcal,174);
  assert.equal(foodImage({id:'base:potato'}),'/foods/dish-boiled-potatoes.webp');
  assert.match(potato.estimateNotes,/po ugotowaniu i odcedzeniu/);
});

test('cheesecake includes cocoa crumble and Pilos bucket curd with explicit assumptions and no raisins',()=>{
  const cake=get('cocoa-crumble-cheesecake');
  // Compare the whole batch, not a generic cheesecake table or raw batter mass.
  const batch=108*10+364*4+753*4+387*2.8+143*2.5+322*0.34+228*0.4+381*0.4+51*0.08;
  near(cake.kcal,batch/23);
  near(scaleFood(cake,137.5).kcal,batch/2300*137.5);
  assert.match(cake.estimateNotes,/bez rodzynek/i);
  assert.match(cake.estimateNotes,/Pilos z wiaderka/);
  assert.match(cake.estimateNotes,/wariant 6%/);
  assert.match(cake.estimateNotes,/2300 g/);
  assert.ok(cake.partialNutrients.includes('calcium'));
  assert.ok(cake.partialNutrients.includes('salt'));
  assert.equal(cake.recipeSources.some(s=>s.url.includes('fitatu.com')),true);
});

test('karpatka follows the Winiary batch with cooked yield and sits near the published per-portion energy',()=>{
  const cake=get('karpatka');
  const batch=717*3.5+364*1.8+143*2+61*8.24+381*0.7+387*1.2+389*0.1;
  const batchBiotin=23.55*2+2.27*1.8+1.55*8.24+0.1*0.7;
  near(cake.kcal,batch/17);
  near(scaleFood(cake,170).kcal,batch/1700*170);
  near(cake.biotin,batchBiotin/17);
  near(scaleFood(cake,113).biotin,batchBiotin/1700*113);
  for(const key of [...VITAMIN_KEYS,...MINERAL_KEYS]){
    assert.ok(Number.isFinite(cake[key]),key);
    assert.ok(!cake.partialNutrients.includes(key),key);
  }
  assert.ok(Math.abs(batch-4895)/4895<0.05,`${batch} kcal vs Winiary 4895 kcal`);
  assert.match(cake.estimateNotes,/1700 g/);
  assert.match(cake.estimateNotes,/800 ml mleka/);
  assert.equal(cake.recipeSources[0].url,'https://www.winiary.pl/przepisy/karpatka/');
  assert.equal(foodOptions('karpatka')[0].id,cake.id);
});

test('baked salmon uses cooked USDA fish plus retained olive oil and added salt per 100 g ready fish',()=>{
  const fish=get('baked-salmon-olive-oil');
  near(fish.kcal,206*.965+884*.03+251*.001);
  near(fish.fat,12.35*.965+100*.03+3.26*.001);
  assert.ok(fish.salt>0.5&&fish.salt<0.6);
  assert.ok(fish.vitaminD>12&&fish.selenium>35);
  assert.equal(fish.partialNutrients.length,0);
  assert.match(fish.estimateNotes,/GOTOWEJ ryby/);
  assert.ok(fish.recipeSources[0].url.includes('/175168/'));
  assert.equal(foodOptions('losos pieczony')[0].id,fish.id);
  assert.ok(foodOptions('losos').some(f=>f.id==='base:salmon'));
});

test('tomato soup follows the supplied Lidlomix recipe using dry pasta and excluding cream',()=>{
  const soup=get('tomato-soup-noodles');
  const batch=36*10+38*1.5+350*2+149*0.03+36*0.02+233*0.002+265*0.002+251*0.001;
  near(soup.kcal,batch/13);
  near(scaleFood(soup,425).kcal,batch/1300*425);
  assert.match(soup.estimateNotes,/200 g SUCHEGO makaronu/);
  assert.match(soup.estimateNotes,/bez śmietany/);
  assert.match(soup.estimateNotes,/1300 g/);
  assert.match(soup.estimateNotes,/makaron jest już wliczony/);
  assert.equal(soup.recipeSources[0].url,'https://www.monsieur-cuisine.com/pl/recipe/zupa-pomidorowa-z-makaronem-5');
});

test('recipe yield uses cooked grams, counts ml by their own label and converts only the oil density',()=>{
  const egg=BASE_FOODS.find(f=>f.id==='base:egg');
  const olive=BASE_FOODS.find(f=>f.id==='base:olive');
  const milk=favorite('laciate-milk-32');
  const batterKcal=milk.kcal*3.5+egg.kcal+364*3+olive.kcal*(4*0.91)/100;
  const plainKcal=batterKcal/650*100;
  near(get('crepes-nutella').kcal,plainKcal*0.8+539*0.2);
  near(get('crepes-jam').kcal,plainKcal*0.8+278*0.2);
  near(get('crepes-nutella').protein,((3.2*3.5+12.6+10.33*3)/650*100)*0.8+6.3*0.2);
  near(scaleFood(get('crepes-jam'),250).kcal,get('crepes-jam').kcal*2.5);
  const ingredients=[{food:{kcal:100,protein:5,carbs:10,fat:4},quantity:200}];
  const initial=structuredClone(ingredients);
  near(calculateDish(ingredients,100).kcal,200);
  near(calculateDish(ingredients,200).kcal,100);
  assert.deepEqual(ingredients,initial);
  assert.throws(()=>calculateDish(ingredients,0));
  assert.throws(()=>calculateDish([{food:{kcal:-1},quantity:100}],100));
});

test('rosol and pizza match the stated noodle ratio, user sauce, toppings and cooked batch yield',()=>{
  near(get('rosol-noodles').kcal,36*0.8+138*0.2);
  near(get('rosol-noodles').protein,2.52*0.8+4.54*0.2);
  const pizza=get('italian-pizza');
  const batch=340*4+4.2+387*0.05+884*0.2+33*2+299*2.5+378;
  near(pizza.kcal,batch/10);
  assert.ok(pizza.kcal>270&&pizza.kcal<280);
  near(scaleFood(pizza,300).kcal,pizza.kcal*3);
  assert.match(pizza.estimateNotes,/1000 g/);assert.match(pizza.estimateNotes,/100 g salami/);
  assert.match(pizza.estimateNotes,/200 g sosu Mutti/);
});

test('missing labels yield partial known micros, true zeros stay zero and no data stays unknown',()=>{
  const dish=calculateDish([{food:{calcium:100,fiber:0},quantity:100},{food:{calcium:null},quantity:100}],200);
  near(dish.calcium,50);assert.ok(dish.partialNutrients.includes('calcium'));
  assert.equal(dish.fiber,null); // A known zero plus unknown is not complete data.
  const zero=calculateDish([{food:{fiber:0},quantity:100}],100);
  assert.equal(zero.fiber,0);assert.equal(zero.partialNutrients.includes('fiber'),false);
  const pancakes=get('crepes-nutella');
  assert.equal(pancakes.biotin,null);
  assert.ok(pancakes.partialNutrients.includes('calcium'));
  assert.match(foodNutrientLabel(pancakes,'calcium'),/^≥ /);
  const summary=sumNutrition([entry(pancakes,100)]);
  assert.equal(summary.coverage.calcium.complete,false);
  assert.equal(summary.coverage.calcium.known,1);
  assert.match(totalLabel(summary,'calcium'),/^≥ /);
  const week=nutritionReport({entries:[entry(pancakes,100)],daily:[],profile:DEFAULT_PROFILE,day:'2026-11-15',period:'week',today:'2026-11-15'});
  assert.equal(week.summary.coverage.calcium.complete,false);
  near(week.summary.totals.calcium,pancakes.calcium);
});

test('Mutti fat and saturated fat limits survive recipe arithmetic, portions and weekly totals',()=>{
  const sauce=favorite('mutti-pizza-sauce');
  assert.equal(sauce.kcal,33);assert.equal(sauce.salt,0.69);assert.equal(sauce.fiber,null);
  assert.equal(foodNutrientLabel(sauce,'fat'),'< 0,5');
  assert.equal(foodNutrientLabel(sauce,'saturatedFat'),'< 0,1');
  assert.equal(foodNutrientLabel(sauce,'saturatedFat',scaleFood(sauce,200).saturatedFat),'< 0,2');
  const pizza=get('italian-pizza');
  assert.ok(pizza.upperBoundNutrients.includes('fat'));
  assert.ok(pizza.upperBoundNutrients.includes('saturatedFat'));
  assert.match(foodNutrientLabel(pizza,'fat'),/^< /);
  assert.match(totalLabel(sumNutrition([entry(pizza,200)]),'saturatedFat'),/^< /);
  const mixed=calculateDish([{food:sauce,quantity:100},{food:{fat:null},quantity:100}],200);
  assert.match(foodNutrientLabel(mixed,'fat'),/^≈ /);
});

test('cooking factors alter only the named nutrients and propagate missing data',()=>{
  const result=calculateDish([{food:{kcal:100,protein:10,folate:100,b12:2},quantity:200,retention:{folate:0.65,b12:0.85}}],100);
  assert.equal(result.kcal,200);assert.equal(result.protein,20);
  assert.equal(result.folate,130);near(result.b12,3.4);
  assert.equal(result.biotin,null);
  assert.throws(()=>calculateDish([{food:{folate:1},quantity:100,retention:{folate:1.5}}],100));
});

test('Worker roundtrip keeps recipe assumptions, partial values and upper limits; invalid qualifiers are rejected',async()=>{
  const saved=new Map();
  const env={APP_PASSWORD:'test-dishes-password',SESSION_SECRET:'test-dishes-session-secret-long-enough',DB:{prepare(sql){return {
    bind(...args){return {run:async()=>{if(sql.startsWith('INSERT INTO entries')) saved.set(args[0],{id:args[0],day:args[1],meal:args[2],grams:args[3],food_json:args[4]});return {success:true};}};},
    all:async()=>({results:sql.includes('FROM entries')?[...saved.values()]:[]}),first:async()=>null,
  };}}};
  const ask=(path,method='GET',body,cookie)=>worker.fetch(new Request('https://forma.test/api'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,{});
  const login=await ask('/login','POST',{password:env.APP_PASSWORD});
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  for(const food of [...HOMEMADE_FOODS,favorite('mutti-pizza-sauce')]) {
    const record=entry(food,150);
    assert.equal((await ask('/entries','POST',record,cookie)).status,200,food.id);
    const snapshot=JSON.parse(saved.get(record.id).food_json);
    assert.deepEqual(snapshot.partialNutrients,food.partialNutrients);
    assert.deepEqual(snapshot.upperBoundNutrients,food.upperBoundNutrients);
    assert.equal(snapshot.estimateNotes,food.estimateNotes);
    assert.equal(snapshot.image,food.image);
    assert.equal(snapshot.kcal,food.kcal);
  }
  for(const changes of [{partialNutrients:['not-a-nutrient']},{upperBoundNutrients:['fat','fat']},{partialNutrients:'calcium'},{estimateNotes:'x'.repeat(1801)}]) {
    assert.equal((await ask('/entries','POST',entry({...get('italian-pizza'),...changes},100),cookie)).status,400);
  }
});
