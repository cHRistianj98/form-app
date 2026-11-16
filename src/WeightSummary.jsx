import React from 'react';
import {ChevronDown,Plus,Weight} from 'lucide-react';
import {formatWeight,weightJourney} from './weight.js';
import './dashboard.css';

export default function WeightSummary({weight,start,target,onMeasure}) {
  const journey=weightJourney(start,target,weight);
  const change=journey.change===0?'Brak zmiany względem wagi początkowej.':`Zmiana od startu: ${journey.change>0?'+':'−'}${formatWeight(Math.abs(journey.change))} kg.`;
  return <details className="panel weight-summary">
    <summary><div className="weight-current"><span><Weight size={14}/> Aktualna waga</span><strong>{formatWeight(weight)} <small>kg</small></strong></div><div className="weight-target"><span>Twój cel</span><strong>{formatWeight(target)} <small>kg</small></strong></div><ChevronDown className="weight-expand-icon" size={20}/></summary>
    <div className="weight-summary-body">
      <div className="weight-summary-labels"><span>Start <strong>{formatWeight(start)} kg</strong></span><span>{journey.reached?'Cel osiągnięty':`Do celu ${formatWeight(journey.remaining)} kg`}</span></div>
      <div className="goal-big-meter"><span style={{width:`${journey.progress}%`}}/></div>
      <p>{change}</p><button className="button outline compact" onClick={onMeasure}><Plus size={16}/> Zapisz pomiar wagi</button>
    </div>
  </details>;
}
