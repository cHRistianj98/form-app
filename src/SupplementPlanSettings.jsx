import React, {useEffect,useState} from 'react';
import {Check,Pill} from 'lucide-react';
import {supplementCatalog} from './supplements.js';
import {normalizeSupplementPlan,SUPPLEMENT_SCHEDULES,validSupplementPlan} from './supplementPlan.js';
import './supplements.css';

export default function SupplementPlanSettings({profile,personal,onSave}) {
  const [plan,setPlan]=useState(()=>normalizeSupplementPlan(profile.supplementPlan));
  const [saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');
  useEffect(()=>{setPlan(normalizeSupplementPlan(profile.supplementPlan));},[profile.supplementPlan]);
  const catalog=supplementCatalog(personal);
  function change(id,key,value) {
    setPlan(previous=>({...previous,[id]:{quantity:1,schedule:'daily',...previous[id],[key]:value}}));
    setSaved(false);setError('');
  }
  async function save(e) {
    e.preventDefault();setError('');
    if(!validSupplementPlan(plan)){setError('Podaj całkowitą liczbę od 0 do 100 i wybierz częstotliwość.');return;}
    setSaving(true);
    try{await onSave({...profile,supplementPlan:normalizeSupplementPlan(plan)});setSaved(true);}catch(err){setError(err.message);}finally{setSaving(false);}
  }
  return <section className="panel supplement-plan-settings">
    <div className="section-heading"><div><h2><Pill size={21}/> Twój plan suplementów</h2><p>Liczba kapsułek lub tabletek na wybrany dzień. To Twój plan do śledzenia.</p></div></div>
    <form onSubmit={save}>
      <div className="supplement-plan-rows">{catalog.map(food=>{
        const row=plan[food.id]||{quantity:1,schedule:'daily'};
        return <div className="supplement-plan-row" key={food.id} data-plan-id={food.id}>
          <div><strong>{food.name}</strong><small>{food.brand||'Własny suplement'}</small></div>
          <label className="field"><span>Ilość ({food.unit==='tablet'?'tabl.':'kaps.'})</span><input type="number" min="0" max="100" step="1" required inputMode="numeric" aria-label={`${food.name}: ilość dziennie`} value={row.quantity} onChange={e=>change(food.id,'quantity',e.target.value===''?'':Number(e.target.value))}/></label>
          <label className="field"><span>Kiedy</span><select aria-label={`${food.name}: częstotliwość`} value={row.schedule} onChange={e=>change(food.id,'schedule',e.target.value)}>{SUPPLEMENT_SCHEDULES.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        </div>;
      })}</div>
      <p className="help-note">0 wyłącza produkt z planu. Nieparzyste i parzyste oznaczają numer dnia miesiąca, np. 1, 3, 5… Zmiana planu nie zmienia zapisanej liczby przyjętych kapsułek.</p>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="supplement-plan-actions"><button className="button primary" disabled={saving}><Check size={18}/>{saving?'Zapisywanie…':'Zapisz plan suplementów'}</button>{saved&&<span className="supplement-plan-saved" role="status"><Check size={16}/> Plan zapisany</span>}</div>
    </form>
  </section>;
}
