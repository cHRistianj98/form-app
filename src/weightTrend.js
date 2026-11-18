import {MIN_WEIGHT,MAX_WEIGHT} from './weight.js';

function validDay(day) {
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
  const date=new Date(day+'T12:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;
}
const shift=(day,days)=>{const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);};
const round=value=>Math.round(value*100+1e-8)/100;
const average=rows=>rows.length?round(rows.reduce((sum,row)=>sum+row.weight,0)/rows.length):null;

// Calendar windows, not the last seven readings. Missing days stay missing;
// profile starting weight, future measurements and repeated days do not fill gaps.
export function buildWeightTrend(daily,day) {
  if(!validDay(day))throw new Error('Invalid weight trend day');
  const unique=new Map();
  for(const row of daily||[]) {
    if(validDay(row?.day)&&row.day<=day&&Number.isFinite(row.weight)&&row.weight>=MIN_WEIGHT&&row.weight<=MAX_WEIGHT&&!unique.has(row.day))unique.set(row.day,{day:row.day,weight:row.weight});
  }
  const readings=[...unique.values()].sort((a,b)=>a.day.localeCompare(b.day));
  const period=(from,to)=>{const values=readings.filter(row=>row.day>=from&&row.day<=to);return {from,to,count:values.length,average:average(values)};};
  const current=period(shift(day,-6),day),previous=period(shift(day,-13),shift(day,-7));
  const from=shift(day,-27);
  const points=readings.filter(row=>row.day>=from).map(row=>({...row,average:period(shift(row.day,-6),row.day).average}));
  return {day,from,to:day,current,previous,change:current.average!=null&&previous.average!=null?round(current.average-previous.average):null,latest:readings.at(-1)||null,points};
}
