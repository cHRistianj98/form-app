import {calcTargets,calcDailyBalance,calcDailyMovement,fmt,localDay,nutrientLabel,scaleFood,shiftDay} from './foods.js';
import {NUTRIENT_FIELDS} from './nutrients.js';
import {genericNutritionInfo} from './genericNutrition.js';
import {isPartialNutrient,isUpperBoundNutrient} from './nutritionQualifiers.js';

export function sumNutrition(entries) {
  const rows=entries.map(entry=>scaleFood(entry.food,entry.grams));
  const totals={},coverage={};
  for (const key of NUTRIENT_FIELDS) {
    const known=rows.filter(row=>row[key]!=null&&Number.isFinite(row[key]));
    totals[key]=known.length?known.reduce((sum,row)=>sum+row[key],0):null;
    coverage[key]={known:known.length,total:entries.length,complete:entries.length>0&&known.length===entries.length&&!entries.some(entry=>isPartialNutrient(entry.food,key)),
      upper:entries.some(entry=>isUpperBoundNutrient(entry.food,key))};
  }
  return {totals,coverage,entryCount:entries.length,genericEntryCount:entries.filter(entry=>genericNutritionInfo(entry.food)).length};
}

export function totalLabel(summary,key,digits=1,divisor=1) {
  const value=summary.totals[key];
  if (value==null) return '—';
  const c=summary.coverage[key];
  if (!c.complete) {
    const known=value/divisor;
    const lower=Math.floor(known*10**digits)/10**digits;
    return `${c.upper?'≈':'≥'} ${fmt(c.upper?known:lower,digits)}`;
  }
  return nutrientLabel(value/divisor,c.upper,digits);
}

export function calendarWeek(day) {
  const weekday=new Date(day+'T12:00:00').getDay();
  const start=shiftDay(day,-((weekday+6)%7));
  return Array.from({length:7},(_,i)=>shiftDay(start,i));
}

export function targetsOnDay(profile,daily,day) {
  const latest=daily.filter(row=>row.day<=day&&Number(row.weight)>0).sort((a,b)=>b.day.localeCompare(a.day))[0];
  return calcTargets(profile,latest?.weight||profile.startWeight);
}

export function recentEnergyDays({entries,daily,activities,day}) {
  return Array.from({length:7},(_,i)=>{
    const date=shiftDay(day,i-6);
    const summary=sumNutrition(entries.filter(entry=>entry.day===date));
    const movement=calcDailyMovement(daily.find(row=>row.day===date)?.steps||0,activities.filter(a=>a.day===date)).total;
    const eaten=summary.totals.kcal;
    return {day:date,summary,eaten,movement,net:eaten==null?null:eaten-movement};
  });
}

export function nutritionReport({entries,daily,activities=[],profile,day,period='day',today=localDay()}) {
  const dates=period==='week'?calendarWeek(day):[day];
  const allowed=new Set(dates.filter(date=>date<=today));
  const selected=entries.filter(entry=>allowed.has(entry.day));
  const summary=sumNutrition(selected);
  const days=dates.map(date=>{
    const records=date<=today?entries.filter(entry=>entry.day===date):[];
    const baseGoal=targetsOnDay(profile,daily,date>today?today:date);
    const movement=date>today?0:calcDailyMovement(daily.find(row=>row.day===date)?.steps||0,activities.filter(a=>a.day===date)).total;
    const goal={...baseGoal,calories:calcDailyBalance(baseGoal,0,movement).budget};
    return {day:date,summary:sumNutrition(records),goal,movement,future:date>today};
  });
  const goals=Object.fromEntries(['kcal','protein','fat','carbs'].map(key=>[key,days.reduce((sum,d)=>sum+d.goal[key==='kcal'?'calories':key],0)]));
  const loggedDays=days.filter(d=>d.summary.entryCount>0).length;
  return {summary,days,goals,loggedDays,dayCount:dates.length,elapsedDays:allowed.size,
    from:dates[0],to:dates.at(-1),period};
}
