// Garmin Connect Personal API, public OpenAPI consulted 2026-11-18:
// https://developer.garmin.com/gc-developer-program/personal/swagger-docs/
// StepsDailyStatDTO.totalSteps: integer. DateWeightDTO.weight: KILOGRAMS.
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
function malformed(){throw new Error('GARMIN_PAYLOAD');}
export function parseGarminData(stepsPayload,weightPayload,from,to) {
  const days=new Map();
  const row=day=>{if(!days.has(day))days.set(day,{day,steps:null,weight:null});return days.get(day);};
  if(stepsPayload!=null&&!Array.isArray(stepsPayload))malformed();
  for(const item of stepsPayload||[]) {
    if(!item||!validGarminDay(item.calendarDate))malformed();
    if(item.calendarDate<from||item.calendarDate>to||item.totalSteps==null)continue;
    if(!Number.isInteger(item.totalSteps)||item.totalSteps<0||item.totalSteps>200000)malformed();
    const target=row(item.calendarDate);
    if(target.steps!=null&&target.steps!==item.totalSteps)malformed();
    target.steps=item.totalSteps;
  }
  if(weightPayload!=null&&!Array.isArray(weightPayload.dailyWeightSummaries))malformed();
  for(const item of weightPayload?.dailyWeightSummaries||[]) {
    if(!item||!validGarminDay(item.summaryDate))malformed();
    if(item.summaryDate<from||item.summaryDate>to||item.latestWeight==null)continue;
    const measurement=item.latestWeight;
    if(measurement.calendarDate!=null&&measurement.calendarDate!==item.summaryDate)malformed();
    if(measurement.weight==null)continue;
    if(typeof measurement.weight!=='number'||!Number.isFinite(measurement.weight)||measurement.weight<20||measurement.weight>500)malformed();
    const target=row(item.summaryDate),weight=Math.round(measurement.weight*100+1e-8)/100;
    if(target.weight!=null&&target.weight!==weight)malformed();
    target.weight=weight;
  }
  return [...days.values()].sort((a,b)=>a.day.localeCompare(b.day));
}

// One transaction protects notes and edits made while the HTTP fetch was running.
// Ownership remains with Garmin only while a value equals its last applied value.
// The run ID also fences off an old worker whose lease has been taken over.
export function garminImportStatements(db,rows,runId,overwriteManual=false) {
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
    db.prepare(`SELECT g.day,g.steps_run,g.weight_run FROM garmin_daily_imports AS g JOIN json_each(?1) AS j ON g.day=json_extract(j.value,'$.day') WHERE ${owned}`).bind(payload,runId),
  ];
}
