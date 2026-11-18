import React from 'react';
import {Weight} from 'lucide-react';
import {formatWeight} from './weight.js';
import './weight-trend.css';

const stamp=day=>Date.parse(day+'T12:00:00Z');
const dateLabel=day=>new Intl.DateTimeFormat('pl-PL',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(stamp(day)));

export default function WeightTrendChart({trend}) {
  const points=trend.points;
  if(!points.length)return <div className="weight-trend-empty"><Weight size={25}/><span>Brak pomiarów z ostatnich 28 dni. Zapisz wagę, aby rozpocząć wykres.</span></div>;
  const from=points[0].day,to=trend.to;
  const values=points.flatMap(point=>[point.weight,point.average]);
  const low=Math.min(...values),high=Math.max(...values),padding=Math.max(.2,(high-low)*.2);
  const min=Math.max(0,low-padding),max=high+padding;
  const width=600,height=180,inset=12;
  const range=stamp(to)-stamp(from);
  const x=day=>range?inset+(stamp(day)-stamp(from))/range*(width-inset*2):width/2;
  const y=value=>inset+(max-value)/(max-min)*(height-inset*2);
  const line=key=>points.map((point,index)=>`${index?'L':'M'} ${x(point.day)} ${y(point[key])}`).join(' ');
  return <div className="weight-trend-chart">
    <div className="weight-trend-legend"><span><i className="weight-trend-raw-key"/> Pomiar</span><span><i className="weight-trend-average-key"/> Średnia 7 dni</span></div>
    <div className="weight-trend-plot">
      <div className="weight-trend-axis" aria-hidden="true"><span>{formatWeight(max)}</span><span>{formatWeight((min+max)/2)}</span><span>{formatWeight(min)}</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`Pomiary wagi i średnia krocząca z 7 dni, od ${dateLabel(from)} do ${dateLabel(to)}. Wartości w kilogramach.`}>
        {[min,(min+max)/2,max].map(value=><line className="weight-trend-grid" key={value} x1={inset} x2={width-inset} y1={y(value)} y2={y(value)} vectorEffect="non-scaling-stroke"/>)}
        {points.length>1&&<><path className="weight-trend-raw" d={line('weight')} vectorEffect="non-scaling-stroke"/><path className="weight-trend-average" d={line('average')} vectorEffect="non-scaling-stroke"/></>}
        {points.map(point=><circle className="weight-trend-dot" key={point.day} cx={x(point.day)} cy={y(point.weight)} r="3.5" vectorEffect="non-scaling-stroke"><title>{dateLabel(point.day)}: {formatWeight(point.weight)} kg; średnia 7 dni: {formatWeight(point.average)} kg</title></circle>)}
      </svg>
      <div className="weight-trend-dates"><span>{dateLabel(from)}</span>{from!==to&&<span>{dateLabel(to)}</span>}</div>
    </div>
    <p className="weight-trend-chart-note">kg, ostatnie 28 dni. Linia średniej uwzględnia dostępne pomiary z 7 dni kończących się w dniu każdego pomiaru.</p>
  </div>;
}
