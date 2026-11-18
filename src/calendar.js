import {localDay,shiftDay} from './foods.js';

export const monthStart=day=>day.slice(0,7)+'-01';
export function shiftMonth(day,amount) {
  const date=new Date(monthStart(day)+'T12:00:00');
  date.setMonth(date.getMonth()+amount);
  return localDay(date);
}

export function dayInMonth(day,month,today) {
  const start=monthStart(month);
  const last=shiftDay(shiftMonth(start,1),-1);
  const next=start.slice(0,8)+String(Math.min(Number(day.slice(8)),Number(last.slice(8)))).padStart(2,'0');
  return next>today?today:next;
}

export function calendarCells(month,today) {
  const start=monthStart(month);
  const offset=(new Date(start+'T12:00:00').getDay()+6)%7;
  const first=shiftDay(start,-offset);
  return Array.from({length:42},(_,index)=>{
    const day=shiftDay(first,index);
    return {day,number:Number(day.slice(8)),inMonth:day.slice(0,7)===start.slice(0,7),today:day===today,disabled:day>today};
  });
}

export const calendarDayLabel=day=>new Date(day+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

export function daySwipeDirection({dx,dy,maxY=Math.abs(dy),duration,fingers=1}) {
  if(fingers!==1||duration<0||duration>1500||Math.abs(dx)<64||Math.max(maxY,Math.abs(dy))>50||Math.abs(dx)<Math.abs(dy)*1.7)return 0;
  return dx>0?-1:1;
}

export function adjacentDiaryDay(day,direction,today) {
  const next=shiftDay(day,direction);
  return next>today?day:next;
}
