import React from 'react';
import {ArrowDownRight,ArrowUpRight,ChevronDown,Minus,Plus,Weight} from 'lucide-react';
import {formatWeight,weightJourney} from './weight.js';
import WeightTrendChart from './WeightTrendChart.jsx';
import './dashboard.css';

export default function WeightSummary({weight,start,target,trend,onMeasure}) {
  const journey=weightJourney(start,target,weight);
  const change=journey.change===0?'Brak zmiany względem wagi początkowej.':`Zmiana od startu: ${journey.change>0?'+':'−'}${formatWeight(Math.abs(journey.change))} kg.`;
  return <details className="panel weight-summary">
    <summary><div className="weight-current"><span><Weight size={14}/> {trend.latest?'Ostatni pomiar':'Waga początkowa'}</span><strong>{formatWeight(weight)} <small>kg</small></strong></div><div className="weight-target"><span>Twój cel</span><strong>{formatWeight(target)} <small>kg</small></strong></div><ChevronDown className="weight-expand-icon" size={20}/></summary>
    <div className="weight-summary-body">
      <div className="weight-trend-averages">{[[trend.current,'Średnia 7 dni'],[trend.previous,'Poprzednie 7 dni']].map(([period,label])=><div className="weight-trend-average-card" key={label}><span>{label}</span><strong>{period.average==null?'—':formatWeight(period.average)}{period.average!=null&&<small> kg</small>}</strong><small>{period.count} z 7 dni z pomiarem</small></div>)}</div>
      <p className="weight-trend-change">{trend.change!=null?<>{trend.change<0?<ArrowDownRight size={18}/>:trend.change>0?<ArrowUpRight size={18}/>:<Minus size={18}/>}<span>{trend.change===0?'Średnie bez zmiany':`Zmiana średniej: ${trend.change>0?'+':'−'}${formatWeight(Math.abs(trend.change))} kg`}</span></>:trend.current.count?'Brak pomiarów z poprzednich 7 dni do porównania.':'Zapisz pomiar z ostatnich 7 dni, aby obliczyć średnią.'}</p>
      <p className="weight-trend-explanation">Porównujemy dwa kolejne okresy po 7 dni, kończące się w wybranym dniu dziennika. Liczymy tylko zapisane pomiary.</p>
      <WeightTrendChart trend={trend}/>
      <div className="weight-summary-labels"><span>Start <strong>{formatWeight(start)} kg</strong></span><span>{journey.reached?'Cel osiągnięty':`Do celu ${formatWeight(journey.remaining)} kg`}</span></div>
      <div className="goal-big-meter"><span style={{width:`${journey.progress}%`}}/></div>
      <p>{change}</p><button className="button outline compact" onClick={onMeasure}><Plus size={16}/> Zapisz pomiar wagi</button>
    </div>
  </details>;
}
