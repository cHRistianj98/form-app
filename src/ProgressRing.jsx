import React from 'react';
import {Check} from 'lucide-react';
import {progressPresentation} from './progressPresentation.js';
import './progress-ring.css';

export default function ProgressRing({value,target,label,mode='goal',upper=false,partial=false,size=56}) {
  const state=progressPresentation(value,target,{mode,upper,partial});
  const radius=25,circumference=2*Math.PI*radius;
  return <span className={`progress-ring ${state.tone}`} style={{'--ring-size':`${size}px`}} role="img" aria-label={`${label}: ${state.text}. ${state.status}`} data-progress-state={state.tone} title={`${state.text} · ${state.status}`}>
    <svg viewBox="0 0 60 60" aria-hidden="true"><circle className="progress-ring-track" cx="30" cy="30" r={radius}/><circle className="progress-ring-fill" cx="30" cy="30" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference*(1-state.fraction)} transform="rotate(-90 30 30)"/></svg>
    <span className="progress-ring-value" aria-hidden="true">{state.done&&<Check size={16} strokeWidth={3}/>}<span>{state.text}</span></span>
  </span>;
}
