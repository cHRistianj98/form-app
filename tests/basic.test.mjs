import test from 'node:test';
import assert from 'node:assert/strict';
import {calcTargets,calcStepsKcal,scaleFood,BASE_FOODS,activityKcal,localDay,shiftDay} from '../src/foods.js';
import {onRequest} from '../functions/api/[[path]].js';
import {DEFAULT_PROFILE} from '../src/profile.js';

const env = {
  APP_PASSWORD: 'test-secret-long-password',
  SESSION_SECRET: 'a-secret-session-key-long-enough-123',
  DB: {
    prepare() {
      return {
        bind() { return { run: async () => ({success:true}), all: async () => ({results:[]}), first: async () => null }; },
        all: async () => ({results:[]}), first: async () => null
      };
    }
  }
};
const ask = (url, method='GET', body, cookie) => onRequest({env,request:new Request('https://forma.pages.dev'+url,{method,...(body?{body:JSON.stringify(body),headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}}:cookie?{headers:{Cookie:cookie}}:{})})});

test('food portion scales linearly',()=>{
  const onion=BASE_FOODS.find(f=>f.name==='Cebula');
  assert.equal(scaleFood(onion,50).kcal,20);
  assert.equal(scaleFood(onion,50).carbs,4.65);
  assert.equal(scaleFood(onion,50).iron,0.105);
});
test('targets start from 186cm/93kg/28y and allow edits',()=>{
  const p={...DEFAULT_PROFILE};
  const r=calcTargets(p,93);
  assert.equal(r.bmr,1958); assert.equal(r.calories,2600);assert.equal(r.protein,180);
  assert.equal(calcTargets({...p,manualCalories:2200},93).calories,2200);
});
test('steps account for baseline and included running',()=>{
  assert.equal(calcStepsKcal(3000,[]),0);
  assert.equal(calcStepsKcal(10000,[]),280);
  assert.equal(calcStepsKcal(10000,[{type:'run',includedInSteps:true,distance:5,minutes:30}]),30);
});
test('running approximates 1 kcal/kg/km',()=>{assert.equal(activityKcal('run',40,5,93),465)});
test('dates shift correctly across month boundaries',()=>{
  assert.equal(shiftDay('2026-11-01',-1),'2026-10-31');
  assert.equal(shiftDay('2026-12-31',1),'2027-01-01');
});
test('login requires secret and sets HttpOnly session',async()=>{
  let r=await ask('/api/session'); assert.equal(r.status,200);assert.equal((await r.json()).authenticated,false);
  r=await ask('/api/login','POST',{password:'bad'});assert.equal(r.status,401);
  r=await ask('/api/login','POST',{password:env.APP_PASSWORD});assert.equal(r.status,200);
  const cookie=r.headers.get('Set-Cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);
  const sessionCookie=cookie.split(';')[0];
  r=await ask('/api/session','GET',null,sessionCookie);assert.equal((await r.json()).authenticated,true);
  const f=BASE_FOODS[0];
  r=await ask('/api/entries','POST',{id:'entry:123',day:'2026-11-14',meal:'breakfast',grams:120,food:f},sessionCookie);
  assert.equal(r.status,200);
  r=await ask('/api/entries','POST',{id:'entry:123',day:'2026-11-14',meal:'breakfast',grams:-5,food:f},sessionCookie);
  assert.equal(r.status,400);
  r=await ask('/api/entries/entry%3A123','DELETE',null,sessionCookie);
  assert.equal(r.status,200);
});
