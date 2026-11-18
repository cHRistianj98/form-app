import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE_FOODS,FAVORITE_FOODS,foodImage,foodOptions,foodUnit,nutrientLabel,scaleFood} from '../src/foods.js';
import worker from '../worker/index.js';

test('seven selectable products retain the user table, including ml basis and the fat upper bound',()=>{
  const rows=FAVORITE_FOODS.slice(0,7).map(f=>[f.id.slice(9),foodUnit(f),f.kcal,f.protein,f.carbs,f.fat]);
  assert.deepEqual(rows,[
    ['lidl-protein-milk','ml',54,8,4.7,0.5],
    ['piatnica-cream-18','g',191,2.5,4.8,18],
    ['hochland-gouda','g',243,16,6.6,17],
    ['lidl-protein-cheese','g',198,31,0,8.2],
    ['lidl-protein-cup','g',71,10,6.7,0.3],
    ['laciate-milk-32','ml',60,3.2,4.7,3.2],
    ['cincin-rose-zero','ml',22,0,5.3,0],
  ]);
  assert.equal(FAVORITE_FOODS[0].fatLessThan,true);
  const otherSources=['favorite:lipton-earl-grey','favorite:guseppe-four-cheese','favorite:kania-mild-ketchup'];
  assert.equal(FAVORITE_FOODS.filter(f=>!otherSources.includes(f.id)).every(f=>f.source==='Twoja tabela'),true);
});

test('portions scale per stated unit without treating ml as grams or recalculating labelled energy',()=>{
  const milk=scaleFood(FAVORITE_FOODS[0],250);
  assert.equal(milk.kcal,135);
  assert.equal(milk.protein,20);
  assert.equal(milk.carbs,11.75);
  assert.equal(milk.fat,1.25);
  assert.equal(milk.calcium,null);
  const cream=scaleFood(FAVORITE_FOODS[1],30);
  assert.equal(cream.kcal,57.3);
  assert.equal(cream.protein,0.75);
  assert.equal(cream.fat,5.4);
  const rose=scaleFood(FAVORITE_FOODS[6],150);
  assert.equal(rose.kcal,33);
  assert.equal(rose.carbs,7.95);
  assert.equal(rose.fat,0);
  assert.equal(foodUnit(BASE_FOODS[0]),'g');
});

test('fat bounds remain visible and round upwards even for tiny portions',()=>{
  assert.equal(nutrientLabel(0.5,true),'< 0,5');
  assert.equal(nutrientLabel(1.25,true),'< 1,3');
  assert.equal(nutrientLabel(0.005,true),'< 0,1');
  assert.equal(nutrientLabel(0,false),'0');
  assert.equal(nutrientLabel(null),'—');
});

test('user products appear without online search and match brand/name in either order without duplicates',()=>{
  assert.deepEqual(foodOptions().slice(0,FAVORITE_FOODS.length).map(f=>f.id),FAVORITE_FOODS.map(f=>f.id));
  assert.equal(foodOptions('smietana piatnica')[0].id,FAVORITE_FOODS[1].id);
  assert.equal(foodOptions('hochland gouda')[0].id,FAVORITE_FOODS[2].id);
  assert.equal(foodOptions('mleko lidl')[0].id,FAVORITE_FOODS[0].id);
  assert.equal(foodOptions('Cin&Cin')[0].id,FAVORITE_FOODS[6].id);
  assert.equal(foodOptions('protein',[FAVORITE_FOODS[0]],[FAVORITE_FOODS[0]]).filter(f=>f.id===FAVORITE_FOODS[0].id).length,1);
});

test('packshots ship as real WebP assets with source metadata and remain resolvable for snapshots',()=>{
  const credits=JSON.parse(readFileSync(new URL('../public/foods/credits.json',import.meta.url)));
  for(const food of FAVORITE_FOODS) {
    const bytes=readFileSync(new URL('../public'+food.image,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    const {image,...snapshot}=food;
    assert.equal(foodImage(snapshot),image);
    assert.ok(Object.values(credits).find(c=>c.image===image)?.source,food.id);
  }
});

test('Worker saves and reloads product snapshots with units, images, qualifiers and unchanged nutrition',async()=>{
  const saved=new Map();
  let customFood;
  const env={APP_PASSWORD:'test-products-password',SESSION_SECRET:'test-products-session-secret-long-enough',DB:{
    prepare(sql) {return {
      bind(...args) {return {run:async()=>{
        if(sql.startsWith('INSERT INTO entries')) saved.set(args[0],{id:args[0],day:args[1],meal:args[2],grams:args[3],food_json:args[4]});
        if(sql.startsWith('INSERT INTO foods')) customFood=JSON.parse(args[1]);
        return {success:true};
      }};},
      all:async()=>({results:sql.includes('FROM entries')?[...saved.values()]:[]}),
      first:async()=>null,
    };}
  }};
  let cookie='';
  const ask=(route,method='GET',body)=>worker.fetch(new Request('https://forma.test/api/'+route,{
    method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{}),
  }),env,{});
  const login=await ask('login','POST',{password:env.APP_PASSWORD});
  cookie=login.headers.get('Set-Cookie').split(';')[0];
  for(const food of FAVORITE_FOODS) {
    const r=await ask('entries','POST',{id:'entry:'+food.id,day:'2026-11-14',meal:'breakfast',grams:250,food});
    assert.equal(r.status,200,food.id);
  }
  const state=await (await ask('state')).json();
  assert.equal(state.entries.length,FAVORITE_FOODS.length);
  state.entries.forEach((entry,i)=>{
    assert.deepEqual(entry.food,FAVORITE_FOODS[i]);
    assert.equal(foodUnit(entry.food),foodUnit(FAVORITE_FOODS[i]));
    assert.equal(scaleFood(entry.food,entry.grams).kcal,FAVORITE_FOODS[i].kcal==null?null:FAVORITE_FOODS[i].kcal*2.5);
  });
  const custom={...FAVORITE_FOODS[0],id:'own:drink'};
  assert.equal((await ask('foods','POST',custom)).status,200);
  assert.deepEqual(customFood,custom);
  for(const change of [{unit:'l'},{fatLessThan:'true'},{imageFit:'invalid'},{defaultQuantity:0},{defaultQuantity:-1},{defaultQuantity:'200'},{defaultQuantity:100001}]) {
    assert.equal((await ask('entries','POST',{id:'entry:bad',day:'2026-11-14',meal:'breakfast',grams:100,food:{...custom,...change}})).status,400);
  }
  const cheese=FAVORITE_FOODS.find(food=>food.id==='favorite:hochland-gouda');
  for(const change of [{sliceGrams:0},{sliceGrams:-16},{sliceGrams:'16'},{sliceGrams:100001},{unit:'ml'}]) {
    assert.equal((await ask('entries','POST',{id:'entry:bad-slice',day:'2026-11-14',meal:'breakfast',grams:32,food:{...cheese,...change}})).status,400);
  }
  const tablet=FAVORITE_FOODS.find(food=>food.unit==='tablet');
  const record={id:'entry:tablet',day:'2026-11-14',meal:'breakfast',grams:1,food:tablet};
  assert.equal((await ask('entries','POST',{...record,grams:0.5})).status,400);
  for(const change of [{basisQuantity:100},{b1:'1.1'},{vitaminC:-1},{defaultQuantity:1.5},{servingSizes:[{label:'Pół tabletki',quantity:0.5}]}]) {
    assert.equal((await ask('entries','POST',{...record,food:{...tablet,...change}})).status,400);
  }
});
