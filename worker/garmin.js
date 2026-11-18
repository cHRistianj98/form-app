import {GarminPayloadError,garminImportStatements,garminToday,parseGarminData,shiftGarminDay,validGarminRange} from './garmin-data.js';

const HOST='https://personal.connectapi.garmin.com';
const TOKEN_PATH='/personalapitoken-service/personal-api/personal-api-key/token';
const errors={
  setup_required:'Dokończ konfigurację Garmin w Cloudflare według instrukcji.',
  not_configured:'Dodaj klucz Garmin w ustawieniach Cloudflare.',
  garmin_auth:'Garmin odrzucił dostęp. Sprawdź, czy Personal API Key jest poprawny i nadal ważny.',
  garmin_key_format:'Klucz Garmin ma niepoprawny format. Wklej sam Personal API Key, bez przedrostka ApiKey lub Bearer, spacji i cudzysłowów.',
  garmin_request:'Garmin odrzucił parametry żądania. Sprawdź szczegóły błędu poniżej.',
  garmin_endpoint:'Garmin zwrócił nieoczekiwany adres lub metodę API. Sprawdź szczegóły błędu poniżej.',
  garmin_network:'Nie udało się połączyć serwera aplikacji z API Garmin.',
  garmin_storage:'Nie udało się zapisać synchronizacji w bazie aplikacji.',
  garmin_rate_limit:'Garmin ograniczył liczbę zapytań. Spróbuj ponownie po wskazanym czasie.',
  garmin_unavailable:'Garmin jest chwilowo niedostępny. Spróbuj ponownie później.',
  garmin_timeout:'Garmin nie odpowiedział na czas. Spróbuj ponownie później.',
  garmin_payload:'Format danych Garmin jest niezgodny z oczekiwanym. Nie zapisano tego importu.',
  busy:'Synchronizacja już trwa. Zaczekaj na jej zakończenie.',
  cooldown:'Zaczekaj chwilę przed kolejną synchronizacją.',
  invalid_range:'Wybierz poprawny zakres do 28 dni, kończący się najpóźniej dzisiaj.',
};
const stageNames={token:'uzyskiwanie tokenu',steps:'pobieranie kroków',weight:'pobieranie wagi',calories:'pobieranie kalorii aktywnych',data:'odczyt danych',database:'zapis w bazie D1'};
const formatNames={json:'odpowiedź nie jest poprawnym JSON',steps_shape:'struktura listy kroków',steps_date:'data kroków',steps_value:'wartość kroków',steps_duplicate:'sprzeczne wpisy kroków',weight_shape:'struktura pomiarów wagi',weight_date:'data pomiaru wagi',weight_value:'wartość lub jednostka wagi',weight_duplicate:'sprzeczne pomiary wagi',calories_shape:'struktura podsumowania kalorii',calories_date:'data kalorii aktywnych',calories_value:'wartość kalorii aktywnych',calories_duplicate:'sprzeczne sumy kalorii aktywnych'};
const networkCodes=new Set(['ENOTFOUND','EAI_AGAIN','ECONNRESET','ECONNREFUSED','ETIMEDOUT','EPIPE','ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE']);
const databaseCodes=new Set(['SQLITE_ERROR','SQLITE_BUSY','SQLITE_LOCKED','SQLITE_AUTH','SQLITE_CONSTRAINT','SQLITE_FULL','SQLITE_TOOBIG','SQLITE_MISMATCH']);
// Diagnostics contain only allowlisted identifiers/numbers. Never persist or
// return response bodies, request headers, JWTs, raw exception messages or URLs.
function safeDiagnostic(value) {
  if(!value||!Object.hasOwn(stageNames,value.stage))return null;
  const safe={stage:value.stage};
  if(Number.isInteger(value.httpStatus)&&value.httpStatus>=100&&value.httpStatus<=599)safe.httpStatus=value.httpStatus;
  if(networkCodes.has(value.networkCode))safe.networkCode=value.networkCode;
  if(databaseCodes.has(value.databaseCode))safe.databaseCode=value.databaseCode;
  if(Object.hasOwn(formatNames,value.formatCode))safe.formatCode=value.formatCode;
  if(Number.isInteger(value.cloudflareCode)&&value.cloudflareCode>=1000&&value.cloudflareCode<=1099)safe.cloudflareCode=value.cloudflareCode;
  return safe;
}
function diagnosticText(detail) {
  if(!detail)return '';
  return ` Etap: ${stageNames[detail.stage]}.${detail.httpStatus?` HTTP ${detail.httpStatus}.`:''}${detail.networkCode?` Kod sieci: ${detail.networkCode}.`:''}${detail.cloudflareCode?` Kod Cloudflare: ${detail.cloudflareCode}.`:''}${detail.databaseCode?` Kod bazy: ${detail.databaseCode}.`:''}${detail.formatCode?` Problem: ${formatNames[detail.formatCode]}.`:''}`;
}
export class GarminError extends Error {
  constructor(code,status=502,retryAt=null,diagnostic=null){
    const safe=safeDiagnostic(diagnostic);
    super((errors[code]||errors.garmin_unavailable)+diagnosticText(safe));
    this.code=code;this.status=status;this.retryAt=retryAt;this.diagnostic=safe;
  }
}
let tokenCache=null;
const iso=ms=>new Date(ms).toISOString();
const missingSchema=error=>/no such table.*garmin_/i.test(String(error?.message));
function configured(env){return typeof env.GARMIN_PERSONAL_API_KEY==='string'&&!!env.GARMIN_PERSONAL_API_KEY.trim();}
async function state(db) {
  try {
    const result=await db.prepare('SELECT s.* FROM garmin_sync_state AS s LEFT JOIN garmin_daily_imports AS g ON 0 LEFT JOIN garmin_daily_calories AS c ON 0 WHERE s.id=1').first();
    if(!result)throw new GarminError('setup_required',503);
    return result;
  }catch(error){if(missingSchema(error))throw new GarminError('setup_required',503);throw error;}
}
export async function garminStatus(env,{now=Date.now()}={}) {
  let s;
  try{s=await state(env.DB);}catch(error){if(error.code==='setup_required')return {configured:configured(env),schemaReady:false,autoEnabled:false,error:errors.setup_required};throw error;}
  let diagnostic=null;
  if(s.last_error_code) {
    const row=await env.DB.prepare("SELECT value_json FROM settings WHERE key='garmin_last_error'").first();
    try{const saved=JSON.parse(row?.value_json||'null');if(saved?.attempt===s.last_attempt&&saved.code===s.last_error_code)diagnostic=safeDiagnostic(saved.diagnostic);}catch{}
  }
  return {configured:configured(env),schemaReady:true,autoEnabled:!!s.auto_enabled,
    lastAttempt:s.last_attempt,lastSuccess:s.last_success,lastResult:s.last_result_json?JSON.parse(s.last_result_json):null,
    error:s.last_error_code?new GarminError(s.last_error_code,502,null,diagnostic).message:null,diagnostic,
    busy:s.lock_until>now,retryAt:s.next_allowed_at>now?iso(s.next_allowed_at):null};
}
export async function setGarminAuto(env,enabled) {
  await state(env.DB);
  if(enabled&&!configured(env))throw new GarminError('not_configured',503);
  await env.DB.prepare('UPDATE garmin_sync_state SET auto_enabled=? WHERE id=1').bind(enabled?1:0).run();
  return garminStatus(env);
}
function retryTime(header,now) {
  const seconds=Number(header),date=Date.parse(header);
  const wait=header&&Number.isFinite(seconds)?seconds*1000:Number.isFinite(date)?date-now:600000;
  return now+Math.max(60000,Math.min(86400000,wait));
}
async function request(path,options,{fetchImpl,now}) {
  const stage=path===TOKEN_PATH?'token':path.startsWith('/usersummary-service/v2/dailysummaries')?'calories':path.startsWith('/usersummary-service/')?'steps':'weight';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetchImpl(HOST+path,{...options,redirect:'manual',signal:controller.signal});
    const diagnostic={stage,httpStatus:response.status};
    if(response.status===401||response.status===403||(stage==='token'&&response.status===400))throw new GarminError('garmin_auth',502,null,diagnostic);
    if(response.status===429)throw new GarminError('garmin_rate_limit',429,iso(retryTime(response.headers.get('Retry-After'),now())),diagnostic);
    if(response.status===404||response.status===405||(response.status>=300&&response.status<400))throw new GarminError('garmin_endpoint',502,null,diagnostic);
    if(response.status>=400&&response.status<500)throw new GarminError('garmin_request',502,null,diagnostic);
    if(!response.ok)throw new GarminError('garmin_unavailable',502,null,diagnostic);
    const text=await response.text();
    if(text.length>1000000)throw new GarminError('garmin_payload',502,null,{stage});
    return text;
  }catch(error) {
    if(error instanceof GarminError)throw error;
    const cloudflareCode=Number(String(error?.message||'').match(/error code:\s*(10\d\d)\b/i)?.[1]);
    throw new GarminError(controller.signal.aborted?'garmin_timeout':'garmin_network',502,null,{stage,networkCode:error?.cause?.code||error?.code,cloudflareCode});
  }finally{clearTimeout(timeout);}
}
async function token(env,options,force=false) {
  const key=env.GARMIN_PERSONAL_API_KEY.trim();
  if(key.length>8192||/[^\x21-\x7e]/.test(key)||/^["']|["']$/.test(key))throw new GarminError('garmin_key_format',502,null,{stage:'token'});
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
  const fingerprint=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(!force&&tokenCache?.fingerprint===fingerprint&&tokenCache.expiresAt>options.now()+60000)return tokenCache.value;
  const value=(await request(TOKEN_PATH,{method:'POST',body:'',headers:{Authorization:`ApiKey ${key}`,Accept:'*/*'}},options)).trim();
  let expiresAt;
  try {
    if(!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(value))throw new Error();
    const payload=value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const decoded=JSON.parse(atob(payload.padEnd(Math.ceil(payload.length/4)*4,'=')));
    expiresAt=decoded.exp*1000;
    if(!Number.isFinite(expiresAt)||expiresAt<=options.now())throw new Error();
  }catch {throw new GarminError('garmin_payload',502,null,{stage:'token'});}
  tokenCache={fingerprint,value,expiresAt:Math.min(expiresAt,options.now()+86400000)};
  return value;
}
async function fetchData(env,from,to,options) {
  let bearer=await token(env,options);
  for(let attempt=0;attempt<2;attempt++) {
    try {
      const headers={Authorization:`Bearer ${bearer}`,Accept:'application/json'};
      const texts=await Promise.all([
        request(`/usersummary-service/stats/steps/daily/${from}/${to}`,{headers},options),
        request(`/weight-service/weight/range/${from}/${to}?includeAll=false`,{headers},options),
        request(`/usersummary-service/v2/dailysummaries?startDate=${from}&endDate=${to}`,{headers},options),
      ]);
      const payloads=texts.map((text,index)=>{
        try{return text?JSON.parse(text):null;}
        catch {throw new GarminError('garmin_payload',502,null,{stage:['steps','weight','calories'][index],formatCode:'json'});}
      });
      try{return parseGarminData(payloads[0],payloads[1],from,to,payloads[2]);}
      catch(error){throw new GarminError('garmin_payload',502,null,error instanceof GarminPayloadError?{stage:error.stage,formatCode:error.formatCode}:{stage:'data'});}
    }catch(error) {
      if(error.code!=='garmin_auth'||attempt)throw error;
      bearer=await token(env,options,true);
    }
  }
}
export async function syncGarmin(env,{from,to,overwriteManual=false,source='manual',fetchImpl=fetch,now=Date.now}={}) {
  const started=now(),today=garminToday(started);
  if(!validGarminRange(from,to,today)||typeof overwriteManual!=='boolean')throw new GarminError('invalid_range',400);
  await state(env.DB);
  if(!configured(env))throw new GarminError('not_configured',503);
  const runId=crypto.randomUUID();
  const acquired=await env.DB.prepare('UPDATE garmin_sync_state SET lock_id=?1,lock_until=?2,last_attempt=?3 WHERE id=1 AND lock_until<=?4 AND next_allowed_at<=?4 RETURNING id')
    .bind(runId,started+120000,iso(started),started).first();
  if(!acquired) {
    const latest=await state(env.DB);
    throw new GarminError(latest.lock_until>started?'busy':'cooldown',latest.lock_until>started?409:429,iso(Math.max(latest.lock_until,latest.next_allowed_at)));
  }
  let phase='token';
  try {
    const rows=await fetchData(env,from,to,{fetchImpl,now});
    phase='database';
    const batch=await env.DB.batch(garminImportStatements(env.DB,rows,runId,overwriteManual,iso(now())));
    const applied=new Map(batch.at(-1).results.map(row=>[row.day,row]));
    if(rows.length&&applied.size!==rows.length)throw new GarminError('busy',409);
    const result={from,to,source,at:iso(now()),receivedDays:rows.length,
      stepsDays:rows.filter(row=>row.steps!=null&&applied.get(row.day)?.steps_run===runId).length,
      weightDays:rows.filter(row=>row.weight!=null&&applied.get(row.day)?.weight_run===runId).length,
      calorieDays:rows.filter(row=>row.activeKcal!=null).length,
      protectedSteps:rows.filter(row=>row.steps!=null&&applied.get(row.day)?.steps_run!==runId).length,
      protectedWeights:rows.filter(row=>row.weight!=null&&applied.get(row.day)?.weight_run!==runId).length};
    const finished=await env.DB.prepare('UPDATE garmin_sync_state SET last_success=?1,last_result_json=?2,last_error_code=NULL,next_allowed_at=?3,lock_id=NULL,lock_until=0 WHERE id=1 AND lock_id=?4 RETURNING id')
      .bind(result.at,JSON.stringify(result),now()+60000,runId).first();
    if(!finished)throw new GarminError('busy',409);
    return result;
  }catch(error) {
    const databaseCode=String(error?.message||'').match(/\bSQLITE_[A-Z_]+\b/)?.[0];
    const safe=error instanceof GarminError?error:new GarminError(phase==='database'?'garmin_storage':'garmin_network',502,null,{stage:phase,databaseCode});
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO settings(key,value_json) SELECT 'garmin_last_error',?1 WHERE EXISTS(SELECT 1 FROM garmin_sync_state WHERE id=1 AND lock_id=?2) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json")
          .bind(JSON.stringify({attempt:iso(started),code:safe.code,diagnostic:safe.diagnostic}),runId),
        env.DB.prepare('UPDATE garmin_sync_state SET last_error_code=?1,next_allowed_at=?2,lock_id=NULL,lock_until=0 WHERE id=1 AND lock_id=?3')
          .bind(safe.code,safe.retryAt?Date.parse(safe.retryAt):now()+60000,runId),
      ]);
    }catch{console.error('Garmin diagnostic persistence failed',{code:safe.code});}
    throw safe;
  }
}
export async function scheduledGarmin(env,{now=Date.now,fetchImpl=fetch}={}) {
  if(!env.DB||!configured(env))return {skipped:true};
  try {
    const s=await state(env.DB),time=now();
    if(!s.auto_enabled||s.lock_until>time||s.next_allowed_at>time)return {skipped:true};
    const to=garminToday(time);
    return await syncGarmin(env,{from:shiftGarminDay(to,-6),to,source:'automatic',fetchImpl,now});
  }catch(error) {
    // Never log Garmin response bodies, tokens, or the API key.
    if(!['setup_required','busy','cooldown'].includes(error.code))console.error('Garmin scheduled sync failed',{code:error instanceof GarminError?error.code:'storage_error'});
    return {skipped:true,code:error instanceof GarminError?error.code:'storage_error'};
  }
}
