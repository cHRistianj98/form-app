import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PROFILE,normalizeProfile} from '../src/profile.js';
import {SUPPLEMENTS,supplementLogId} from '../src/supplements.js';
import {DEFAULT_SUPPLEMENT_PLAN,normalizeSupplementPlan,supplementPlanProgress,supplementTarget,validSupplementPlan} from '../src/supplementPlan.js';
import {progressPresentation} from '../src/progressPresentation.js';
import worker from '../worker/index.js';

const zinc='supplement:essensey-zinc',omega='supplement:now-omega-3';
const intake=(id,quantity,day='2026-11-16')=>({id:supplementLogId(day,id),day,meal:'supplements',grams:quantity,food:SUPPLEMENTS.find(food=>food.id===id)});

test('requested default targets use one daily, two omega capsules, and zinc on odd calendar dates',()=>{
  for(const food of SUPPLEMENTS.filter(food=>![zinc,omega].includes(food.id)))assert.equal(supplementTarget(undefined,food.id,'2026-11-16'),1);
  assert.equal(supplementTarget(undefined,omega,'2026-11-16'),2);
  for(const day of ['2026-11-17','2026-12-31','2027-01-01','2027-02-01'])assert.equal(supplementTarget(undefined,zinc,day),1,day);
  for(const day of ['2026-11-16','2026-11-30','2027-01-02'])assert.equal(supplementTarget(undefined,zinc,day),0,day);
  const plan={[zinc]:{quantity:2,schedule:'even'},[omega]:{quantity:0,schedule:'daily'}};
  assert.equal(supplementTarget(plan,zinc,'2026-11-16'),2);
  assert.equal(supplementTarget(plan,zinc,'2026-11-17'),0);
  assert.equal(supplementTarget(plan,omega,'2026-11-16'),0);
});

test('extra doses and off-day products cannot fill another product target',()=>{
  const plan=normalizeSupplementPlan();
  const rows=[intake(omega,10),intake(zinc,10)];
  const status=supplementPlanProgress(SUPPLEMENTS,rows,'2026-11-16',plan);
  assert.equal(status.planned,6);assert.equal(status.plannedProducts,5);
  assert.equal(status.completed,2);assert.equal(status.completedProducts,1);assert.equal(status.done,false);
  assert.equal(status.rows.find(row=>row.food.id===zinc).done,false);
  const all=SUPPLEMENTS.map(food=>intake(food.id,supplementTarget(plan,food.id,'2026-11-16'))).filter(row=>row.grams>0);
  assert.equal(supplementPlanProgress(SUPPLEMENTS,all,'2026-11-16',plan).done,true);
  assert.equal(supplementPlanProgress(SUPPLEMENTS,all,'2026-11-17',plan).done,false);
  const disabled=Object.fromEntries(SUPPLEMENTS.map(food=>[food.id,{quantity:0,schedule:'daily'}]));
  assert.equal(supplementPlanProgress(SUPPLEMENTS,all,'2026-11-16',disabled).done,false);
});

test('profile migration adds an independent plan and preserves explicit and custom targets',()=>{
  const old={...DEFAULT_PROFILE};delete old.supplementPlan;
  const migrated=normalizeProfile(old);
  assert.deepEqual(migrated.supplementPlan,DEFAULT_SUPPLEMENT_PLAN);
  migrated.supplementPlan[zinc].quantity=5;
  assert.equal(DEFAULT_SUPPLEMENT_PLAN[zinc].quantity,1);
  const custom={'own:supplement:example':{quantity:3,schedule:'even'},[omega]:{quantity:4,schedule:'daily'}};
  assert.deepEqual(normalizeProfile({...old,supplementPlan:custom}).supplementPlan[omega],custom[omega]);
  assert.deepEqual(normalizeProfile({...old,supplementPlan:custom}).supplementPlan['own:supplement:example'],custom['own:supplement:example']);
  for(const invalid of [null,[],{[zinc]:{quantity:1.5,schedule:'daily'}},{[zinc]:{quantity:-1,schedule:'daily'}},{[zinc]:{quantity:101,schedule:'daily'}},{[zinc]:{quantity:'2',schedule:'daily'}},{[zinc]:{quantity:1,schedule:'sometimes'}}])assert.equal(validSupplementPlan(invalid),false);
});

test('progress rings distinguish completion, limits, unknowns, and uncertain upper bounds',()=>{
  assert.equal(progressPresentation(25,100).fraction,.25);
  assert.equal(progressPresentation(100,100).done,true);
  assert.equal(progressPresentation(120,100).fraction,1);
  assert.equal(progressPresentation(120,100,{mode:'limit'}).done,false);
  assert.equal(progressPresentation(120,100,{mode:'limit'}).tone,'limit');
  assert.equal(progressPresentation(100,100,{mode:'limit'}).done,false);
  assert.equal(progressPresentation(100,100,{upper:true}).done,false);
  assert.equal(progressPresentation(100,100,{partial:true}).done,true); // Known lower bound meets the reference.
  assert.equal(progressPresentation(null,100).text,'—');
  assert.equal(progressPresentation(0,100).text,'0%');
  assert.equal(progressPresentation(99.9,100).text,'99%');
  assert.equal(progressPresentation(52.94,100).text,'53%');
  assert.equal(progressPresentation(100,undefined).done,false);
});

test('Worker persists a plan with the profile, reloads it and rejects invalid schedules without losing it',async()=>{
  let saved=null,cookie='';
  const env={APP_PASSWORD:'plan-test-password',SESSION_SECRET:'plan-test-session-secret-long-enough',DB:{prepare(sql){return{
    bind(...args){return{run:async()=>{if(sql.startsWith('INSERT INTO settings'))saved=args[0];return{success:true};}};},
    all:async()=>({results:[]}),first:async()=>sql.includes('settings')&&saved?{value_json:saved}:null,
  };}}};
  const ask=(path,method='GET',body)=>worker.fetch(new Request('https://forma.test/api/'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env,{});
  cookie=(await ask('login','POST',{password:env.APP_PASSWORD})).headers.get('Set-Cookie').split(';')[0];
  const plan=normalizeSupplementPlan({[zinc]:{quantity:1,schedule:'even'},[omega]:{quantity:3,schedule:'daily'},'own:supplement:extra':{quantity:2,schedule:'odd'}});
  const profile={...DEFAULT_PROFILE,supplementPlan:plan};
  assert.equal((await ask('profile','POST',profile)).status,200);
  assert.deepEqual((await(await ask('state')).json()).profile.supplementPlan,plan);
  for(const invalid of [null,[],{[zinc]:{quantity:.5,schedule:'daily'}},{[omega]:{quantity:2,schedule:'weekly'}}])assert.equal((await ask('profile','POST',{...profile,supplementPlan:invalid})).status,400);
  assert.deepEqual((await(await ask('state')).json()).profile.supplementPlan,plan);
});
