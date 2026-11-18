import React, {useEffect,useState} from 'react';
import {Check,Pill} from 'lucide-react';
import {supplementCatalog} from './supplements.js';
import {foodImage} from './foods.js';
import {normalizeSupplementPlan,SUPPLEMENT_SCHEDULES,SUPPLEMENT_WEEKDAYS,validSupplementPlan} from './supplementPlan.js';
import SettingsSection from './SettingsSection.jsx';
import './supplements.css';

export default function SupplementPlanSettings({profile,personal,onSave}) {
  const [plan,setPlan]=useState(()=>normalizeSupplementPlan(profile.supplementPlan));
  const [saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');
  useEffect(()=>{setPlan(normalizeSupplementPlan(profile.supplementPlan));},[profile.supplementPlan]);
  const catalog=supplementCatalog(personal);
  function change(id,key,value) {
    setPlan(previous=>{
      const row={quantity:1,schedule:'daily',...previous[id],[key]:value};
      if(key==='schedule'){if(value==='weekly')row.weekdays=row.weekdays||[1];else delete row.weekdays;}
      return {...previous,[id]:row};
    });
    setSaved(false);setError('');
  }
  async function save(e) {
    e.preventDefault();setError('');
    if(!validSupplementPlan(plan)){setError('Podaj całkowitą liczbę od 0 do 100. Przy planie tygodniowym wybierz co najmniej jeden dzień.');return;}
    setSaving(true);
    try{await onSave({...profile,supplementPlan:normalizeSupplementPlan(plan)});setSaved(true);}catch(err){setError(err.message);}finally{setSaving(false);}
  }
  return <SettingsSection id="settings-supplements" className="supplement-plan-settings" title="Twój plan suplementów" description="Dawki, dni tygodnia i opcjonalne pozycje" icon={Pill}>
    <form onSubmit={save}>
      <div className="supplement-plan-rows">{catalog.map(food=>{
        const row=plan[food.id]||{quantity:1,schedule:'daily'};
        return <div className="supplement-plan-row" key={food.id} data-plan-id={food.id}>
          <div className="supplement-plan-product">{foodImage(food)&&<img src={foodImage(food)} alt="" loading="lazy" width="44" height="56"/>}<div><strong>{food.name}</strong><small>{food.brand||'Własny suplement'}</small></div></div>
          <label className="field"><span>Ilość ({food.unit==='tablet'?'tabl.':'kaps.'})</span><input type="number" min="0" max="100" step="1" required inputMode="numeric" aria-label={`${food.name}: ilość dziennie`} value={row.quantity} onChange={e=>change(food.id,'quantity',e.target.value===''?'':Number(e.target.value))}/></label>
          <label className="field"><span>Kiedy</span><select aria-label={`${food.name}: częstotliwość`} value={row.schedule} onChange={e=>change(food.id,'schedule',e.target.value)}>{SUPPLEMENT_SCHEDULES.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <div className="supplement-plan-options">
            {row.schedule==='weekly'&&<fieldset className="supplement-weekdays"><legend>Dni tygodnia</legend><div>{SUPPLEMENT_WEEKDAYS.map(day=><label key={day.id}><input type="checkbox" aria-label={`${food.name}: ${day.label}`} checked={row.weekdays?.includes(day.id)||false} onChange={e=>change(food.id,'weekdays',e.target.checked?[...(row.weekdays||[]),day.id]:(row.weekdays||[]).filter(id=>id!==day.id))}/><span>{day.short}</span></label>)}</div></fieldset>}
            <label className="supplement-optional-toggle"><input type="checkbox" checked={!!row.optional} onChange={e=>change(food.id,'optional',e.target.checked)}/><span>Opcjonalny<small>Nie wpływa na wykonanie planu. Przyjęte sztuki liczymy do składników.</small></span></label>
          </div>
        </div>;
      })}</div>
      <p className="help-note">0 wyłącza produkt z planu. Nieparzyste i parzyste oznaczają numer dnia miesiąca, np. 1, 3, 5… Dla wybranych dni podaj liczbę na jeden taki dzień. Zmiana planu nie zmienia zapisanej liczby przyjętych kapsułek.</p>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="supplement-plan-actions"><button className="button primary" disabled={saving}><Check size={18}/>{saving?'Zapisywanie…':'Zapisz plan suplementów'}</button>{saved&&<span className="supplement-plan-saved" role="status"><Check size={16}/> Plan zapisany</span>}</div>
    </form>
  </SettingsSection>;
}
