import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Bike,
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  ClipboardList, Cookie, Download, Dumbbell, Flame, Footprints, Heart,
  Info, Leaf, LockKeyhole, LogOut, Menu, Minus, Moon, MoreHorizontal,
  Plus, Search, Settings2, ShieldCheck, Sparkles, Sunrise, Target,
  Trash2, TrendingDown, Utensils, Weight, X
} from 'lucide-react';
import {
  ACTIVITY_TYPES, BASE_FOODS, MEALS, NUTRIENTS, activityKcal, calcStepsKcal,
  calcTargets, calcDailyBalance, canonicalText, dateTitle, fmt, foodImage, localDay, parseNum, scaleFood, shiftDay
} from './foods.js';
import {DEFAULT_PROFILE, api, mutate, readLocal, uuid, writeLocal} from './storage.js';
import {normalizeProfile} from './profile.js';
import SettingsPage from './SettingsPage.jsx';

const nav = [
  {id:'dashboard',label:'Pulpit',icon:BarChart3},
  {id:'foods',label:'Produkty',icon:Search},
  {id:'activity',label:'Aktywność',icon:Activity},
  {id:'progress',label:'Postępy',icon:TrendingDown},
  {id:'settings',label:'Ustawienia',icon:Settings2},
];
const mealIcons = {breakfast:Sunrise,lunch:Utensils,dinner:Moon,snack:Cookie};
const activityIcons = {strength:Dumbbell,run:Footprints,walk:Footprints,bike:Bike,other:Flame};
const empty = {entries:[],activities:[],daily:[],foods:[],profile:DEFAULT_PROFILE};
const sum = (arr, key) => arr.reduce((n,x)=>n+(Number(x[key])||0),0);
const percent = (n,goal) => goal>0?Math.max(0,Math.min(100,n/goal*100)):0;
const first = (name) => name.trim().charAt(0).toLocaleUpperCase('pl');

function FoodPhoto({food,size=''}) {
  const src=foodImage(food);
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  return <span className={`food-avatar ${size} ${src&&!failed?'has-photo':''}`}>
    {src&&!failed?<img src={src} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:first(food.name)}
  </span>;
}

function IconBadge({Icon, color='mint',size=20}) {return <span className={`icon-badge ${color}`}><Icon size={size} strokeWidth={1.9}/></span>;}
function SectionTitle({title,subtitle,action}) {return <div className="section-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;}
function Topline({day,setDay,view}) {
  const today = localDay();
  return <div className="topline"><div className="topline-left"><span className="today-marker"><span className="status-dot"/> TWÓJ DZIENNIK</span><h1>{({dashboard:'Dzień dobry! 👋',foods:'Baza produktów',activity:'Twoja aktywność',progress:'Twoje postępy',settings:'Ustawienia'})[view]}</h1><p className="page-subtitle">{({dashboard:'Każdy dobry wybór przybliża Cię do celu.',foods:'Wszystko, co jesz, w jednym miejscu.',activity:'Każdy ruch ma znaczenie.',progress:'Małe kroki. Duża zmiana.',settings:'Dopasuj licznik do siebie.'})[view]}</p></div><div className="date-nav"><button className="icon-button" onClick={()=>setDay(shiftDay(day,-1))} aria-label="Poprzedni dzień"><ChevronLeft size={19}/></button><div className="date-text"><CalendarDays size={16}/><span>{day===today?'Dzisiaj':dateTitle(day)}</span></div><button className="icon-button" onClick={()=>setDay(shiftDay(day,1))} disabled={day>=today} aria-label="Następny dzień"><ChevronRight size={19}/></button></div></div>;
}
function Donut({value,limit,size=182,stroke=13,color='#b4f27c',children}) {
  const radius = (size-stroke)/2-2;
  const length = 2*Math.PI*radius;
  const progress = Math.min(1,Math.max(0,value/Math.max(limit,1)));
  return <div className="donut" style={{width:size,height:size}}><svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true"><circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,.15)" strokeWidth={stroke} fill="none"/><circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={length} strokeDashoffset={length*(1-progress)} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:'stroke-dashoffset .6s ease'}}/></svg><div className="donut-center">{children}</div></div>;
}
function ProgressLine({label,value,goal,color,unit='g',hint}) {
  return <div className="progress-line"><div className="line-top"><div className="line-name"><span className="legend-dot" style={{background:color}}/>{label}{hint&&<small>{hint}</small>}</div><span><strong>{fmt(value,1)}</strong> / {fmt(goal)} {unit}</span></div><div className="meter"><div style={{width:`${percent(value,goal)}%`,background:color}}/></div></div>;
}
function MealCard({meal,entries,onAdd,onEdit,onRemove}) {
  const Icon = mealIcons[meal.id];
  const total = entries.reduce((n,e)=>n+(scaleFood(e.food,e.grams).kcal||0),0);
  return <div className="meal-card"><div className="meal-head"><div className="meal-name"><IconBadge Icon={Icon} color={meal.id}/><div><h3>{meal.name}</h3><span>{entries.length?`${fmt(total)} kcal · ${entries.length} ${entries.length===1?'produkt':'produktów'}`:'Jeszcze nic nie dodano'}</span></div></div><button className="small-add" onClick={()=>onAdd(meal.id)} aria-label={`Dodaj do ${meal.name}`}><Plus size={18}/></button></div>{entries.map(e=>{const n=scaleFood(e.food,e.grams);return <div className="meal-entry" key={e.id}><button className="entry-main" onClick={()=>onEdit(e)}><FoodPhoto food={e.food}/><span className="entry-text"><strong>{e.food.name}</strong><small>{fmt(e.grams,1)} g{e.food.brand?` · ${e.food.brand}`:''}</small></span><span className="entry-calories">{fmt(n.kcal)} <small>kcal</small></span></button><button className="remove-button" onClick={()=>onRemove(e)} aria-label={`Usuń ${e.food.name}`}><Trash2 size={15}/></button></div>})}</div>;
}
function FoodRow({food,onClick,extra}) {return <button className="food-search-row" onClick={()=>onClick(food)}><FoodPhoto food={food} size="large"/><span className="food-search-info"><strong>{food.name}</strong><small>{food.brand || (food.source==='Open Food Facts'?'Open Food Facts':'Wartości na 100 g')}</small><span className="food-mini-macros">B {fmt(food.protein,1)} · W {fmt(food.carbs,1)} · T {fmt(food.fat,1)}</span></span><span className="food-search-kcal"><strong>{fmt(food.kcal)}</strong><small>kcal / 100 g</small></span>{extra || <Plus size={18} className="food-row-plus"/>}</button>}
function Modal({title,subtitle,onClose,children,wide=false}) {
  useEffect(()=>{const fn=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',fn);return()=>document.removeEventListener('keydown',fn)},[onClose]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className={`modal-card ${wide?'modal-wide':''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-top"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Zamknij"><X size={19}/></button></div><div className="modal-body">{children}</div></section></div>;
}
function FoodModal({onClose,day,personal,onAdd,onSaveFood,onDeleteFood,initialMeal='breakfast',initialFood=null,editing=null,local}) {
  const [query,setQuery]=useState('');
  const [remote,setRemote]=useState([]);
  const [busy,setBusy]=useState(false);
  const [remoteError,setRemoteError]=useState(false);
  const [selected,setSelected]=useState(editing?.food||initialFood||null);
  const [grams,setGrams]=useState(String(editing?.grams||100));
  const [meal,setMeal]=useState(editing?.meal||initialMeal);
  const [custom,setCustom]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:'',brand:'',kcal:'',protein:'',carbs:'',fat:'',fiber:'',sugars:'',salt:'',saturatedFat:'',calcium:'',iron:'',potassium:'',magnesium:'',vitaminC:'',vitaminD:'',b12:''});
  useEffect(()=>{setRemote([]);setRemoteError(false);},[query]);
  async function searchOnline(){
    const q=query.trim();if(local||q.length<3||busy)return;
    setBusy(true);setRemoteError(false);
    try {const r=await api('/search?q='+encodeURIComponent(q));setRemote(r.products||[]);setRemoteError(!!r.unavailable);}
    catch {setRemoteError(true)} finally {setBusy(false)}
  }
  const options=useMemo(()=>{
    const all=[...personal,...BASE_FOODS,...remote];
    if(!query.trim())return all.slice(0,18);
    const normalized=canonicalText(query);
    const filtered=all.filter(f=>canonicalText(f.name+' '+(f.brand||'')).includes(normalized));
    const seen=new Set();return filtered.filter(f=>{if(seen.has(f.id))return false;seen.add(f.id);return true}).slice(0,45);
  },[query,personal,remote]);
  const scaled=selected?scaleFood(selected,parseNum(grams)):null;
  async function submit(e){e.preventDefault();if(!selected||parseNum(grams)<=0||parseNum(grams)>100000)return;setSaving(true);try{await onAdd({id:editing?.id||uuid('entry'),day,meal,grams:parseNum(grams),food:selected});onClose();}finally{setSaving(false)}}
  async function saveCustom(e){e.preventDefault();if(!form.name.trim())return;
    const product={id:uuid('own'),name:form.name.trim(),brand:form.brand.trim(),source:'Własny'};
    for(const key of ['kcal','protein','carbs','fat',...NUTRIENTS.map(x=>x[0])]){if(form[key]!==''&&form[key]!=null)product[key]=parseNum(form[key]);}
    for(const k of ['kcal','protein','carbs','fat'])if(product[k]===undefined)product[k]=0;
    setSaving(true);try{await onSaveFood(product);setSelected(product);setCustom(false);}finally{setSaving(false)}
  }
  return <Modal title={editing?'Edytuj posiłek':selected?'Dodaj produkt':custom?'Nowy produkt':'Dodaj jedzenie'} subtitle={selected?'Wpisz dokładną gramaturę produktu.':'Wyszukaj produkt lub dodaj własne wartości.'} onClose={onClose} wide>
    {selected?<form onSubmit={submit}><div className="selected-food"><FoodPhoto food={selected} size="big"/><div><h3>{selected.name}</h3><p>{selected.brand || selected.source} · wartości na 100 g</p></div><button type="button" className="text-link" onClick={()=>{setSelected(null);setQuery('')}}>Zmień</button></div><div className="field-row"><label className="field"><span>Ilość (gramy)</span><div className="with-unit"><input type="number" min="1" max="100000" step="1" required value={grams} onChange={e=>setGrams(e.target.value)} autoFocus/><span>g</span></div></label><label className="field"><span>Posiłek</span><select value={meal} onChange={e=>setMeal(e.target.value)}>{MEALS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div><div className="portion-preview"><div className="portion-energy"><strong>{fmt(scaled.kcal)}</strong><span>kcal</span></div>{[['Białko',scaled.protein],['Węgle',scaled.carbs],['Tłuszcze',scaled.fat]].map(([name,val])=><div key={name} className="portion-macro"><span>{name}</span><b>{fmt(val,1)} g</b></div>)}</div><div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Anuluj</button><button className="button primary" disabled={saving||parseNum(grams)<=0}><Check size={18}/>{saving?'Zapisywanie...':editing?'Zapisz zmiany':'Dodaj do dziennika'}</button></div></form>:
    custom?<form onSubmit={saveCustom}><p className="help-note">Podawaj wartości <strong>na 100 g produktu</strong>, zgodnie z etykietą. Możesz uzupełnić również mikroskładniki.</p><div className="field-row"><label className="field"><span>Nazwa produktu *</span><input value={form.name} required maxLength={180} placeholder="np. Moje spaghetti" onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="field"><span>Marka (opcjonalnie)</span><input value={form.brand} maxLength={120} placeholder="np. własny przepis" onChange={e=>setForm({...form,brand:e.target.value})}/></label></div><div className="nutrient-editor">{[['kcal','Kalorie','kcal'],['protein','Białko','g'],['carbs','Węglowodany','g'],['fat','Tłuszcze','g'],...NUTRIENTS.map(([k,n,u])=>[k,n,u])].map(([key,label,unit])=><label className="field" key={key}><span>{label}</span><div className="with-unit"><input type="number" step="any" min="0" max="100000" placeholder="—" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/><span>{unit}</span></div></label>)}</div><div className="modal-actions"><button type="button" className="button ghost" onClick={()=>setCustom(false)}>Wróć</button><button className="button primary" disabled={saving}>{saving?'Zapisywanie...':'Zapisz produkt i dodaj'}</button></div></form>:
    <><div className="search-field"><Search size={20}/><input autoFocus value={query} placeholder="Szukaj: jajko, cebula, skyr, marka..." onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="Wyczyść"><X size={17}/></button>}</div><div className="search-meta"><span>{query?'WYNIKI WYSZUKIWANIA':'POPULARNE I TWOJE PRODUKTY'}</span><button className="text-link" onClick={()=>setCustom(true)}><Plus size={15}/> Własny produkt</button></div>{!local&&query.trim().length>=3&&<button className="online-search-button" disabled={busy} onClick={searchOnline}><Search size={16}/>{busy?'Wyszukuję...':'Szukaj też w Open Food Facts'}</button>}{local&&query.length>=3&&<p className="inline-hint">Tryb lokalny: wyszukiwanie online jest dostępne po wdrożeniu do Cloudflare.</p>}{busy&&<p className="inline-hint">Szukam produktów w Open Food Facts...</p>}{remoteError&&<p className="inline-hint">Baza zewnętrzna chwilowo niedostępna. Możesz dodać własny produkt.</p>}<div className="food-results">{options.length?options.map(food=><FoodRow key={food.id} food={food} onClick={setSelected}/>):<div className="empty-search"><Search size={26}/><strong>Brak pasujących produktów</strong><p>Spróbuj innej nazwy lub dodaj własny produkt.</p></div>}</div><div className="source-note"><Info size={15}/> Własne i podstawowe produkty pozostają dostępne. Dane z Open Food Facts mogą być niepełne — sprawdzaj etykiety.</div></>}
  </Modal>;
}
function ActivityModal({onClose,onSave,day,weight}) {
  const [type,setType]=useState('strength');
  const [minutes,setMinutes]=useState('60');
  const [distance,setDistance]=useState('');
  const [customKcal,setCustomKcal]=useState('');
  const [includedInSteps,setIncludedInSteps]=useState(false);
  const [saving,setSaving]=useState(false);
  const estimate=activityKcal(type,parseNum(minutes),parseNum(distance),weight);
  const calories=customKcal!==''?parseNum(customKcal):estimate;
  async function submit(e){e.preventDefault();setSaving(true);try{await onSave({id:uuid('act'),day,type,minutes:parseNum(minutes),distance:parseNum(distance),kcal:calories,includedInSteps});onClose()}finally{setSaving(false)}}
  return <Modal title="Dodaj aktywność" subtitle="Zapisz trening i jego szacunkowy wydatek." onClose={onClose}><form onSubmit={submit}><label className="field"><span>Rodzaj aktywności</span><div className="activity-choice">{ACTIVITY_TYPES.map(t=>{const Icon=activityIcons[t.id];return <button type="button" key={t.id} className={type===t.id?'active':''} onClick={()=>{setType(t.id);setCustomKcal('');setIncludedInSteps(['run','walk'].includes(t.id))}}><Icon size={20}/>{t.name}</button>})}</div></label><div className="field-row"><label className="field"><span>Czas (min)</span><input type="number" min="0" max="1440" step="1" value={minutes} onChange={e=>setMinutes(e.target.value)} required/></label><label className="field"><span>Dystans (km) {type==='run'?'':'— opcjonalny'}</span><input type="number" min="0" max="500" step="0.1" value={distance} placeholder="0" onChange={e=>setDistance(e.target.value)}/></label></div><label className="field"><span>Spalone kalorie (możesz nadpisać szacunek)</span><div className="with-unit"><input type="number" min="0" max="10000" value={customKcal} placeholder={String(estimate)} onChange={e=>setCustomKcal(e.target.value)}/><span>kcal</span></div></label>{(type==='run'||type==='walk')&&<label className="check-line"><input type="checkbox" checked={includedInSteps} onChange={e=>setIncludedInSteps(e.target.checked)}/><span>Kroki z tego treningu są już w moim liczniku kroków</span></label>}<div className="estimate"><Flame size={20}/><span>Szacowany wydatek</span><strong>{fmt(calories)} kcal</strong></div><p className="help-note">To przybliżony wydatek dodatkowy (ponad spoczynkowy). Zegarek sportowy może podawać inną wartość.</p><div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Anuluj</button><button className="button primary" disabled={saving}>{saving?'Zapisywanie...':'Zapisz aktywność'}</button></div></form></Modal>;
}
function MetricModal({day,current,onSave,onClose}) {
  const [steps,setSteps]=useState(String(current?.steps||0));
  const [weight,setWeight]=useState(current?.weight == null?'':String(current.weight));
  const [notes,setNotes]=useState(current?.notes||'');
  const [saving,setSaving]=useState(false);
  async function save(e){e.preventDefault();setSaving(true);try{await onSave({day,steps:Math.max(0,Math.round(parseNum(steps))),weight:weight===''?null:parseNum(weight),notes});onClose();}finally{setSaving(false);}}
  return <Modal title="Dane z dnia" subtitle={dateTitle(day)} onClose={onClose}><form onSubmit={save}><label className="field"><span>Liczba kroków</span><div className="with-unit"><input type="number" min="0" max="200000" step="1" value={steps} onChange={e=>setSteps(e.target.value)}/><span>kroków</span></div></label><label className="field"><span>Waga (kg) — jeśli dziś była mierzona</span><div className="with-unit"><input type="number" min="20" max="500" step="0.1" placeholder="Nie mierzono" value={weight} onChange={e=>setWeight(e.target.value)}/><span>kg</span></div></label><label className="field"><span>Notatka (opcjonalnie)</span><textarea rows="3" maxLength={1000} placeholder="Jak Ci dzisiaj poszło?" value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Anuluj</button><button className="button primary" disabled={saving}>Zapisz dzień</button></div></form></Modal>;
}
function WeekChart({days,goal}) {
  const max=Math.max(goal,...days.map(d=>d.kcal),1)*1.12;
  return <div className="week-chart"><div className="chart-guide"><span>{fmt(max)} kcal</span><span>{fmt(max/2)} kcal</span><span>0</span></div><div className="chart-columns"><div className="goal-line" style={{bottom:`${goal/max*100}%`}}><span>Cel</span></div>{days.map(d=><div className="chart-col" key={d.day} title={`${d.day}: ${fmt(d.kcal)} kcal`}><div className="bar-track"><div className={`bar-fill ${d.kcal>goal?'over':''}`} style={{height:`${Math.min(100,d.kcal/max*100)}%`}}/></div><span className={d.day===localDay()?'today':''}>{new Date(d.day+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'short'}).replace('.','')}</span></div>)}</div></div>;
}
function WeightChart({points,goal}) {
  if(points.length<2)return <div className="empty-chart"><Weight size={28}/><strong>Wykres dopiero się zaczyna</strong><span>Zapisz wagę przez przynajmniej dwa dni, żeby zobaczyć trend.</span></div>;
  const latest=points.slice(-20);
  const vals=latest.map(p=>p.weight);
  const min=Math.min(goal,...vals)-1.5,max=Math.max(...vals)+1.5;
  const w=600,h=190,p=22;
  const x=i=>p+(i/(latest.length-1))*(w-p*2);
  const y=v=>p+(max-v)/(max-min)*(h-p*2);
  const d=latest.map((it,i)=>`${i?'L':'M'} ${x(i)} ${y(it.weight)}`).join(' ');
  const area=`${d} L ${x(latest.length-1)} ${h-p} L ${p} ${h-p} Z`;
  return <div className="weight-chart"><div className="weight-chart-labels"><span>{fmt(max,1)} kg</span><span>{fmt((max+min)/2,1)} kg</span><span>{fmt(min,1)} kg</span></div><svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Wykres zmian wagi"><defs><linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6ab49e" stopOpacity=".28"/><stop offset="1" stopColor="#6ab49e" stopOpacity="0"/></linearGradient></defs>{[0,.5,1].map((n,i)=><line key={i} x1={p} x2={w-p} y1={p+(h-2*p)*n} y2={p+(h-2*p)*n} stroke="#e9eee7" strokeDasharray="5 5"/>)}<line x1={p} x2={w-p} y1={y(goal)} y2={y(goal)} stroke="#9ac97a" strokeDasharray="7 5"/><path d={area} fill="url(#weightGradient)"/><path d={d} stroke="#2d8369" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>{latest.map((it,i)=><circle key={i} cx={x(i)} cy={y(it.weight)} r={i===latest.length-1?5:3} fill="#2d8369" stroke="#fff" strokeWidth="2"/>)}</svg><div className="chart-xlabels"><span>{latest[0].day.slice(5)}</span><span>Cel {fmt(goal)} kg</span><span>{latest.at(-1).day.slice(5)}</span></div></div>;
}
function Login({onLogin,setupError}) {
  const [password,setPassword]=useState('');const [error,setError]=useState('');const [pending,setPending]=useState(false);
  async function submit(e){e.preventDefault();setPending(true);setError('');try{await api('/login',{method:'POST',body:JSON.stringify({password})});await onLogin();}catch(err){setError(err.message)}finally{setPending(false)}}
  return <div className="login-page"><div className="login-glow"/><div className="login-card"><div className="brand-mark big-brand"><Leaf size={29}/></div><div className="login-brand">forma<span>.</span></div>{setupError?<><h1>Potrzebna konfiguracja</h1><p>Serwer nie jest jeszcze gotowy. Skonfiguruj hasło, klucz sesji i bazę D1 w Cloudflare Pages.</p><div className="error-box">{setupError}</div><p className="muted small">Szczegóły znajdziesz w README dołączonym do projektu.</p></>:<><h1>Twój progres zaczyna się tutaj.</h1><p>Prywatny dziennik jedzenia, treningów i postępów.</p><form onSubmit={submit}><label className="field"><span>Hasło do aplikacji</span><div className="login-input"><LockKeyhole size={18}/><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Wpisz swoje hasło"/></div></label>{error&&<p className="form-error">{error}</p>}<button className="button primary full" disabled={pending}>{pending?'Logowanie...':'Przejdź do dziennika'} <ArrowRight size={18}/></button></form><span className="login-foot"><ShieldCheck size={16}/> Tylko Ty masz dostęp do swoich danych</span></>}</div></div>;
}
function App() {
  const [mode,setMode]=useState('loading');
  const [setupError,setSetupError]=useState('');
  const [data,setData]=useState(empty);
  const [day,setDay]=useState(localDay());
  const [view,setView]=useState('dashboard');
  const [foodModal,setFoodModal]=useState(null);
  const [activityModal,setActivityModal]=useState(false);
  const [metricModal,setMetricModal]=useState(false);
  const [toast,setToast]=useState('');
  const local=mode==='local';
  useEffect(()=>{
    let mounted=true;
    (async()=>{try{const r=await api('/session');if(!mounted)return;if(!r.authenticated){setMode('auth');return}const s=await api('/state');if(!mounted)return;setData({...empty,...s,profile:normalizeProfile(s.profile)});setMode('ready');}
      catch(err){if(!mounted)return;if(import.meta.env.DEV){setData(readLocal());setMode('local');}else{setSetupError(err.message);setMode('setup')}}})();
    return()=>{mounted=false};
  },[]);
  useEffect(()=>{if(local)writeLocal(data);},[data,local]);
  function notify(text){setToast(text);window.setTimeout(()=>setToast(''),3300);}
  async function reload(){const s=await api('/state');setData({...empty,...s,profile:normalizeProfile(s.profile)});setMode('ready');}
  async function add(kind,record){try{if(!local)await mutate(kind,record);setData(s=>({...s,[kind]:[record,...s[kind].filter(x=>x.id!==record.id)]}));notify('Zapisano ✓');}catch(err){notify('Błąd zapisu: '+err.message);throw err}}
  async function remove(kind,record){try{if(!local)await mutate(kind,null,'DELETE',record.id);setData(s=>({...s,[kind]:s[kind].filter(x=>x.id!==record.id)}));notify('Usunięto wpis');}catch(err){notify('Błąd usuwania: '+err.message)}}
  async function saveDaily(record){try{if(!local)await mutate('daily',record);setData(s=>({...s,daily:[record,...s.daily.filter(x=>x.day!==record.day)]}));notify('Dane dnia zapisane ✓');}catch(err){notify('Błąd zapisu: '+err.message);throw err}}
  async function saveProfile(record){try{if(!local)await mutate('profile',record);setData(s=>({...s,profile:record}));notify('Profil zapisany ✓');}catch(err){notify('Błąd zapisu: '+err.message);throw err}}
  function exportData(){const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`forma-backup-${localDay()}.json`;anchor.click();URL.revokeObjectURL(url);}
  async function logout(){try{await api('/logout',{method:'POST'});}catch{}setMode('auth');setData(empty);}
  const todayEntries=useMemo(()=>data.entries.filter(x=>x.day===day),[data.entries,day]);
  const todayActs=useMemo(()=>data.activities.filter(x=>x.day===day),[data.activities,day]);
  const metrics=data.daily.find(x=>x.day===day)||{day,steps:0,weight:null,notes:''};
  const weights=data.daily.filter(d=>d.weight!=null&&d.day<=day).sort((a,b)=>a.day.localeCompare(b.day));
  const weight=weights.at(-1)?.weight||data.profile.startWeight;
  const goal=calcTargets(data.profile,weight);
  const nutrients=useMemo(()=>{
    const rows=todayEntries.map(e=>scaleFood(e.food,e.grams));
    return Object.fromEntries(['kcal','protein','carbs','fat',...NUTRIENTS.map(([k])=>k)].map(k=>[k,rows.some(r=>r[k]!==null)?rows.reduce((total,r)=>total+(r[k]||0),0):null]));
  },[todayEntries]);
  const eaten=nutrients.kcal||0;
  const workout=sum(todayActs,'kcal');
  const stepsBurn=calcStepsKcal(metrics.steps||0,todayActs);
  const extra=workout+stepsBurn;
  const {budget,remaining}=calcDailyBalance(goal,eaten);
  const start=data.profile.startWeight,target=data.profile.targetWeight;
  const progress=start===target?100:Math.min(100,Math.max(0,(start-weight)/(start-target)*100));
  const weeks=Array.from({length:7},(_,i)=>{
    const dd=shiftDay(day,i-6);return {day:dd,kcal:data.entries.filter(e=>e.day===dd).reduce((n,e)=>n+(scaleFood(e.food,e.grams).kcal||0),0)};
  });
  const loggedDays=weeks.filter(d=>data.entries.some(e=>e.day===d.day));
  const mean=loggedDays.length?sum(loggedDays,'kcal')/loggedDays.length:0;
  if(mode==='loading')return <div className="loading-screen"><div className="brand-mark"><Leaf/></div><p>Ładuję dziennik...</p></div>;
  if(mode==='auth'||mode==='setup')return <Login onLogin={reload} setupError={mode==='setup'?setupError:null}/>;
  return <div className="app-layout"><aside className="sidebar"><div className="sidebar-brand"><span className="brand-mark"><Leaf size={25}/></span><span>forma<span className="brand-point">.</span><small>TWÓJ DOBRY RYTM</small></span></div><div className="sidebar-nav-label">MENU GŁÓWNE</div><nav className="sidebar-nav">{nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}><Icon size={20}/>{item.label}{view===item.id&&<span className="nav-mark"/>}</button>})}</nav><div className="sidebar-bottom"><div className="sidebar-goal"><span className="goal-symbol"><Target size={20}/></span><small>TWÓJ CEL</small><h3>{fmt(target)} kg</h3><div className="goal-meter"><span style={{width:`${progress}%`}}/></div><p>Jeszcze {fmt(Math.max(0,weight-target),1)} kg do celu</p></div><div className="sidebar-profile"><div className="profile-avatar">F</div><div><strong>Mój dziennik</strong><small>{local?'Tryb lokalny':'Prywatne konto'}</small></div><MoreHorizontal size={18}/></div></div></aside>
    <main className="main"><Topline day={day} setDay={setDay} view={view}/>{local&&<div className="demo-banner"><Info size={16}/> Tryb lokalny — zapis tylko w tej przeglądarce. W Cloudflare dane będą synchronizowane przez D1.</div>}
      {view==='dashboard'&&<><div className="hero-grid"><div className="calorie-hero"><div className="hero-glow"/><div className="hero-intro"><span className="hero-eyebrow"><Sparkles size={15}/> TWÓJ DZISIEJSZY BILANS</span><h2>Jesteś o krok bliżej celu.</h2><p>Jedz świadomie, ruszaj się i obserwuj postępy.</p></div><div className="hero-content"><Donut value={eaten} limit={budget}><strong>{fmt(eaten)}</strong><span>z {fmt(budget)} kcal</span><small>spożyte</small></Donut><div className="hero-figures"><div><span>POZOSTAŁO</span><strong className={remaining<0?'negative':''}>{fmt(remaining)}<small> kcal</small></strong></div><div className="hero-equation"><span><Utensils size={15}/> Zjedzone <b>{fmt(eaten)}</b></span><span><Target size={15}/> Cel dzienny <b>{fmt(goal.calories)}</b></span><span><Flame size={15}/> Ruch w planie <b>≈ {fmt(extra)}</b></span></div></div></div></div><div className="goal-card"><div className="goal-top"><IconBadge Icon={Target} color="sun"/><span className="soft-badge">CEL: {fmt(target)} KG</span></div><h3>Twoja droga do formy</h3><div className="big-weight">{fmt(weight,1)} <small>kg</small></div><div className="weight-compare"><span>Start {fmt(start,1)} kg</span><span>Cel {fmt(target,1)} kg</span></div><div className="goal-big-meter"><span style={{width:`${progress}%`}}/></div><p>{Math.abs(start-weight)<0.05?'Pierwszy krok jest już za Tobą.':weight<=target?'Gratulacje! Cel osiągnięty 🎉':`Udało Ci się zrzucić ${fmt(Math.max(0,start-weight),1)} kg. Tak trzymaj!`}</p><button className="light-link" onClick={()=>setMetricModal(true)}>Zapisz aktualną wagę <ArrowRight size={16}/></button></div></div>
        <div className="macros-panel panel"><SectionTitle title="Dzisiejsze makroskładniki" subtitle="Sprawdź, jak bilansuje się Twój dzień."/><div className="macro-grid"><div className="macro-item"><div className="macro-icon protein">P</div><span>Białko</span><strong>{fmt(nutrients.protein,1)} <small>/ {fmt(goal.protein)} g</small></strong><div className="meter"><div style={{width:`${percent(nutrients.protein,goal.protein)}%`,background:'#7a81ec'}}/></div></div><div className="macro-item"><div className="macro-icon carb">W</div><span>Węglowodany</span><strong>{fmt(nutrients.carbs,1)} <small>/ {fmt(goal.carbs)} g</small></strong><div className="meter"><div style={{width:`${percent(nutrients.carbs,goal.carbs)}%`,background:'#e6b166'}}/></div></div><div className="macro-item"><div className="macro-icon fat">T</div><span>Tłuszcze</span><strong>{fmt(nutrients.fat,1)} <small>/ {fmt(goal.fat)} g</small></strong><div className="meter"><div style={{width:`${percent(nutrients.fat,goal.fat)}%`,background:'#ee9b9b'}}/></div></div></div></div>
        <div className="content-grid"><div className="left-col"><SectionTitle title="Dziennik posiłków" subtitle={dateTitle(day)} action={<button className="button primary compact" onClick={()=>setFoodModal({meal:'breakfast'})}><Plus size={17}/> Dodaj jedzenie</button>}/><div className="meals-grid">{MEALS.map(m=><MealCard key={m.id} meal={m} entries={todayEntries.filter(e=>e.meal===m.id)} onAdd={id=>setFoodModal({meal:id})} onEdit={entry=>setFoodModal({editing:entry})} onRemove={e=>remove('entries',e)}/>)}</div></div><div className="right-col"><div className="panel activity-summary"><SectionTitle title="Ruch & spalanie" action={<button className="round-add" onClick={()=>setActivityModal(true)} aria-label="Dodaj trening"><Plus size={18}/></button>}/><div className="step-summary"><IconBadge Icon={Footprints} color="blue"/><div><span>Dzisiejsze kroki</span><strong>{fmt(metrics.steps)}</strong></div><button className="light-link" onClick={()=>setMetricModal(true)}>Zmień</button></div><div className="step-goal"><div className="meter"><div style={{width:`${percent(metrics.steps,10000)}%`,background:'#80c3bb'}}/></div><small>{fmt(metrics.steps)} / 10 000 kroków</small></div><div className="burn-breakdown"><div><span><Footprints size={16}/> Kroki ponad bazę</span><b>≈ {fmt(stepsBurn)} kcal</b></div><div><span><Dumbbell size={16}/> Treningi</span><b>≈ {fmt(workout)} kcal</b></div></div><p className="activity-budget-note">Ruch jest już uwzględniony w dziennym celu. Zapis treningu nie zwiększa limitu kalorii.</p><button className="subtle-full-button" onClick={()=>setActivityModal(true)}><Plus size={16}/> Dodaj trening</button></div><div className="panel week-panel"><SectionTitle title="Ostatnie 7 dni" subtitle="Kalorie ze spożytych posiłków"/><WeekChart days={weeks} goal={goal.calories}/><div className="week-foot"><span>Średnia dni z wpisami</span><strong>{loggedDays.length?`${fmt(mean)} kcal`:'Brak wpisów'}</strong></div></div></div></div>
        <div className="panel micros-panel"><SectionTitle title="Mikroskładniki i błonnik" subtitle="Wartości policzone tylko na podstawie dostępnych danych o produktach." action={<span className="soft-badge neutral">NA {dateTitle(day).split(', ')[1]?.toUpperCase()}</span>}/><div className="micros-grid">{NUTRIENTS.map(([key,name,unit])=><div key={key} className="micro-item"><span>{name}</span><strong>{nutrients[key]===null?'—':`${fmt(nutrients[key],key==='salt'||key==='b12'||key==='vitaminD'?2:1)} ${unit}`}</strong></div>)}</div><p className="muted-note"><Info size={15}/> „—” oznacza brak danych, nie zero. Suma może być zaniżona, jeśli część produktów nie zawiera informacji o danym składniku.</p></div></>}
      {view==='foods'&&<><div className="feature-intro panel"><div className="feature-icon"><Search size={26}/></div><div><h2>Wpisuj produkty tak, jak Ci wygodnie.</h2><p>Wybierz jajko, cebulę czy ryż, podaj gramaturę albo zapisz własny produkt z etykiety.</p></div><button className="button primary" onClick={()=>setFoodModal({meal:'breakfast'})}><Plus size={18}/> Dodaj jedzenie</button></div><div className="panel"><SectionTitle title="Twoje produkty" subtitle="Dodane ręcznie pozycje — zawsze pod ręką." action={<button className="button outline compact" onClick={()=>setFoodModal({meal:'breakfast'})}><Plus size={17}/> Nowy wpis</button>}/>{data.foods.length?<div className="food-list">{data.foods.map(f=><div className="own-row" key={f.id}><FoodRow food={f} onClick={item=>setFoodModal({meal:'breakfast',food:item})}/><button className="remove-button" title="Usuń produkt" onClick={()=>remove('foods',f)}><Trash2 size={17}/></button></div>)}</div>:<div className="empty-state"><IconBadge Icon={Leaf}/><h3>Jeszcze nie ma własnych produktów</h3><p>Dodaj produkt z etykiety, a pojawi się tutaj.</p></div>}</div><div className="panel"><SectionTitle title="Podstawowa baza" subtitle="43 produkty ze zdjęciami · orientacyjne wartości na 100 g."/><div className="food-catalog">{BASE_FOODS.map(f=><FoodRow key={f.id} food={f} onClick={item=>setFoodModal({meal:'breakfast',food:item})}/>)}</div></div><p className="attribution">Dodatkowe wyszukiwanie produktów: <a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">Open Food Facts</a> (ODbL). Sprawdzaj informacje na opakowaniu.</p></>}
      {view==='activity'&&<><div className="activity-stats"><div className="stat-panel panel"><IconBadge Icon={Footprints} color="blue"/><span>Kroki</span><strong>{fmt(metrics.steps)}</strong><small>cel pomocniczy 10 000</small></div><div className="stat-panel panel"><IconBadge Icon={Dumbbell} color="purple"/><span>Trening</span><strong>{fmt(workout)} <small>kcal</small></strong><small>{todayActs.length} aktywności</small></div><div className="stat-panel panel"><IconBadge Icon={Flame} color="sun"/><span>Szacowany ruch</span><strong>{fmt(extra)} <small>kcal</small></strong><small>informacyjnie · zawarty w planie</small></div></div><div className="panel activity-input-panel"><SectionTitle title="Zapisz swoją aktywność" subtitle="Uzupełnij kroki i treningi z zegarka, telefonu lub notatek."/><div className="activity-actions"><button className="action-tile" onClick={()=>setMetricModal(true)}><IconBadge Icon={Footprints} color="blue"/><strong>Wpisz kroki / wagę</strong><span>Aktualizuj dzień <ArrowRight size={15}/></span></button><button className="action-tile" onClick={()=>setActivityModal(true)}><IconBadge Icon={Dumbbell} color="purple"/><strong>Dodaj trening</strong><span>Siłownia, bieg, rower... <ArrowRight size={15}/></span></button></div></div><div className="panel"><SectionTitle title="Treningi z tego dnia" subtitle={dateTitle(day)} action={<button className="button outline compact" onClick={()=>setActivityModal(true)}><Plus size={17}/> Dodaj</button>}/>{todayActs.length?todayActs.map(a=>{const meta=ACTIVITY_TYPES.find(t=>t.id===a.type);const Icon=activityIcons[a.type]||Flame;return <div className="activity-entry" key={a.id}><IconBadge Icon={Icon} color="blue"/><div><strong>{meta?.name||'Trening'}</strong><span>{fmt(a.minutes)} min {a.distance>0?`· ${fmt(a.distance,1)} km`:''}</span></div><b>≈ {fmt(a.kcal)} kcal</b><button className="remove-button" onClick={()=>remove('activities',a)} aria-label="Usuń trening"><Trash2 size={17}/></button></div>}):<div className="empty-state"><IconBadge Icon={Activity}/><h3>Brak treningów w tym dniu</h3><p>Dodaj sesję na siłowni lub bieganie, a uwzględnimy szacunkowe spalanie.</p></div>}</div><p className="small muted activity-tip"><Info size={16}/> Twój dzienny cel obejmuje przeciętną aktywność. Kroki i treningi zapisujemy informacyjnie, bez automatycznego dodawania kalorii do jedzenia. Pierwsze 3000 kroków pomijamy w szacunku ruchu, a oznaczone kroki z biegu i spaceru odejmujemy od krokomierza.</p></>}
      {view==='progress'&&<><div className="progress-stats"><div className="stat-panel panel"><IconBadge Icon={Weight}/><span>Aktualna waga</span><strong>{fmt(weight,1)} <small>kg</small></strong><small>Cel {fmt(target,1)} kg</small></div><div className="stat-panel panel"><IconBadge Icon={TrendingDown} color="blue"/><span>Zmiana od początku</span><strong>{start-weight>0?'-':start-weight<0?'+':''}{fmt(Math.abs(start-weight),1)} <small>kg</small></strong><small>Start {fmt(start,1)} kg</small></div><div className="stat-panel panel"><IconBadge Icon={Target} color="sun"/><span>Do celu</span><strong>{fmt(Math.max(0,weight-target),1)} <small>kg</small></strong><small>{fmt(progress)}% drogi</small></div></div><div className="panel"><SectionTitle title="Historia wagi" subtitle="Twoje pomiary na osi czasu." action={<button className="button primary compact" onClick={()=>setMetricModal(true)}><Plus size={17}/> Dodaj pomiar</button>}/><WeightChart points={weights} goal={target}/></div><div className="panel"><SectionTitle title="Spożyte kalorie · 7 dni" subtitle="Każdy słupek to jeden dzień z Twojego dziennika."/><WeekChart days={weeks} goal={goal.calories}/></div><div className="panel"><SectionTitle title="Ostatnie pomiary" subtitle="Zapisane dane wagowe."/>{weights.length?<div className="measure-list">{weights.slice(-12).reverse().map(w=><div key={w.day}><span>{dateTitle(w.day)}</span><strong>{fmt(w.weight,1)} kg</strong></div>)}</div>:<div className="empty-state"><p>Nie zapisano jeszcze żadnej wagi.</p></div>}</div></>}
      {view==='settings'&&<SettingsPage currentWeight={weights.at(-1)?.weight} profile={data.profile} onSave={saveProfile} onExport={exportData} local={local} onLogout={logout}/>}
      <footer className="app-footer">Forma © 2026 · Twoje tempo. Twoja droga. <span>Wskazania kalorii i aktywności są orientacyjne.</span></footer>
    </main><nav className="mobile-nav">{nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}><Icon size={22}/><small>{item.label}</small></button>})}</nav>
    {foodModal&&<FoodModal day={day} personal={data.foods} editing={foodModal.editing||null} initialMeal={foodModal.meal||'breakfast'} initialFood={foodModal.food||null} local={local} onClose={()=>setFoodModal(null)} onAdd={record=>add('entries',record)} onSaveFood={record=>add('foods',record)} onDeleteFood={record=>remove('foods',record)}/>}
    {activityModal&&<ActivityModal day={day} weight={weight} onClose={()=>setActivityModal(false)} onSave={record=>add('activities',record)}/>}
    {metricModal&&<MetricModal day={day} current={metrics} onClose={()=>setMetricModal(false)} onSave={saveDaily}/>}
    {toast&&<div className="toast" role="status"><Check size={17}/>{toast}</div>}
  </div>;
}
export default App;
