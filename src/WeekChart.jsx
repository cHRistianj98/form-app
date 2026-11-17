import React from 'react';
import {fmt,localDay} from './foods.js';

export default function WeekChart({days,goal}) {
  const upper=Math.max(goal,...days.map(d=>d.net||0),1)*1.12;
  const lower=Math.min(0,...days.map(d=>d.net||0))*1.12;
  const range=upper-lower,zero=-lower/range*100;
  return <div className="week-chart net-week-chart" role="img" aria-label="Bilans ostatnich 7 dni: zjedzone kalorie minus ruch">
    <div className="chart-guide"><span style={{top:0}}>{fmt(upper)} kcal</span><span style={{top:lower<0?`${upper/range*100}%`:'50%'}}>{fmt(lower<0?0:upper/2)}</span><span style={{top:'100%'}}>{fmt(lower)}</span></div>
    <div className="chart-columns"><div className="net-plot-guides" aria-hidden="true"><div className="goal-line" style={{bottom:`${(goal-lower)/range*100}%`}}><span>Cel bazowy</span></div>
      {lower<0&&<div className="net-zero-line" style={{bottom:`${zero}%`}}/>}</div>
      {days.map(d=><div className="chart-col" key={d.day} data-day={d.day} data-energy-net={d.net??''} title={`${d.day}: ${d.net==null?'Brak danych o spożyciu':`Zjedzone ${fmt(d.eaten)} kcal, ruch ${fmt(d.movement)} kcal, bilans ${fmt(d.net)} kcal`}`}>
        <div className="bar-track">{d.net!=null&&<div className={`bar-fill ${d.net>goal?'over':''} ${d.net<0?'negative':''}`} style={{position:'absolute',bottom:`${d.net<0?(d.net-lower)/range*100:zero}%`,height:`${Math.abs(d.net)/range*100}%`}}/>}</div>
        <span className={d.day===localDay()?'today':''}>{new Date(d.day+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'short'}).replace('.','')}</span>
      </div>)}
    </div>
  </div>;
}
