import React from 'react';
import {Check} from 'lucide-react';
import {progressPresentation} from './progressPresentation.js';
import './progress-ring.css';

export default function ProgressRing({value,target,label,mode='goal',upper=false,partial=false,intakeLimit,size=56}) {
  const state=progressPresentation(value,target,{mode,upper,partial,intakeLimit});
  const split=state.secondFraction!=null;
  const fontSize=Math.min(13,38/(state.text.length*.65));
  return <span className={`progress-ring ${state.tone}`} style={{'--ring-size':`${size}px`}} role="img" aria-label={`${label}: ${state.text}. ${state.status}`} data-progress-state={state.tone} title={`${state.text} · ${state.status}${state.approximate?' · Szacunek z dostępnych danych':''}`}>
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <circle className="progress-ring-track" cx="30" cy="30" r="25"/>
      <RingFill fraction={state.fraction} split={split}/>
      {split&&<RingFill fraction={state.secondFraction} split second/>}
      {state.done&&<Check x={22} y={12} width={16} height={16} strokeWidth={3}/>}
      <text className="progress-ring-label" x="30" y={state.done?38:31} textAnchor="middle" dominantBaseline="middle" style={{fontSize:`${fontSize}px`}}>{state.text}</text>
    </svg>
  </span>;
}

function RingFill({fraction,split,second=false}) {
  // Leave enough space between the two stages for both rounded stroke ends.
  const length=split?46:100;
  const angle=split?(second?97.2:-82.8):-90;
  const fill=fraction*length;
  return <circle className={`progress-ring-fill${split?(second?' progress-ring-to-limit':' progress-ring-to-reference'):''}`} cx="30" cy="30" r="25" pathLength="100" strokeDasharray={`${fill} ${100-fill}`} opacity={fill===0?0:1} transform={`rotate(${angle} 30 30)`}/>;
}
