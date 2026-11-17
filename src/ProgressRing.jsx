import React from 'react';
import {Check} from 'lucide-react';
import {progressPresentation} from './progressPresentation.js';
import './progress-ring.css';

export default function ProgressRing({value,target,label,mode='goal',upper=false,partial=false,size=56}) {
  const state=progressPresentation(value,target,{mode,upper,partial});
  const radius=25,circumference=2*Math.PI*radius;
  const fontSize=Math.min(13,38/(state.text.length*.65));
  return <span className={`progress-ring ${state.tone}`} style={{'--ring-size':`${size}px`}} role="img" aria-label={`${label}: ${state.text}. ${state.status}`} data-progress-state={state.tone} title={`${state.text} · ${state.status}${state.approximate?' · Szacunek z dostępnych danych':''}`}>
    <svg viewBox="0 0 60 60" aria-hidden="true"><circle className="progress-ring-track" cx="30" cy="30" r={radius}/><circle className="progress-ring-fill" cx="30" cy="30" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference*(1-state.fraction)} transform="rotate(-90 30 30)"/>
      {state.done&&<Check x={22} y={12} width={16} height={16} strokeWidth={3}/>}
      <text className="progress-ring-label" x="30" y={state.done?38:31} textAnchor="middle" dominantBaseline="middle" style={{fontSize:`${fontSize}px`}}>{state.text}</text>
    </svg>
  </span>;
}
