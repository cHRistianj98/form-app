// Garmin Connect Personal API, public OpenAPI consulted 2026-11-18:
// https://developer.garmin.com/gc-developer-program/personal/swagger-docs/
// StepsDailyStatDTO.totalSteps: integer. OpenAPI describes weight as kilograms,
// but live Personal API clients report grams. Normalize both disjoint ranges.
// https://github.com/thomascamminady/gcpapi-sync-python#endpoints
// Calendar dates are Garmin's local dates; adjacent weights are graph context.
export function validGarminDay(day) {
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number(day.slice(0,4))<2000||Number(day.slice(0,4))>2100)return false;
  const date=new Date(day+'T12:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;
}
export function shiftGarminDay(day,amount) {
  const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10);
}
export const garminToday=(now=Date.now())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
export function validGarminRange(from,to,today) {
  return validGarminDay(from)&&validGarminDay(to)&&from<=to&&to<=today&&(new Date(to+'T12:00:00Z')-new Date(from+'T12:00:00Z'))/86400000<28;
}
export class GarminPayloadError extends Error {
  constructor(stage,formatCode){super('GARMIN_PAYLOAD');this.stage=stage;this.formatCode=formatCode;}
}
function malformed(stage,formatCode){throw new GarminPayloadError(stage,formatCode);}
function weightInKg(value) {
  if(typeof value!=='number'||!Number.isFinite(value))malformed('weight','weight_value');
  const kg=value>=20000&&value<=500000?value/1000:value;
  if(kg<20||kg>500)malformed('weight','weight_value');
  return Math.round(kg*100+1e-8)/100;
}
export function parseGarminData(stepsPayload,weightPayload,from,to,summaryPayload=null) {
  const days=new Map();
  const row=day=>{if(!days.has(day))days.set(day,{day,steps:null,weight:null});return days.get(day);};
  if(stepsPayload!=null&&!Array.isArray(stepsPayload))malformed('steps','steps_shape');
  for(const item of stepsPayload||[]) {
    if(!item||!validGarminDay(item.calendarDate))malformed('steps','steps_date');
    if(item.calendarDate<from||item.calendarDate>to||item.totalSteps==null)continue;
    if(!Number.isInteger(item.totalSteps)||item.totalSteps<0||item.totalSteps>200000)malformed('steps','steps_value');
    const target=row(item.calendarDate);
    if(target.steps!=null&&target.steps!==item.totalSteps)malformed('steps','steps_duplicate');
    target.steps=item.totalSteps;
  }
  if(weightPayload!=null&&!Array.isArray(weightPayload.dailyWeightSummaries))malformed('weight','weight_shape');
  for(const item of weightPayload?.dailyWeightSummaries||[]) {
    if(!item||!validGarminDay(item.summaryDate))malformed('weight','weight_date');
    if(item.summaryDate<from||item.summaryDate>to||item.latestWeight==null)continue;
    const measurement=item.latestWeight;
    if(typeof measurement!=='object'||Array.isArray(measurement))malformed('weight','weight_shape');
    if(measurement.calendarDate!=null&&measurement.calendarDate!==item.summaryDate)malformed('weight','weight_date');
    if(measurement.weight==null)continue;
    const weight=weightInKg(measurement.weight),target=row(item.summaryDate);
    if(target.weight!=null&&target.weight!==weight)malformed('weight','weight_duplicate');
    target.weight=weight;
  }
  // V2 daily summaries wrap days in `data`. Import only active kcal, never
  // burnedTotal/resting/consumed calories or an inferred zero for missing data.
  if(summaryPayload!=null&&!Array.isArray(summaryPayload.data))malformed('calories','calories_shape');
  for(const item of summaryPayload?.data||[]) {
    if(!item||!validGarminDay(item.calendarDate))malformed('calories','calories_date');
    if(item.calendarDate<from||item.calendarDate>to||item.calories==null)continue;
    if(typeof item.calories!=='object'||Array.isArray(item.calories))malformed('calories','calories_shape');
    const value=item.calories.burnedActive;
    if(value==null)continue;
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>30000)malformed('calories','calories_value');
    const target=row(item.calendarDate);
    if(target.activeKcal!=null&&target.activeKcal!==value)malformed('calories','calories_duplicate');
    target.activeKcal=value;
  }
  return [...days.values()].sort((a,b)=>a.day.localeCompare(b.day));
}

// One transaction protects notes and edits made while the HTTP fetch was running.
// Ownership remains with Garmin only while a value equals its last applied value.
// The run ID also fences off an old worker whose lease has been taken over.
export function garminImportStatements(db,rows,runId,overwriteManual=false,importedAt=new Date().toISOString()) {
  const payload=JSON.stringify(rows),overwrite=overwriteManual?1:0;
  const owned="EXISTS (SELECT 1 FROM garmin_sync_state WHERE id=1 AND lock_id=?2)";
  const steps="json_extract(j.value,'$.steps') IS NOT NULL AND (?3=1 OR (g.steps IS NULL AND d.steps=0) OR g.steps=d.steps)";
  const weight="json_extract(j.value,'$.weight') IS NOT NULL AND (?3=1 OR (g.weight IS NULL AND d.weight IS NULL) OR g.weight=d.weight)";
  return [
    db.prepare(`INSERT INTO daily_metrics(day,steps,weight,notes) SELECT json_extract(value,'$.day'),0,NULL,'' FROM json_each(?1) WHERE ${owned} ON CONFLICT(day) DO NOTHING`).bind(payload,runId),
    db.prepare(`INSERT INTO garmin_daily_imports(day) SELECT json_extract(value,'$.day') FROM json_each(?1) WHERE ${owned} ON CONFLICT(day) DO NOTHING`).bind(payload,runId),
    db.prepare(`UPDATE garmin_daily_imports AS g SET
      steps=CASE WHEN ${steps} THEN json_extract(j.value,'$.steps') ELSE g.steps END,
      weight=CASE WHEN ${weight} THEN json_extract(j.value,'$.weight') ELSE g.weight END,
      steps_run=CASE WHEN ${steps} THEN ?2 ELSE NULL END,
      weight_run=CASE WHEN ${weight} THEN ?2 ELSE NULL END
      FROM json_each(?1) AS j JOIN daily_metrics AS d ON d.day=json_extract(j.value,'$.day')
      WHERE g.day=d.day AND ${owned}`).bind(payload,runId,overwrite),
    db.prepare(`UPDATE daily_metrics AS d SET
      steps=CASE WHEN g.steps_run=?1 THEN g.steps ELSE d.steps END,
      weight=CASE WHEN g.weight_run=?1 THEN g.weight ELSE d.weight END
      FROM garmin_daily_imports AS g WHERE d.day=g.day AND (g.steps_run=?1 OR g.weight_run=?1)
      AND EXISTS (SELECT 1 FROM garmin_sync_state WHERE id=1 AND lock_id=?1)`).bind(runId),
    db.prepare(`INSERT INTO garmin_daily_calories(day,active_kcal,synced_at)
      SELECT json_extract(value,'$.day'),json_extract(value,'$.activeKcal'),?3 FROM json_each(?1)
      WHERE json_extract(value,'$.activeKcal') IS NOT NULL AND ${owned}
      ON CONFLICT(day) DO UPDATE SET active_kcal=excluded.active_kcal,synced_at=excluded.synced_at`).bind(payload,runId,importedAt),
    db.prepare(`SELECT g.day,g.steps_run,g.weight_run FROM garmin_daily_imports AS g JOIN json_each(?1) AS j ON g.day=json_extract(j.value,'$.day') WHERE ${owned}`).bind(payload,runId),
  ];
}
