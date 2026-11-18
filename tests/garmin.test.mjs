import test,{after,before,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {garminImportStatements,garminToday,parseGarminData,shiftGarminDay,validGarminDay,validGarminRange} from '../worker/garmin-data.js';
import {GarminError,garminStatus,scheduledGarmin,setGarminAuto,syncGarmin} from '../worker/garmin.js';
import worker from '../worker/index.js';

const from='2026-11-12',to='2026-11-18',baseTime=Date.parse('2026-11-18T12:00:00Z');
const jwt=at=>'eyJhbGciOiJub25lIn0.'+Buffer.from(JSON.stringify({exp:Math.floor(at/1000)+86400})).toString('base64url')+'.testsignature';
const weights=(day=to,weight=94.75)=>({dailyWeightSummaries:[{summaryDate:day,latestWeight:{calendarDate:day,weight}}],totalAverage:{weight:15},previousDateWeight:{calendarDate:'2026-11-11',weight:100},nextDateWeight:{calendarDate:'2026-11-19',weight:70}});
const summaries=(day=to,active=247)=>({data:[{calendarDate:day,calories:{burnedActive:active,burnedResting:2000,burnedTotal:2247,consumedValue:518}}]});
let mf,db,env,time,counter=0;
before(async()=>{
  mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:{DB:'garmin-integration-tests'}}));
  db=await mf.getD1Database('DB');
  const schema=await readFile(new URL('../schema.sql',import.meta.url),'utf8');
  for(const sql of schema.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
});
after(async()=>{await mf?.dispose();});
beforeEach(async()=>{
  await db.batch(['daily_metrics','garmin_daily_imports','garmin_daily_calories','garmin_sync_state','settings'].map(table=>db.prepare(`DELETE FROM ${table}`)));
  await db.prepare('INSERT INTO garmin_sync_state(id) VALUES(1)').run();time=baseTime;
  env={DB:db,GARMIN_PERSONAL_API_KEY:`synthetic-key-${++counter}`,APP_PASSWORD:'garmin-test-password',SESSION_SECRET:'garmin-test-session-secret-over-20'};
});
const options=extra=>({from,to,now:()=>time,...extra});
function fakeGarmin({steps=[{calendarDate:to,totalSteps:12345}],weight=weights(),summary={data:[]},intercept}={}) {
  const calls=[];
  const fetchImpl=async(url,init)=>{
    calls.push({url,init});const override=await intercept?.(url,init,calls.length);if(override)return override;
    if(url.includes('personal-api-key/token'))return new Response(jwt(time));
    if(url.includes('/v2/dailysummaries'))return new Response(JSON.stringify(summary),{headers:{'Content-Type':'application/json'}});
    return new Response(JSON.stringify(url.includes('/stats/steps/')?steps:weight),{headers:{'Content-Type':'application/json'}});
  };
  return {fetchImpl,calls};
}
const row=day=>db.prepare('SELECT * FROM daily_metrics WHERE day=?').bind(day).first();
const put=(day,steps,weight,notes='')=>db.prepare('INSERT INTO daily_metrics(day,steps,weight,notes) VALUES(?,?,?,?) ON CONFLICT(day) DO UPDATE SET steps=excluded.steps,weight=excluded.weight,notes=excluded.notes').bind(day,steps,weight,notes).run();

test('Garmin range validation uses real dates, 28-day API limit and Warsaw dates across midnight/DST',()=>{
  assert.equal(validGarminDay('2024-02-29'),true);
  for(const date of ['2026-02-29','2026-13-01','2026-00-00','2026-11-31','bad',null])assert.equal(validGarminDay(date),false);
  assert.equal(validGarminRange('2026-10-22',to,to),true);assert.equal(validGarminRange('2026-10-21',to,to),false);
  assert.equal(validGarminRange(to,'2026-11-19',to),false);assert.equal(validGarminRange(to,from,to),false);
  assert.equal(garminToday(Date.parse('2026-11-18T23:30:00Z')),'2026-11-19');
  assert.equal(garminToday(Date.parse('2026-03-29T22:30:00Z')),'2026-03-30');
  assert.equal(shiftGarminDay('2027-01-01',-1),'2026-12-31');
});

test('official payload reads totalSteps and latestWeight in kg, preserving zeros and ignoring averages/adjacent dates',()=>{
  const parsed=parseGarminData([{calendarDate:to,totalSteps:0},{calendarDate:from,totalSteps:null}],weights(to,94.745),from,to);
  assert.deepEqual(parsed,[{day:to,steps:0,weight:94.75}]);
  assert.deepEqual(parseGarminData([],null,from,to),[]);
  assert.deepEqual(parseGarminData(null,{dailyWeightSummaries:[]},from,to),[]);
  for(const payload of [weights(to,9475),weights(to,0),{dailyWeightSummaries:[{summaryDate:to,latestWeight:{calendarDate:from,weight:95}}]},{}])assert.throws(()=>parseGarminData([],payload,from,to),/GARMIN_PAYLOAD/);
  for(const payload of [{steps:1},[{calendarDate:to,totalSteps:-1}],[{calendarDate:to,totalSteps:1.5}],[{calendarDate:'invalid',totalSteps:1}],[{calendarDate:to,totalSteps:1},{calendarDate:to,totalSteps:2}]])assert.throws(()=>parseGarminData(payload,null,from,to),/GARMIN_PAYLOAD/);
});

test('Personal API gram weights normalize to kg with two decimal places and reject ambiguous values',()=>{
  for(const [raw,kg] of [[94750,94.75],[94745,94.75],[94.745,94.75],[20000,20],[20,20],[500000,500],[500,500]]) {
    assert.deepEqual(parseGarminData([],weights(to,raw),from,to),[{day:to,steps:null,weight:kg}]);
  }
  for(const raw of [19.99,500.01,9475,19999,500001,NaN,Infinity,'94750',{},true]) {
    assert.throws(()=>parseGarminData([],weights(to,raw),from,to),error=>error.stage==='weight'&&error.formatCode==='weight_value');
  }
  const mixed={dailyWeightSummaries:[...weights(to,94750).dailyWeightSummaries,...weights(to,94.75).dailyWeightSummaries]};
  assert.deepEqual(parseGarminData([],mixed,from,to),[{day:to,steps:null,weight:94.75}]);
});

test('V2 summaries import only daily active calories, preserving explicit zeros and excluding absent/out-of-range days',()=>{
  const summary={data:[
    ...summaries(to).data,...summaries(from,0).data,
    {calendarDate:'2026-11-13',calories:{burnedResting:1800,burnedTotal:2000}},
    {calendarDate:'2026-11-14',calories:{burnedActive:null}},
    {calendarDate:'2026-11-15',calories:null},
    ...summaries('2026-11-11',999).data,...summaries('2026-11-19',999).data,
  ]};
  assert.deepEqual(parseGarminData([],null,from,to,summary),[
    {day:from,steps:null,weight:null,activeKcal:0},{day:to,steps:null,weight:null,activeKcal:247},
  ]);
  assert.deepEqual(parseGarminData([],null,from,to,{data:[]}),[]);
  for(const payload of [{},[],{data:{}},{data:[{calendarDate:'invalid',calories:{burnedActive:247}}]},
    {data:[...summaries().data,...summaries(to,248).data]},
    ...[-1,30001,NaN,Infinity,'247',true,{}].map(value=>summaries(to,value))]) {
    assert.throws(()=>parseGarminData([],null,from,to,payload),error=>error.stage==='calories'&&error.formatCode.startsWith('calories_'));
  }
});

test('D1 updates daily Garmin calories once per day including corrections and zeros without overwriting manual metrics',async()=>{
  await put(to,8000,95.25,'Manual metrics');
  let fake=fakeGarmin({summary:summaries()}),result=await syncGarmin(env,options(fake));
  assert.equal(result.calorieDays,1);assert.equal(result.protectedSteps,1);assert.equal(result.protectedWeights,1);
  assert.deepEqual(await row(to),{day:to,steps:8000,weight:95.25,notes:'Manual metrics'});
  assert.deepEqual(await db.prepare('SELECT * FROM garmin_daily_calories WHERE day=?').bind(to).first(),{day:to,active_kcal:247,synced_at:result.at});
  assert.ok(fake.calls.some(call=>call.url.endsWith(`/v2/dailysummaries?startDate=${from}&endDate=${to}`)));
  for(const value of [200,0]) {
    time+=61000;result=await syncGarmin(env,options(fakeGarmin({summary:summaries(to,value)})));
    assert.equal(result.calorieDays,1);assert.equal((await db.prepare('SELECT active_kcal FROM garmin_daily_calories WHERE day=?').bind(to).first()).active_kcal,value);
  }
  time+=61000;result=await syncGarmin(env,options(fakeGarmin({summary:summaries(to,null)})));
  assert.equal(result.calorieDays,0);assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM garmin_daily_calories').first()).count,1);
  assert.equal((await db.prepare('SELECT active_kcal FROM garmin_daily_calories WHERE day=?').bind(to).first()).active_kcal,0);
});

test('calories alone create a day; invalid summaries and failed calorie storage cannot partially import steps or weight',async()=>{
  let result=await syncGarmin(env,options(fakeGarmin({steps:[],weight:null,summary:summaries(from)})));
  assert.equal(result.receivedDays,1);assert.equal(result.calorieDays,1);assert.equal(result.stepsDays,0);assert.equal(result.weightDays,0);
  assert.deepEqual(await row(from),{day:from,steps:0,weight:null,notes:''});time+=61000;
  await assert.rejects(syncGarmin(env,options(fakeGarmin({summary:summaries(to,-1)}))),error=>error.code==='garmin_payload'&&error.diagnostic.stage==='calories');
  assert.equal(await row(to),null);time+=61000;
  await db.prepare(`CREATE TRIGGER fail_calories BEFORE INSERT ON garmin_daily_calories WHEN NEW.day='${to}' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END`).run();
  try {
    await assert.rejects(syncGarmin(env,options(fakeGarmin({summary:summaries()}))),error=>error.code==='garmin_storage');
    assert.equal(await row(to),null);assert.equal(await db.prepare('SELECT day FROM garmin_daily_imports WHERE day=?').bind(to).first(),null);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM garmin_daily_calories').first()).count,1);
  }finally{await db.prepare('DROP TRIGGER fail_calories').run();}
});

test('real D1 import stores gram-based Personal API measurements in kg, preserving manual edits',async()=>{
  const result=await syncGarmin(env,options(fakeGarmin({weight:weights(to,94745)})));
  assert.equal(result.weightDays,1);assert.equal(result.stepsDays,1);assert.equal((await row(to)).weight,94.75);
  assert.equal((await db.prepare('SELECT weight FROM garmin_daily_imports WHERE day=?').bind(to).first()).weight,94.75);
  await put(to,12345,95.25,'Manual');time+=61000;
  const next=await syncGarmin(env,options(fakeGarmin({weight:weights(to,94700)})));
  assert.equal(next.protectedWeights,1);assert.equal((await row(to)).weight,95.25);
});

test('D1 import protects existing manual values and notes while filling empty days and missing fields',async()=>{
  await put(to,8000,95.25,'Keep my notes');await put(from,0,null,'Earlier note');
  const fake=fakeGarmin({steps:[{calendarDate:to,totalSteps:12345},{calendarDate:from,totalSteps:0}],weight:{dailyWeightSummaries:[...weights().dailyWeightSummaries,...weights(from,94.75).dailyWeightSummaries]}});
  const result=await syncGarmin(env,options(fake));
  assert.equal(result.protectedSteps,1);assert.equal(result.protectedWeights,1);assert.equal(result.stepsDays,1);assert.equal(result.weightDays,1);
  assert.deepEqual(await row(to),{day:to,steps:8000,weight:95.25,notes:'Keep my notes'});
  assert.deepEqual(await row(from),{day:from,steps:0,weight:94.75,notes:'Earlier note'});
  const state=await garminStatus(env,{now:time});assert.equal(state.lastSuccess,result.at);assert.equal(state.error,null);
  assert.equal(JSON.stringify(state).includes(env.GARMIN_PERSONAL_API_KEY),false);assert.equal(JSON.stringify(state).includes(jwt(time)),false);
  const keyRequest=fake.calls.find(call=>call.url.includes('personal-api-key/token'));
  assert.equal(keyRequest.init.headers.Accept,'*/*');assert.equal(keyRequest.init.headers.Authorization,`ApiKey ${env.GARMIN_PERSONAL_API_KEY}`);
  for(const call of fake.calls.filter(call=>!call.url.includes('personal-api-key/token')))assert.equal(call.init.headers.Authorization,`Bearer ${jwt(time)}`);
});

test('repeat sync replaces Garmin-owned values, protects subsequent manual edits and supports explicit overwrite',async()=>{
  await syncGarmin(env,options(fakeGarmin()));time+=61000;
  await syncGarmin(env,options(fakeGarmin({steps:[{calendarDate:to,totalSteps:10000}],weight:weights(to,94.5)})));
  assert.equal((await row(to)).steps,10000);assert.equal((await row(to)).weight,94.5);
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM daily_metrics').first()).count,1);
  await put(to,10000,95.25,'Manual weight only');time+=61000;
  let result=await syncGarmin(env,options(fakeGarmin({steps:[{calendarDate:to,totalSteps:11000}]})));
  assert.equal(result.stepsDays,1);assert.equal(result.protectedWeights,1);assert.equal((await row(to)).steps,11000);assert.equal((await row(to)).weight,95.25);
  time+=61000;result=await syncGarmin(env,options({...fakeGarmin(),overwriteManual:true}));
  assert.equal(result.protectedWeights,0);assert.deepEqual(await row(to),{day:to,steps:12345,weight:94.75,notes:'Manual weight only'});
  await put(to,0,null,'Cleared manually');time+=61000;
  result=await syncGarmin(env,options(fakeGarmin()));assert.equal(result.protectedSteps,1);assert.equal(result.protectedWeights,1);
  assert.equal((await row(to)).weight,null);assert.equal((await row(to)).steps,0);
});

test('manual edits made while Garmin is responding are evaluated at commit, not overwritten from an old snapshot',async()=>{
  await syncGarmin(env,options(fakeGarmin()));time+=61000;
  const fake=fakeGarmin({intercept:async url=>{if(url.includes('/stats/steps/'))await put(to,22222,96.25,'Saved during request');}});
  const result=await syncGarmin(env,options(fake));
  assert.equal(result.protectedSteps,1);assert.equal(result.protectedWeights,1);
  assert.deepEqual(await row(to),{day:to,steps:22222,weight:96.25,notes:'Saved during request'});
});

test('lease prevents overlapping requests and an old run cannot write after takeover',async()=>{
  let release,entered;
  const waiting=new Promise(resolve=>{entered=resolve;});
  const fake=fakeGarmin({intercept:async url=>{if(url.includes('/stats/steps/')){entered();await new Promise(resolve=>{release=resolve;});}}});
  const pending=syncGarmin(env,options(fake));await waiting;
  const second=fakeGarmin();await assert.rejects(syncGarmin(env,options(second)),error=>error.code==='busy'&&error.status===409);assert.equal(second.calls.length,0);
  release();await pending;
  await db.prepare("UPDATE garmin_sync_state SET lock_id='new-run'").run();
  await db.batch(garminImportStatements(db,[{day:to,steps:99999,weight:40,activeKcal:999}],'old-run',true));
  assert.equal((await row(to)).steps,12345);assert.equal((await row(to)).weight,94.75);
  assert.equal(await db.prepare('SELECT day FROM garmin_daily_calories WHERE day=?').bind(to).first(),null);
});

test('one bad upstream response or invalid weight fails the whole import before any diary write',async()=>{
  const bad=fakeGarmin({weight:weights(to,9475)});
  await assert.rejects(syncGarmin(env,options(bad)),error=>error.code==='garmin_payload'&&error.diagnostic.stage==='weight'&&error.diagnostic.formatCode==='weight_value');
  assert.equal(await row(to),null);let status=await garminStatus(env,{now:time});assert.equal(status.busy,false);assert.equal(status.lastSuccess,null);
  assert.ok(status.error.includes('Format danych'));
  assert.deepEqual(status.diagnostic,{stage:'weight',formatCode:'weight_value'});
  assert.equal(status.error.includes('9475'),false);time+=61000;
  const failure=fakeGarmin({intercept:async url=>url.includes('/weight/range/')?new Response('private response',{status:500}):null});
  await assert.rejects(syncGarmin(env,options(failure)),error=>error.code==='garmin_unavailable');assert.equal(await row(to),null);
});

test('malformed JSON and unexpected shapes identify the failing endpoint without exposing the response',async()=>{
  for(const [endpoint,body,diagnostic] of [
    ['/stats/steps/','PRIVATE '+env.GARMIN_PERSONAL_API_KEY,{stage:'steps',formatCode:'json'}],
    ['/weight/range/','PRIVATE '+env.GARMIN_PERSONAL_API_KEY,{stage:'weight',formatCode:'json'}],
    ['/weight/range/',JSON.stringify({private:env.GARMIN_PERSONAL_API_KEY}),{stage:'weight',formatCode:'weight_shape'}],
  ]) {
    const fake=fakeGarmin({intercept:async url=>url.includes(endpoint)?new Response(body):null});
    await assert.rejects(syncGarmin(env,options(fake)),error=>{
      assert.equal(error.code,'garmin_payload');assert.deepEqual(error.diagnostic,diagnostic);return true;
    });
    const status=await garminStatus(env,{now:time});assert.deepEqual(status.diagnostic,diagnostic);
    const saved=await db.prepare("SELECT value_json FROM settings WHERE key='garmin_last_error'").first();
    assert.equal(JSON.stringify({status,saved}).includes(env.GARMIN_PERSONAL_API_KEY),false);
    assert.equal(JSON.stringify({status,saved}).includes('PRIVATE'),false);time+=61000;
  }
  const safe=new GarminError('garmin_payload',502,null,{stage:'weight',formatCode:env.GARMIN_PERSONAL_API_KEY,raw:'PRIVATE'});
  assert.deepEqual(safe.diagnostic,{stage:'weight'});assert.equal(safe.message.includes(env.GARMIN_PERSONAL_API_KEY),false);
});

test('rate limiting honors Retry-After, persists a safe status and blocks immediate retries without network calls',async()=>{
  const fake=fakeGarmin({intercept:async()=>new Response('NEVER EXPOSE '+env.GARMIN_PERSONAL_API_KEY,{status:429,headers:{'Retry-After':'600'}})});
  await assert.rejects(syncGarmin(env,options(fake)),error=>error.code==='garmin_rate_limit'&&error.retryAt===new Date(time+600000).toISOString());
  const status=await garminStatus(env,{now:time});assert.equal(status.retryAt,new Date(time+600000).toISOString());assert.equal(JSON.stringify(status).includes('NEVER EXPOSE'),false);
  const next=fakeGarmin();await assert.rejects(syncGarmin(env,options(next)),error=>error.code==='cooldown');assert.equal(next.calls.length,0);
});

test('token is cached server-side, replaced after key rotation, and renewed once after Garmin rejects a bearer',async()=>{
  let fake=fakeGarmin();await syncGarmin(env,options(fake));assert.equal(fake.calls.filter(call=>call.url.includes('personal-api-key/token')).length,1);time+=61000;
  fake=fakeGarmin();await syncGarmin(env,options(fake));assert.equal(fake.calls.filter(call=>call.url.includes('personal-api-key/token')).length,0);time+=61000;
  env.GARMIN_PERSONAL_API_KEY+='-rotated';fake=fakeGarmin();await syncGarmin(env,options(fake));assert.equal(fake.calls.filter(call=>call.url.includes('personal-api-key/token')).length,1);time+=61000;
  let rejected=false;fake=fakeGarmin({intercept:async url=>{if(!rejected&&url.includes('/stats/steps/')){rejected=true;return new Response('bad token',{status:401});}}});
  await syncGarmin(env,options(fake));assert.equal(fake.calls.filter(call=>call.url.includes('personal-api-key/token')).length,1);
});

test('automatic sync is opt-in, uses the last seven Warsaw dates, and does not bypass cooldown or missing configuration',async()=>{
  const fake=fakeGarmin();assert.equal((await scheduledGarmin(env,{...fake,now:()=>time})).skipped,true);assert.equal(fake.calls.length,0);
  await setGarminAuto(env,true);
  const result=await scheduledGarmin(env,{...fake,now:()=>time});assert.equal(result.from,from);assert.equal(result.to,to);assert.equal(result.source,'automatic');
  assert.equal((await scheduledGarmin(env,{...fake,now:()=>time})).skipped,true);
  delete env.GARMIN_PERSONAL_API_KEY;assert.equal((await scheduledGarmin(env,{...fake,now:()=>time})).skipped,true);
  await assert.rejects(setGarminAuto(env,true),error=>error.code==='not_configured');await setGarminAuto(env,false);
});

test('authenticated API exposes safe status/settings and rejects unauthenticated, foreign-origin and malformed sync requests',async()=>{
  const ask=(route,method='GET',body,cookie='',origin)=>worker.fetch(new Request('https://forma.test/api/'+route,{method,headers:{'Content-Type':'application/json',Cookie:cookie,...(origin?{Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,{});
  assert.equal((await ask('garmin/status')).status,401);
  const login=await ask('login','POST',{password:env.APP_PASSWORD});const cookie=login.headers.get('Set-Cookie').split(';')[0];
  const status=await ask('garmin/status','GET',null,cookie);assert.equal(status.status,200);assert.equal((await status.json()).configured,true);
  assert.equal((await ask('garmin/settings','POST',{autoEnabled:true},cookie)).status,200);
  assert.equal((await ask('garmin/settings','POST',{autoEnabled:'true'},cookie)).status,400);
  assert.equal((await ask('garmin/settings','POST',{autoEnabled:true,key:'secret'},cookie)).status,400);
  assert.equal((await ask('garmin/sync','POST',{from,to,overwriteManual:false},cookie,'https://other.test')).status,403);
  assert.equal((await ask('garmin/sync','POST',{from:'2026-01-01',to,overwriteManual:false},cookie)).status,400);
  assert.equal((await ask('garmin/sync','POST',{from,to,overwriteManual:false,url:'https://other.test'},cookie)).status,400);
  delete env.GARMIN_PERSONAL_API_KEY;assert.equal((await ask('garmin/sync','POST',{from,to,overwriteManual:false},cookie)).status,503);
});

test('missing migration is reported as setup state and configuration remains optional for the normal diary',async()=>{
  await db.prepare('ALTER TABLE garmin_daily_imports RENAME TO temporary_garmin_imports').run();
  try {
    const status=await garminStatus(env,{now:time});assert.equal(status.schemaReady,false);assert.equal(status.configured,true);
    await assert.rejects(syncGarmin(env,options(fakeGarmin())),error=>error.code==='setup_required');
  }finally{await db.prepare('ALTER TABLE temporary_garmin_imports RENAME TO garmin_daily_imports').run();}
});

test('missing calorie migration blocks sync but leaves the ordinary diary API usable',async()=>{
  await db.prepare('ALTER TABLE garmin_daily_calories RENAME TO temporary_garmin_calories').run();
  try {
    assert.equal((await garminStatus(env,{now:time})).schemaReady,false);
    await assert.rejects(syncGarmin(env,options(fakeGarmin())),error=>error.code==='setup_required');
    const ask=(route,method='GET',body,cookie='')=>worker.fetch(new Request('https://forma.test/api/'+route,{method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env,{});
    const login=await ask('login','POST',{password:env.APP_PASSWORD}),cookie=login.headers.get('Set-Cookie').split(';')[0];
    await put(to,4321,94.75,'No migration');
    const response=await ask('state','GET',null,cookie);assert.equal(response.status,200);
    const state=await response.json();assert.deepEqual(state.daily,[{day:to,steps:4321,weight:94.75,notes:'No migration'}]);
  }finally{await db.prepare('ALTER TABLE temporary_garmin_calories RENAME TO garmin_daily_calories').run();}
});

test('summary endpoint errors retain safe calorie diagnostics and leave all imported measurements unchanged',async()=>{
  for(const [body,status,formatCode] of [['PRIVATE',200,'json'],[JSON.stringify({data:'PRIVATE'}),200,'calories_shape'],['PRIVATE',503,null]]) {
    const fake=fakeGarmin({intercept:async url=>url.includes('/v2/dailysummaries')?new Response(body,{status}):null});
    await assert.rejects(syncGarmin(env,options(fake)),error=>error.diagnostic.stage==='calories'&&(formatCode?error.diagnostic.formatCode===formatCode:error.diagnostic.httpStatus===status));
    assert.equal(await row(to),null);assert.equal(JSON.stringify(await garminStatus(env,{now:time})).includes('PRIVATE'),false);time+=61000;
  }
});

test('empty and missing upstream measurements do not erase existing daily values',async()=>{
  await put(to,4321,94.75,'Keep everything');
  let result=await syncGarmin(env,options(fakeGarmin({steps:[],weight:{dailyWeightSummaries:[]}})));
  assert.equal(result.receivedDays,0);assert.deepEqual(await row(to),{day:to,steps:4321,weight:94.75,notes:'Keep everything'});
  time+=61000;result=await syncGarmin(env,options({...fakeGarmin({steps:[{calendarDate:to,totalSteps:null}],weight:{dailyWeightSummaries:[{summaryDate:to,latestWeight:{weight:null}}]}}),overwriteManual:true}));
  assert.equal(result.receivedDays,0);assert.equal((await row(to)).weight,94.75);
});

test('manual sync route reaches the real D1 importer and daily/state API reflects the imported values',async()=>{
  const originalFetch=globalThis.fetch,fake=fakeGarmin({summary:summaries()});
  globalThis.fetch=(input,init)=>String(typeof input==='string'?input:input.url).startsWith('https://personal.connectapi.garmin.com/')?fake.fetchImpl(input,init):originalFetch(input,init);
  try {
    const ask=(route,method='GET',body,cookie='')=>worker.fetch(new Request('https://forma.test/api/'+route,{method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env,{});
    const login=await ask('login','POST',{password:env.APP_PASSWORD}),cookie=login.headers.get('Set-Cookie').split(';')[0];
    const response=await ask('garmin/sync','POST',{from,to,overwriteManual:false},cookie);
    assert.equal(response.status,200);const result=await response.json();assert.equal(result.weightDays,1);assert.equal(result.calorieDays,1);
    const state=await (await ask('state','GET',null,cookie)).json();assert.equal(state.daily[0].steps,12345);assert.equal(state.daily[0].weight,94.75);
    assert.equal(state.daily[0].garminActiveKcal,247);
    assert.ok(Number.isFinite(Date.parse(state.daily[0].garminCaloriesSyncedAt)));
    assert.ok(Date.parse(state.daily[0].garminCaloriesSyncedAt)<=Date.parse(result.at));
    const save=await ask('daily','POST',{day:to,steps:23456,weight:94.25,notes:'Manual edit',garminActiveKcal:99999},cookie);
    assert.equal(save.status,200);
    const updated=await (await ask('state','GET',null,cookie)).json();
    assert.equal(updated.daily[0].garminActiveKcal,247);assert.equal(updated.daily[0].steps,23456);assert.equal(updated.daily[0].notes,'Manual edit');
  }finally{globalThis.fetch=originalFetch;}
});

test('upstream status and stage are preserved without exposing error bodies, keys or headers',async()=>{
  const fake=fakeGarmin({intercept:async()=>new Response('PRIVATE '+env.GARMIN_PERSONAL_API_KEY,{status:503})});
  await assert.rejects(syncGarmin(env,options(fake)),error=>error.code==='garmin_unavailable'&&error.diagnostic.stage==='token'&&error.diagnostic.httpStatus===503);
  const status=await garminStatus(env,{now:time});
  assert.deepEqual(status.diagnostic,{stage:'token',httpStatus:503});assert.ok(status.error.includes('HTTP 503'));assert.ok(status.error.includes('uzyskiwanie tokenu'));
  const saved=await db.prepare("SELECT value_json FROM settings WHERE key='garmin_last_error'").first();
  assert.equal(saved.value_json.includes(env.GARMIN_PERSONAL_API_KEY),false);assert.equal(saved.value_json.includes('PRIVATE'),false);
});

test('query errors and redirects are distinguished from temporary availability and never followed with credentials',async()=>{
  let fake=fakeGarmin({intercept:async url=>url.includes('/stats/steps/')?new Response('private error',{status:400}):null});
  await assert.rejects(syncGarmin(env,options(fake)),error=>error.code==='garmin_request'&&error.diagnostic.stage==='steps'&&error.diagnostic.httpStatus===400);
  time+=61000;
  fake=fakeGarmin({intercept:async url=>url.includes('/weight/range/')?new Response(null,{status:302,headers:{Location:'https://elsewhere.test/private'}}):null});
  await assert.rejects(syncGarmin(env,options(fake)),error=>error.code==='garmin_endpoint'&&error.diagnostic.stage==='weight'&&error.diagnostic.httpStatus===302);
  assert.ok(fake.calls.every(call=>call.init.redirect==='manual'));
  assert.equal(JSON.stringify(await garminStatus(env,{now:time})).includes('elsewhere'),false);
});

test('malformed copied keys fail before network access and never appear in the diagnosis',async()=>{
  for(const key of ['Bearer TOP_SECRET','ApiKey TOP_SECRET','"TOP_SECRET"','TOP_SECRET\u2026']) {
    env.GARMIN_PERSONAL_API_KEY=key;const fake=fakeGarmin();
    await assert.rejects(syncGarmin(env,options(fake)),error=>error.code==='garmin_key_format'&&!error.message.includes('TOP_SECRET'));
    assert.equal(fake.calls.length,0);time+=61000;
  }
});

test('network failures expose only an allowed network code, never the original exception message',async()=>{
  const fake=fakeGarmin({intercept:async()=>{throw new TypeError('PRIVATE '+env.GARMIN_PERSONAL_API_KEY,{cause:{code:'ENOTFOUND'}});}});
  await assert.rejects(syncGarmin(env,options(fake)),error=>error.code==='garmin_network'&&error.diagnostic.networkCode==='ENOTFOUND');
  const status=await garminStatus(env,{now:time});assert.deepEqual(status.diagnostic,{stage:'token',networkCode:'ENOTFOUND'});
  assert.equal(JSON.stringify(status).includes(env.GARMIN_PERSONAL_API_KEY),false);
});

test('real D1 import failure is reported as storage failure and rolls back the batch',async()=>{
  let renamed=false;
  const fake=fakeGarmin({intercept:async url=>{if(url.includes('/stats/steps/')){await db.prepare('ALTER TABLE garmin_daily_imports RENAME TO temporary_garmin_imports').run();renamed=true;}}});
  try {
    await assert.rejects(syncGarmin(env,options(fake)),error=>error.code==='garmin_storage'&&error.diagnostic.stage==='database');
    assert.equal(await row(to),null);
  }finally{if(renamed)await db.prepare('ALTER TABLE temporary_garmin_imports RENAME TO garmin_daily_imports').run();}
  const status=await garminStatus(env,{now:time});assert.ok(status.error.includes('bazie aplikacji'));assert.equal(status.diagnostic.stage,'database');
});

test('a later success clears the displayed diagnosis and keeps detailed errors out of the profile/state backup',async()=>{
  const fake=fakeGarmin({intercept:async()=>new Response(null,{status:500})});
  await assert.rejects(syncGarmin(env,options(fake)),GarminError);time+=61000;
  await syncGarmin(env,options(fakeGarmin()));
  const status=await garminStatus(env,{now:time});assert.equal(status.error,null);assert.equal(status.diagnostic,null);
});
