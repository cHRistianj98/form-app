import React,{useEffect,useRef,useState} from 'react';
import {CalendarDays,ChevronDown,ChevronLeft,ChevronRight} from 'lucide-react';
import Modal from './Modal.jsx';
import {localDay,shiftDay} from './foods.js';
import {adjacentDiaryDay,calendarCells,calendarDayLabel,dayInMonth,monthStart,shiftMonth} from './calendar.js';
import './date-navigation.css';

const weekdays=['Pn','Wt','Śr','Cz','Pt','So','Nd'];
const months=Array.from({length:12},(_,index)=>new Date(2020,index,1).toLocaleDateString('pl-PL',{month:'long'}));

function DatePicker({day,today,recordedDays,onSelect,onClose}) {
  const [month,setMonth]=useState(()=>monthStart(day));
  const [focusedDay,setFocusedDay]=useState(day);
  const bodyRef=useRef(null),focusRequested=useRef(true);
  const cells=calendarCells(month,today);
  const year=Number(month.slice(0,4)),monthIndex=Number(month.slice(5,7))-1;
  const firstYear=Math.min(2000,year,...[...recordedDays].map(date=>Number(date.slice(0,4))));
  const years=Array.from({length:Number(today.slice(0,4))-firstYear+1},(_,index)=>Number(today.slice(0,4))-index);

  useEffect(()=>{focusRequested.current=true;},[]);
  useEffect(()=>{
    if(focusRequested.current){bodyRef.current?.querySelector(`[data-date="${focusedDay}"]`)?.focus({preventScroll:true});focusRequested.current=false;}
  },[focusedDay,month]);

  function showMonth(next) {
    const bounded=next.slice(0,7)>today.slice(0,7)?monthStart(today):monthStart(next);
    setMonth(bounded);setFocusedDay(dayInMonth(focusedDay,bounded,today));
  }
  function moveFocus(event,date) {
    let next;
    if(event.key==='ArrowLeft')next=shiftDay(date,-1);
    else if(event.key==='ArrowRight')next=shiftDay(date,1);
    else if(event.key==='ArrowUp')next=shiftDay(date,-7);
    else if(event.key==='ArrowDown')next=shiftDay(date,7);
    else if(event.key==='Home')next=shiftDay(date,-((new Date(date+'T12:00:00').getDay()+6)%7));
    else if(event.key==='End')next=shiftDay(date,6-((new Date(date+'T12:00:00').getDay()+6)%7));
    else if(event.key==='PageUp'||event.key==='PageDown')next=dayInMonth(date,shiftMonth(date,(event.key==='PageUp'?-1:1)*(event.shiftKey?12:1)),today);
    else return;
    event.preventDefault();if(next>today||next===focusedDay)return;
    focusRequested.current=true;setFocusedDay(next);setMonth(monthStart(next));
  }

  return <Modal title="Wybierz dzień" subtitle={calendarDayLabel(day)} onClose={onClose} className="date-picker-dialog" trapFocus>
    <div className="calendar-picker" ref={bodyRef}>
      <div className="calendar-month-nav">
        <button className="calendar-month-arrow" onClick={()=>showMonth(shiftMonth(month,-1))} aria-label="Poprzedni miesiąc"><ChevronLeft size={20}/></button>
        <div className="calendar-month-selects">
          <label><span className="calendar-sr-only">Miesiąc</span><select aria-label="Miesiąc" value={monthIndex} onChange={event=>showMonth(`${year}-${String(Number(event.target.value)+1).padStart(2,'0')}-01`)}>{months.map((name,index)=><option key={name} value={index} disabled={year===Number(today.slice(0,4))&&index>Number(today.slice(5,7))-1}>{name}</option>)}</select><ChevronDown size={13} aria-hidden="true"/></label>
          <label className="calendar-year-select"><span className="calendar-sr-only">Rok</span><select aria-label="Rok" value={year} onChange={event=>showMonth(`${event.target.value}-${String(monthIndex+1).padStart(2,'0')}-01`)}>{years.map(value=><option key={value} value={value}>{value}</option>)}</select><ChevronDown size={13} aria-hidden="true"/></label>
        </div>
        <button className="calendar-month-arrow" onClick={()=>showMonth(shiftMonth(month,1))} disabled={month.slice(0,7)>=today.slice(0,7)} aria-label="Następny miesiąc"><ChevronRight size={20}/></button>
      </div>
      <table className="calendar-grid" role="grid" aria-label={new Date(month+'T12:00:00').toLocaleDateString('pl-PL',{month:'long',year:'numeric'})}>
        <thead><tr>{weekdays.map(name=><th scope="col" key={name}>{name}</th>)}</tr></thead>
        <tbody>{Array.from({length:6},(_,row)=><tr key={row}>{cells.slice(row*7,row*7+7).map(cell=><td key={cell.day} aria-selected={cell.day===day}>
          <button type="button" data-date={cell.day} disabled={cell.disabled} tabIndex={cell.day===focusedDay?0:-1} aria-label={`${calendarDayLabel(cell.day)}${recordedDays.has(cell.day)?', zapisane dane':''}`} aria-current={cell.today?'date':undefined}
            className={`calendar-day ${cell.inMonth?'':'other-month'} ${cell.today?'is-today':''} ${cell.day===day?'is-selected':''}`}
            onFocus={()=>setFocusedDay(cell.day)} onKeyDown={event=>moveFocus(event,cell.day)} onClick={()=>onSelect(cell.day)}>
            {cell.number}{recordedDays.has(cell.day)&&<i className="calendar-record-dot" aria-hidden="true"/>}
          </button>
        </td>)}</tr>)}</tbody>
      </table>
      <div className="calendar-footer"><span><i className="calendar-record-dot" aria-hidden="true"/> Dni z zapisami</span><button className="calendar-today" onClick={()=>onSelect(today)}><CalendarDays size={15}/> Dzisiaj</button></div>
    </div>
  </Modal>;
}

export default function DateNavigation({day,onChange,recordedDays=new Set()}) {
  const [open,setOpen]=useState(false);
  const today=localDay();
  const visibleDate=day===today?'Dzisiaj':new Date(day+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short',...(day.slice(0,4)!==today.slice(0,4)?{year:'numeric'}:{})});
  function select(next){if(next<=today)onChange(next);setOpen(false);}
  return <div className="date-nav" data-no-day-swipe>
    <button className="icon-button" onClick={()=>onChange(adjacentDiaryDay(day,-1,today))} aria-label="Poprzedni dzień"><ChevronLeft size={19}/></button>
    <button className="date-text date-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={`Wybierz dzień: ${calendarDayLabel(day)}`} onClick={()=>setOpen(true)}><CalendarDays size={16}/><span aria-live="polite">{visibleDate}</span><ChevronDown size={14}/></button>
    <button className="icon-button" onClick={()=>onChange(adjacentDiaryDay(day,1,today))} disabled={day>=today} aria-label="Następny dzień"><ChevronRight size={19}/></button>
    {open&&<DatePicker day={day} today={today} recordedDays={recordedDays} onSelect={select} onClose={()=>setOpen(false)}/>}
  </div>;
}
