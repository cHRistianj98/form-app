import React from 'react';
import {Check,ChevronRight} from 'lucide-react';
import {fmt} from './foods.js';
import {MACRO_PRESENTATION} from './macroPresentation.js';
import {displayTotal} from './nutritionDisplay.js';
import {progressPresentation} from './progressPresentation.js';
import './dashboard.css';

export default function DailyBalance({nutrition,goal,budget,movement,movementSource,onDetails}) {
  const eaten=nutrition.totals.kcal;
  const unknown=nutrition.entryCount>0&&eaten==null;
  const remaining=budget-(eaten||0);
  const over=!unknown&&remaining<0;
  const progress=unknown?0:Math.min(1,Math.max(0,(eaten||0)/Math.max(budget,1)));
  const radius=86,circumference=2*Math.PI*radius,arc=circumference*.75;
  const partial=nutrition.entryCount>0&&!nutrition.coverage.kcal.complete;
  return <section className="panel calorie-hero balance-card" aria-label="Bilans dnia">
    <div className="balance-heading"><h2>Bilans dnia</h2><button className="text-link" onClick={onDetails}>Szczegóły <ChevronRight size={16} aria-hidden="true"/></button></div>
    <div className="balance-overview">
      <div className={`balance-gauge-panel ${over?'over':''}`}><div className="balance-gauge">
        <svg viewBox="0 0 200 200" role="img" aria-label={`Zjedzone ${unknown?'brak danych':fmt(eaten||0)} z ${fmt(budget)} kcal`}>
          <circle className="balance-gauge-track" cx="100" cy="100" r={radius} strokeDasharray={`${arc} ${circumference}`} transform="rotate(135 100 100)"/>
          <circle className="balance-gauge-fill" cx="100" cy="100" r={radius} strokeDasharray={`${arc*progress} ${circumference}`} strokeOpacity={progress?1:0} transform="rotate(135 100 100)"/>
        </svg>
        <div className="balance-gauge-value"><span>{over?'Ponad plan':'Pozostało'}</span><strong data-balance="remaining">{unknown?'—':fmt(Math.abs(remaining))}</strong><small>kcal</small></div>
      </div></div>
      <dl className="balance-breakdown">
        <div><dt>Zjedzone</dt><dd><strong data-balance="eaten">{unknown?'—':fmt(eaten||0)}</strong> <small>kcal</small></dd></div>
        <div><dt>Ruch <small>{movementSource==='garmin'?'Garmin':'szac.'}</small></dt><dd><strong data-balance="movement">{fmt(movement)}</strong> <small>kcal</small></dd></div>
        <div><dt>Cel bazowy</dt><dd><strong data-balance="base-goal">{fmt(goal.calories)}</strong> <small>kcal</small></dd></div>
        <div className="balance-budget"><dt>Cel z ruchem</dt><dd><strong data-balance="movement-goal">{fmt(budget)}</strong> <small>kcal</small></dd></div>
      </dl>
    </div>
    <div className="balance-macros">{MACRO_PRESENTATION.map(m=>{
      const value=nutrition.totals[m.key],target=goal[m.key];
      const state=progressPresentation(value,target,{upper:nutrition.coverage[m.key].upper,partial:!nutrition.coverage[m.key].complete});
      return <div className="balance-macro" key={m.key} data-macro={m.key} style={{'--macro-color':m.color}}>
        <div className="balance-macro-title"><span>{m.name}</span>{state.done&&<Check size={15} aria-label="Cel osiągnięty"/>}</div>
        <p><strong>{displayTotal(nutrition,m.key)}</strong><span> / {fmt(target)} g</span></p>
        <div className="balance-macro-track" role="progressbar" aria-label={m.fullName} aria-valuenow={Math.round(state.fraction*100)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={value==null?'Brak danych':`${displayTotal(nutrition,m.key)} z ${fmt(target)} g`}><span style={{width:`${state.fraction*100}%`}}/></div>
      </div>;
    })}</div>
    <details className="balance-notes"><summary>{partial?'Bilans z dostępnych danych':'Jak liczymy bilans?'}</summary><p>{partial?'Część wpisów nie ma podanych kalorii. Pokazujemy sumę znanych wartości. ':''}Cel na dziś to {fmt(goal.calories)} kcal z planu + {fmt(movement)} kcal {movementSource==='garmin'?'aktywnych z Garmin Connect. Ta suma obejmuje ruch i treningi, więc nie doliczamy ponownie szacunków aplikacji.':'z zapisanego ruchu.'} Makro pozostaje według planu z ustawień.</p></details>
  </section>;
}
