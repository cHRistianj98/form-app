import React from 'react';
import {Check,ChevronRight} from 'lucide-react';
import {fmt} from './foods.js';
import {MACRO_PRESENTATION} from './macroPresentation.js';
import {displayTotal} from './nutritionDisplay.js';
import {progressPresentation} from './progressPresentation.js';
import './dashboard.css';

export default function DailyBalance({nutrition,goal,budget,movement,onDetails}) {
  const eaten=nutrition.totals.kcal;
  const unknown=nutrition.entryCount>0&&eaten==null;
  const remaining=budget-(eaten||0);
  const over=!unknown&&remaining<0;
  const progress=unknown?0:Math.min(1,Math.max(0,(eaten||0)/Math.max(budget,1)));
  const radius=80,circumference=2*Math.PI*radius,arc=circumference*.75;
  const partial=nutrition.entryCount>0&&!nutrition.coverage.kcal.complete;
  return <section className="panel calorie-hero balance-card" aria-label="Bilans dnia">
    <div className="balance-heading"><h2>Twój dzisiejszy bilans</h2><button className="text-link" onClick={onDetails}>Szczegóły <ChevronRight size={16}/></button></div>
    <div className="balance-overview">
      <div className="balance-side"><strong data-balance="eaten">{unknown?'—':fmt(eaten||0)}</strong><span>Zjedzone</span><small>kcal</small></div>
      <div className={`balance-gauge ${over?'over':''}`}>
        <svg viewBox="0 0 200 200" role="img" aria-label={`Zjedzone ${unknown?'brak danych':fmt(eaten||0)} z ${fmt(budget)} kcal`}>
          <circle className="balance-gauge-track" cx="100" cy="100" r={radius} strokeDasharray={`${arc} ${circumference}`} transform="rotate(135 100 100)"/>
          <circle className="balance-gauge-fill" cx="100" cy="100" r={radius} strokeDasharray={`${arc*progress} ${circumference}`} strokeOpacity={progress?1:0} transform="rotate(135 100 100)"/>
        </svg>
        <div className="balance-gauge-value"><strong data-balance="remaining">{unknown?'—':fmt(Math.abs(remaining))}</strong><span>{over?'Ponad plan':'Pozostało'}</span><small>kcal</small></div>
        <div className="balance-target">Cel <strong>{fmt(budget)}</strong> kcal</div>
      </div>
      <div className="balance-side"><strong data-balance="movement">{fmt(movement)}</strong><span>Ruch</span><small>kcal szac.</small></div>
    </div>
    <div className="balance-macros">{MACRO_PRESENTATION.map(m=>{
      const value=nutrition.totals[m.key],target=goal[m.key];
      const state=progressPresentation(value,target,{upper:nutrition.coverage[m.key].upper,partial:!nutrition.coverage[m.key].complete});
      return <div className={`balance-macro ${state.done?'done':''}`} key={m.key} data-macro={m.key}>
        <div><span>{m.name}</span>{state.done&&<Check size={15} aria-label="Cel osiągnięty"/>}</div>
        <div className="balance-macro-track" role="progressbar" aria-label={m.fullName} aria-valuenow={Math.round(state.fraction*100)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={value==null?'Brak danych':`${displayTotal(nutrition,m.key)} z ${fmt(target)} g`}><span style={{width:`${state.fraction*100}%`}}/></div>
        <p><strong>{displayTotal(nutrition,m.key)}</strong><span> / {fmt(target)} g</span></p>
      </div>;
    })}</div>
    <details className="balance-notes"><summary>{partial?'Bilans z dostępnych danych':'Jak liczymy bilans?'}</summary><p>{partial?'Część wpisów nie ma podanych kalorii. Pokazujemy sumę znanych wartości. ':''}Ruch jest już uwzględniony w dziennym celu i nie zwiększa limitu jedzenia.</p></details>
  </section>;
}
