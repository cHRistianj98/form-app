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
let mf,db,env,time,counter=0;
before(async()=>{
  mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:{DB:'garmin-integration-tests'}}));
  db=await mf.getD1Database('DB');
  const schema=await readFile(new URL('../schema.sql',import.meta.url),'utf8');
  for(const sql of schema.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
});
after(async()=>{await mf?.dispose();});
beforeEach(async()=>{
  await db.batch(['daily_metrics','garmin_daily_imports','garmin_sync_state','settings'].map(table=>db.prepare(`DELETE FROM ${table}`)));
  await db.prepare('INSERT INTO garmin_sync_state(id) VALUES(1)').run();time=baseTime;
  env={DB:db,GARMIN_PERSONAL_API_KEY:`synthetic-key-${++counter}`,APP_PASSWORD:'garmin-test-password',SESSION_SECRET:'garmin-test-session-secret-over-20'};
});
const options=extra=>({from,to,now:()=>time,...extra});
function fakeGarmin({steps=[{calendarDate:to,totalSteps:12345}],weight=weights(),intercept}={}) {
  const calls=[];
  const fetchImpl=async(url,init)=>{
    calls.push({url,init});const override=await intercept?.(url,init,calls.length);if(override)return override;
    if(url.includes('personal-api-key/token'))return new Response(jwt(time));
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
  for(const payload of [weights(to,94750),weights(to,0),{dailyWeightSummaries:[{summaryDate:to,latestWeight:{calendarDate:from,weight:95}}]},{}])assert.throws(()=>parseGarminData([],payload,from,to),/GARMIN_PAYLOAD/);
  for(const payload of [{steps:1},[{calendarDate:to,totalSteps:-1}],[{calendarDate:to,totalSteps:1.5}],[{calendarDate:'invalid',totalSteps:1}],[{calendarDate:to,totalSteps:1},{calendarDate:to,totalSteps:2}]])assert.throws(()=>parseGarminData(payload,null,from,to),/GARMIN_PAYLOAD/);
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
  await db.batch(garminImportStatements(db,[{day:to,steps:99999,weight:40}],'old-run',true));
  assert.equal((await row(to)).steps,12345);assert.equal((await row(to)).weight,94.75);
});

test('one bad upstream response or invalid weight fails the whole import before any diary write',async()=>{
  const bad=fakeGarmin({weight:weights(to,94750)});
  await assert.rejects(syncGarmin(env,options(bad)),error=>error.code==='garmin_payload');
  assert.equal(await row(to),null);let status=await garminStatus(env,{now:time});assert.equal(status.busy,false);assert.equal(status.lastSuccess,null);
  assert.ok(status.error.includes('Format danych'));time+=61000;
  const failure=fakeGarmin({intercept:async url=>url.includes('/weight/range/')?new Response('private response',{status:500}):null});
  await assert.rejects(syncGarmin(env,options(failure)),error=>error.code==='garmin_unavailable');assert.equal(await row(to),null);
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

test('empty and missing upstream measurements do not erase existing daily values',async()=>{
  await put(to,4321,94.75,'Keep everything');
  let result=await syncGarmin(env,options(fakeGarmin({steps:[],weight:{dailyWeightSummaries:[]}})));
  assert.equal(result.receivedDays,0);assert.deepEqual(await row(to),{day:to,steps:4321,weight:94.75,notes:'Keep everything'});
  time+=61000;result=await syncGarmin(env,options({...fakeGarmin({steps:[{calendarDate:to,totalSteps:null}],weight:{dailyWeightSummaries:[{summaryDate:to,latestWeight:{weight:null}}]}}),overwriteManual:true}));
  assert.equal(result.receivedDays,0);assert.equal((await row(to)).weight,94.75);
});

test('manual sync route reaches the real D1 importer and daily/state API reflects the imported values',async()=>{
  const originalFetch=globalThis.fetch,fake=fakeGarmin();
  globalThis.fetch=(input,init)=>String(typeof input==='string'?input:input.url).startsWith('https://personal.connectapi.garmin.com/')?fake.fetchImpl(input,init):originalFetch(input,init);
  try {
    const ask=(route,method='GET',body,cookie='')=>worker.fetch(new Request('https://forma.test/api/'+route,{method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env,{});
    const login=await ask('login','POST',{password:env.APP_PASSWORD}),cookie=login.headers.get('Set-Cookie').split(';')[0];
    const response=await ask('garmin/sync','POST',{from,to,overwriteManual:false},cookie);
    assert.equal(response.status,200);assert.equal((await response.json()).weightDays,1);
    const state=await (await ask('state','GET',null,cookie)).json();assert.equal(state.daily[0].steps,12345);assert.equal(state.daily[0].weight,94.75);
  }finally{globalThis.fetch=originalFetch;}
});
