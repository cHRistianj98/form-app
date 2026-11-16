import React, {useState} from 'react';
import {ArrowRight, Check, ChevronDown, Minus, Pill, Plus, Settings2} from 'lucide-react';
import Modal from './Modal.jsx';
import {fmt, foodImage, localDay, parseNum} from './foods.js';
import {NUTRIENTS, NUTRIENT_FIELDS} from './nutrients.js';
import {supplementCatalog} from './supplements.js';
import {supplementPlanProgress} from './supplementPlan.js';
import ProgressRing from './ProgressRing.jsx';
import './supplements.css';

function Photo({food}) {
  const src=foodImage(food);
  return <div className="supplement-photo">{src?<img src={src} alt={`${food.brand} ${food.name}`} loading="lazy"/>:<Pill size={34}/>}</div>;
}
function Components({food,quantity=1,compact=false}) {
  const fields=NUTRIENTS.filter(([key])=>food[key]!=null);
  return <div className={compact?'supplement-chips':'supplement-components'}>{(compact?fields.slice(0,3):fields).map(([key,name,unit])=><span key={key} data-supplement-nutrient={key}><span>{name}</span><strong>{fmt(food[key]*quantity,2)} {unit}{key==='vitaminD'?` / ${fmt(food[key]*quantity*40)} IU`:''}</strong></span>)}</div>;
}

export function SupplementPanel({entries,personal,day,plan,onAdjust,onOpen,onSettings,compact=false}) {
  const [pending,setPending]=useState(new Set());
  const [error,setError]=useState('');
  const catalog=supplementCatalog(personal);
  const progress=supplementPlanProgress(catalog,entries,day,plan);
  const Container=compact?'details':'section';
  async function adjust(food,delta) {
    if(pending.has(food.id))return;
    setPending(previous=>new Set(previous).add(food.id));setError('');
    try{await onAdjust(food,delta);}catch(err){setError(err.message);}
    finally{setPending(previous=>{const next=new Set(previous);next.delete(food.id);return next;});}
  }
  const heading=<><div><h2>{compact?'Twoje suplementy':'Zapisz przyjęte suplementy'}</h2><p>{progress.planned?`${progress.completedProducts}/${progress.plannedProducts} produktów · ${progress.completed}/${progress.planned} szt. z planu`:'Na ten dzień nie masz zaplanowanych suplementów.'}</p><small>{progress.done?'Plan wykonany ✓':`${day===localDay()?'Dzisiaj':'Wybrany dzień'}: przyjęto ${progress.taken} szt.`}{compact&&<> · <span className="supplement-when-closed">Rozwiń listę</span><span className="supplement-when-open">Zwiń listę</span></>}</small></div><ProgressRing value={progress.completed} target={progress.planned} label="Plan suplementów" size={56}/></>;
  return <Container className={`panel supplement-panel ${compact?'supplement-panel-compact':''} ${progress.done?'plan-complete':''}`}>
    {compact?<summary className="supplement-summary">{heading}<ChevronDown className="supplement-expand-icon" size={20}/></summary>:<div className="supplement-summary">{heading}</div>}
    <div className="supplement-panel-body">
    <div className="supplement-panel-links">{onSettings&&<button className="text-link" onClick={onSettings}><Settings2 size={15}/> Ustaw plan</button>}{compact&&<button className="text-link" onClick={onOpen}>Pełny widok <ArrowRight size={16}/></button>}</div>
    <div className="supplement-grid">{progress.rows.map(({food,count,target,done})=><article key={food.id} className={`supplement-card ${count>0?'taken':''} ${done?'done':''} ${!target?'not-due':''}`} data-supplement-id={food.id} data-supplement-state={done?'done':target?'pending':'not-due'}>
      <Photo food={food}/><div className="supplement-info"><small>{food.brand||'Własny suplement'}</small><h3>{food.name}</h3><Components food={food} compact/>{!compact&&<button className="text-link" onClick={()=>onOpen(food)}>Skład i źródło</button>}</div>
      <div className="supplement-counter" aria-label={`Przyjęto: ${food.name}`}>
        <button type="button" onClick={()=>adjust(food,-1)} disabled={!count||pending.has(food.id)} aria-label={`Odejmij jedną: ${food.name}`}><Minus size={20}/></button>
        <output aria-live="polite"><strong>{count}{target>0&&<span> / {target}</span>}</strong><small>{food.unit==='tablet'?'tabl.':'kaps.'}</small></output>
        <button type="button" onClick={()=>adjust(food,1)} disabled={pending.has(food.id)} aria-label={`Dodaj jedną: ${food.name}`}><Plus size={20}/></button>
      </div>
      <div className="supplement-plan-status">{done?<><Check size={15}/> Plan wykonany</>:target?`Pozostało ${Math.max(0,target-count)} szt.`:'Brak planu na ten dzień'}</div>
    </article>)}</div>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {!compact&&<p className="muted-note">Liczniki zapisują się dla daty wybranej u góry. Nowy dzień zaczyna się od zera; zapisane składniki trafiają do statystyk dnia i tygodnia. To zapis przyjętych ilości.</p>}
    </div>
  </Container>;
}

async function photoAsWebP(file) {
  if(file.size>5*1024*1024)throw new Error('Wybierz zdjęcie do 5 MB.');
  const bitmap=await createImageBitmap(file);
  try {
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,480,480);
    const scale=Math.min(440/bitmap.width,440/bitmap.height);
    ctx.drawImage(bitmap,(480-bitmap.width*scale)/2,(480-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale);
    const data=canvas.toDataURL('image/webp',0.8);
    if(!data.startsWith('data:image/webp;base64,')||data.length>160000)throw new Error('Nie udało się przygotować małego zdjęcia WebP. Wybierz inne zdjęcie.');
    return data;
  } finally {bitmap.close();}
}

function SupplementForm({onSave,onClose}) {
  const [form,setForm]=useState({name:'',brand:'',unit:'capsule',ingredients:'',image:null,...Object.fromEntries(NUTRIENT_FIELDS.map(key=>[key,'']))});
  const [saving,setSaving]=useState(false),[processing,setProcessing]=useState(false),[error,setError]=useState('');
  const primary=['magnesium','zinc','vitaminD','b6','vitaminC','biotin','epa','dha'];
  const fields=[['kcal','Kalorie','kcal'],['protein','Białko','g'],['carbs','Węglowodany','g'],['fat','Tłuszcze','g'],...NUTRIENTS];
  const change=(key,value)=>setForm(previous=>({...previous,[key]:value}));
  async function imageChange(e) {
    const file=e.target.files[0];if(!file)return;setError('');setProcessing(true);
    try{change('image',await photoAsWebP(file));}catch(err){setError(err.message);}finally{setProcessing(false);}
  }
  async function save(e) {
    e.preventDefault();setError('');
    if(!NUTRIENT_FIELDS.some(key=>form[key]!=='')){setError('Podaj przynajmniej jeden składnik z etykiety.');return;}
    setSaving(true);
    try {
      const food={id:`own:supplement:${crypto.randomUUID()}`,name:form.name.trim(),brand:form.brand.trim(),kind:'supplement',unit:form.unit,basisQuantity:1,source:'Własna etykieta',ingredients:form.ingredients,image:form.image,imageFit:'contain'};
      for(const key of NUTRIENT_FIELDS)food[key]=form[key]===''?null:parseNum(form[key]);
      await onSave(food);onClose();
    }catch(err){setError(err.message);}finally{setSaving(false);}
  }
  const editor=items=><div className="nutrient-editor">{items.map(([key,name,unit])=><label className="field" key={key}><span>{name} ({unit})</span><input type="number" min="0" max="100000" step="any" inputMode="decimal" placeholder="Brak danych" value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}</div>;
  return <Modal title="Dodaj własny suplement" subtitle="Wartości na jedną kapsułkę lub tabletkę." onClose={onClose} wide><form onSubmit={save}>
    <div className="field-row"><label className="field"><span>Nazwa *</span><input required maxLength={180} value={form.name} onChange={e=>change('name',e.target.value)}/></label><label className="field"><span>Marka</span><input maxLength={120} value={form.brand} onChange={e=>change('brand',e.target.value)}/></label></div>
    <label className="field"><span>Jednostka</span><select value={form.unit} onChange={e=>change('unit',e.target.value)}><option value="capsule">1 kapsułka</option><option value="tablet">1 tabletka</option></select></label>
    <label className="field"><span>Zdjęcie opakowania (opcjonalnie)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={imageChange}/><small className="field-hint">Zdjęcie zostanie zapisane jako WebP, do 480 × 480 px.</small></label>
    {form.image&&<Photo food={form}/>}
    <p className="help-note">Przepisz ilości na jedną sztukę. Jeśli tabela podaje porcję dwóch kapsułek, podziel ilości przez dwa. Puste pola pozostają nieznane. Witaminę D wpisuj w µg: 4000 IU = 100 µg.</p>
    {editor(fields.filter(([key])=>primary.includes(key)))}
    <details className="supplement-extra-editor"><summary>Pozostałe składniki i kalorie</summary>{editor(fields.filter(([key])=>!primary.includes(key)))}</details>
    <label className="field"><span>Lista składników (opcjonalnie)</span><textarea maxLength={1800} rows="3" value={form.ingredients} onChange={e=>change('ingredients',e.target.value)}/></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Anuluj</button><button className="button primary" disabled={saving||processing}><Check size={18}/>{processing?'Przygotowuję zdjęcie…':saving?'Zapisuję…':'Zapisz suplement'}</button></div>
  </form></Modal>;
}

export default function SupplementsPage({entries,personal,day,plan,onAdjust,onSave,onSettings}) {
  const [details,setDetails]=useState(null),[adding,setAdding]=useState(false);
  return <>
    <div className="supplement-intro"><div><h2>Twoja codzienna lista</h2><p>Skład na jedną kapsułkę. Zaznaczaj tylko to, co przyjąłeś.</p></div><button className="button primary" onClick={()=>setAdding(true)}><Plus size={18}/> Dodaj suplement</button></div>
    <SupplementPanel entries={entries} personal={personal} day={day} plan={plan} onAdjust={onAdjust} onOpen={setDetails} onSettings={onSettings}/>
    {details&&<Modal title={details.name} subtitle={`${details.brand||'Własny suplement'} · skład na 1 ${details.unit==='tablet'?'tabletkę':'kapsułkę'}`} onClose={()=>setDetails(null)}>
      <div className="supplement-detail-head"><Photo food={details}/><p className="help-note">{details.labelNote||'Dane z Twojej etykiety.'}</p></div>
      <Components food={details}/>
      {details.kcal!=null&&<p className="help-note">Energia: {fmt(details.kcal,2)} kcal{details.fat!=null?`, tłuszcz: ${fmt(details.fat,2)} g`:''} na jedną sztukę.</p>}
      {details.ingredients&&<p className="supplement-ingredients"><strong>Składniki:</strong> {details.ingredients}</p>}
      {details.sourceUrl&&<a className="text-link" href={details.sourceUrl} target="_blank" rel="noreferrer">Tabela i etykieta producenta ↗</a>}
      <p className="muted-note">{details.verifiedAt?`Sprawdzono ${details.verifiedAt}. `:''}Liczymy deklarowane składniki. Brak podanych kalorii lub makro pozostaje brakiem danych. Składniki „w tym” są częścią ekstraktu lub oleju.</p>
    </Modal>}
    {adding&&<SupplementForm onSave={onSave} onClose={()=>setAdding(false)}/>}
  </>;
}
