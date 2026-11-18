import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Bike,
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  ClipboardList, Cookie, Download, Dumbbell, Flame, Footprints, Heart,
  Info, Leaf, LockKeyhole, LogOut, Menu, Minus, Moon, MoreHorizontal,
  Plus, Search, Settings2, ShieldCheck, Sunrise, Target, Pill,
  Trash2, TrendingDown, Utensils, Weight, X
} from 'lucide-react';
import {
  ACTIVITY_TYPES, BASE_FOODS, FAVORITE_FOODS, HOMEMADE_FOODS, MEALS, NUTRIENTS, activityKcal,
  calcTargets, calcDailyBalance, calcDailyMovement, dateTitle, fmt, foodBasis, foodBasisLabel, foodImage, foodOptions, foodUnit, localDay, nutrientLabel, parseNum, resolveFoodNutrition, scaleFood, shiftDay
} from './foods.js';
import {DEFAULT_PROFILE, api, mutate, readLocal, uuid, writeLocal} from './storage.js';
import {normalizeProfile} from './profile.js';
import SettingsPage from './SettingsPage.jsx';
import Modal, {allowFieldAutofocus} from './Modal.jsx';
import NutritionStats, {DailyNutrientPreview} from './NutritionStats.jsx';
import {sumNutrition,recentEnergyDays} from './nutritionStats.js';
import {displayTotal as totalLabel,displayFoodNutrientLabel as foodNutrientLabel,readableNutritionNote} from './nutritionDisplay.js';
import {genericNutritionInfo,genericNutritionGap} from './genericNutrition.js';
import {favoriteSeleniumInfo} from './favoriteFoods.js';
import MacroValues from './MacroValues.jsx';
import {MACRO_PRESENTATION} from './macroPresentation.js';
import WeightInput from './WeightInput.jsx';
import {formatWeight, parseWeight, weightError} from './weight.js';
import SupplementsPage, {SupplementPanel} from './SupplementsPage.jsx';
import {isSupplement, supplementLogId} from './supplements.js';
import DailyBalance from './DailyBalance.jsx';
import WeightSummary from './WeightSummary.jsx';
import WeightTrendChart from './WeightTrendChart.jsx';
import {buildWeightTrend} from './weightTrend.js';
import QuantityInput from './QuantityInput.jsx';
import {sliceGrams,quantityInBaseUnits,defaultFoodQuantity,teaPortionLabel,teaCups} from './foodPortions.js';
import {isTea,TEA_CUP_ML,teaRecipeOf,normalizeTeaRecipe} from './teaRecipe.js';
import {configuredTeaFood,TEA_SOURCES} from './tea.js';
import TeaExtras from './TeaExtras.jsx';
import './food-journal.css';
import WeekChart from './WeekChart.jsx';
import DateNavigation from './DateNavigation.jsx';
import useDaySwipe from './useDaySwipe.js';
import NutritionExportModal,{NutritionExportButton} from './NutritionExportModal.jsx';

const nav = [
  {id:'dashboard',label:'Pulpit',icon:BarChart3},
  {id:'foods',label:'Produkty',icon:Search},
  {id:'activity',label:'Aktywność',icon:Activity},
  {id:'supplements',label:'Suplementy',icon:Pill},
  {id:'progress',label:'Statystyki',icon:ClipboardList},
  {id:'settings',label:'Ustawienia',icon:Settings2},
];
const mealIcons = {breakfast:Sunrise,lunch:Utensils,dinner:Moon,snack:Cookie};
const mealImages = {breakfast:'/meals/breakfast.webp',lunch:'/meals/lunch.webp',dinner:'/meals/dinner.webp',snack:'/meals/snack.webp'};
const activityIcons = {strength:Dumbbell,run:Footprints,walk:Footprints,bike:Bike,other:Flame};
const empty = {entries:[],activities:[],daily:[],foods:[],profile:DEFAULT_PROFILE};
const sum = (arr, key) => arr.reduce((n,x)=>n+(Number(x[key])||0),0);
const percent = (n,goal) => goal>0?Math.max(0,Math.min(100,n/goal*100)):0;
const first = (name) => name.trim().charAt(0).toLocaleUpperCase('pl');
const displayText = text => String(text||'').replace(/\s*[\u00b7\u2022]\s*/g, ', ');

function FoodPhoto({food,size=''}) {
  const src=foodImage(food);
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  return <span className={`food-avatar ${size} ${food.imageFit==='contain'?'packshot':''} ${src&&!failed?'has-photo':''}`}>
    {src&&!failed?<img src={src} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:first(food.name)}
  </span>;
}

function IconBadge({Icon, color='mint',size=20}) {return <span className={`icon-badge ${color}`}><Icon size={size} strokeWidth={1.9}/></span>;}
function SectionTitle({title,subtitle,action}) {return <div className="section-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;}
function Topline({day,setDay,view,recordedDays}) {
  return <div className="topline"><div className="topline-left"><span className="today-marker"><ClipboardList size={15} aria-hidden="true"/> TWÓJ DZIENNIK</span><h1>{({dashboard:'Dzień dobry! 👋',foods:'Baza produktów',activity:'Twoja aktywność',progress:'Statystyki żywienia',supplements:'Suplementy',settings:'Ustawienia'})[view]}</h1><p className="page-subtitle">{({dashboard:'Każdy dobry wybór przybliża Cię do celu.',foods:'Wszystko, co jesz, w jednym miejscu.',activity:'Każdy ruch ma znaczenie.',progress:'Twój bilans dnia i tygodnia, makro i witaminy.',supplements:'Zapisuj przyjęte kapsułki i sprawdzaj sumy składników.',settings:'Dopasuj licznik do siebie.'})[view]}</p></div><DateNavigation day={day} onChange={setDay} recordedDays={recordedDays}/></div>;
}
function MealCard({meal,entries,onAdd,onEdit,onRemove}) {
  const [expanded,setExpanded]=useState(false);
  const Icon = mealIcons[meal.id];
  const mealNutrition=sumNutrition(entries);
  return <div className={`meal-card meal-collapsible ${expanded?'expanded':''}`}>
    <div className="meal-head"><button className="meal-toggle" aria-expanded={expanded} aria-controls={`meal-entries-${meal.id}`} onClick={()=>setExpanded(!expanded)}><span className="meal-name">
      {mealImages[meal.id]?<img className="meal-photo" src={mealImages[meal.id]} alt="" width="76" height="76" decoding="async"/>:<IconBadge Icon={Icon} color={meal.id}/>}
      <span className="meal-summary-text"><strong>{meal.name}</strong><span>{entries.length?`${totalLabel(mealNutrition,'kcal',0)} kcal · ${entries.length} ${entries.length===1?'produkt':'produktów'}`:'0 kcal · Brak wpisów'}</span></span>
    </span><ChevronDown className="meal-expand-icon" size={18}/></button><button className="small-add" onClick={()=>onAdd(meal.id)} aria-label={`Dodaj do ${meal.name}`}><Plus size={22}/></button></div>
    <div id={`meal-entries-${meal.id}`} className="meal-contents" hidden={!expanded}>
    {expanded&&entries.map(e=>{const n=scaleFood(e.food,e.grams);return <div className="meal-entry" key={e.id}>
      <button className="entry-main" onClick={()=>onEdit(e)}><FoodPhoto food={e.food}/><span className="entry-text"><strong>{e.food.name}</strong><small>{isTea(e.food)?teaPortionLabel(e.grams):`${fmt(e.grams,1)} ${foodUnit(e.food)}`}{e.food.brand?`, ${displayText(e.food.brand)}`:''}</small></span><span className="entry-calories">{nutrientLabel(n.kcal,false,0)} <small>kcal</small></span><MacroValues values={n} food={e.food} className="entry-macros"/></button>
      <button className="remove-button" onClick={()=>onRemove(e)} aria-label={`Usuń ${e.food.name}`}><Trash2 size={17}/></button>
    </div>})}
    {expanded&&!entries.length&&<div className="meal-empty"><p>Dodaj pierwszy produkt do tego posiłku.</p><button className="button outline compact" onClick={()=>onAdd(meal.id)}><Plus size={16}/> Dodaj jedzenie</button></div>}
    </div>
  </div>;
}
function FoodRow({food,onClick,extra}) {
  const values=isTea(food)?scaleFood(food,TEA_CUP_ML):food;
  return <button className="food-search-row" onClick={()=>onClick(food)}>
    <FoodPhoto food={food} size="large"/>
    <span className="food-search-info"><strong>{food.name}</strong>
      <small>{isTea(food)?'Lipton · 1 kubek (250 ml)':displayText(food.brand) || (food.source==='Open Food Facts'?'Open Food Facts':`Wartości na ${foodBasisLabel(food)}`)}</small>
    </span>
    <span className="food-search-kcal"><strong>{nutrientLabel(values.kcal,false,0)}</strong><small>kcal</small></span>
    {extra || <Plus size={18} className="food-row-plus"/>}
    <MacroValues values={values} food={food}/>
  </button>;
}
function FoodSearchResult({food,onSelect}) {
  const [expanded,setExpanded]=useState(false);
  const detailsId=React.useId();
  const values=isTea(food)?scaleFood(food,TEA_CUP_ML):food;
  return <div className={`food-result ${expanded?'expanded':''}`}>
    <div className="food-result-head"><button className="food-result-select" onClick={()=>onSelect(food)}><FoodPhoto food={food}/><strong>{food.name}</strong></button><button className="food-result-expand" aria-label={`${expanded?'Zwiń':'Rozwiń'} szczegóły: ${food.name}`} aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setExpanded(!expanded)}><ChevronDown size={18}/></button></div>
    {expanded&&<div id={detailsId} className="food-result-details"><div className="food-result-description"><span>{displayText(food.brand||food.source)}<small>{isTea(food)?'1 kubek (250 ml) · szacunek':`Na ${foodBasisLabel(food)}`}</small></span><strong>{nutrientLabel(values.kcal,false,0)} <small>kcal</small></strong></div><MacroValues values={values} food={food}/><button className="food-result-add" onClick={()=>onSelect(food)}>Podaj ilość <ArrowRight size={16}/></button></div>}
  </div>;
}
function FavoriteFoodsPanel({onSelect}) {
  return <section className="panel favorite-foods-panel">
    <SectionTitle title="Produkty z Twojej listy" subtitle={`${FAVORITE_FOODS.length} produktów — Twoje etykiety i szacunek naparu herbaty.`}/>
    <div className="food-list">{FAVORITE_FOODS.map(food=><FoodRow key={food.id} food={food} onClick={onSelect}/>)}</div>
    <p className="muted-note"><Info size={15}/> Wartości produktów pochodzą z Twoich tabel. Skład naparu herbaty jest szacunkowy. Suplementy liczymy na tabletki, brak danych pozostaje nieznany.</p>
  </section>;
}
function HomemadeFoodsPanel({onSelect}) {
  return <section className="panel homemade-foods-panel">
    <SectionTitle title="Twoje dania domowe" subtitle="Orientacyjne wartości na 100 g gotowego dania. Waż porcję razem z sosem, makaronem lub nadzieniem."/>
    <div className="food-list">{HOMEMADE_FOODS.map(food=><FoodRow key={food.id} food={food} onClick={onSelect}/>)}</div>
    <p className="muted-note">Proporcje składników i masa po przygotowaniu wpływają na wynik. Założenia znajdziesz po wybraniu dania; brakujące składniki pozostają nieznane.</p>
  </section>;
}
function FoodModal({onClose,day,personal,onAdd,onSaveFood,onDeleteFood,initialMeal='breakfast',initialFood=null,editing=null,local}) {
  const formId=React.useId();
  const initialCups=teaCups(editing?.grams);
  const initialInCups=isTea(editing?.food||initialFood)&&(!editing||initialCups!=null);
  const [query,setQuery]=useState('');
  const [remote,setRemote]=useState([]);
  const [busy,setBusy]=useState(false);
  const [remoteError,setRemoteError]=useState(false);
  const [selected,setSelected]=useState(()=>resolveFoodNutrition(editing?.food||initialFood||null));
  const [amount,setAmount]=useState(String(editing?(initialInCups?initialCups:editing.grams):initialInCups?1:defaultFoodQuantity(initialFood)));
  const [quantityMode,setQuantityMode]=useState(initialInCups?'cup':'base');
  const [teaRecipe,setTeaRecipe]=useState(()=>teaRecipeOf(editing?.food||initialFood));
  const [meal,setMeal]=useState(editing?.meal||initialMeal);
  const [custom,setCustom]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:'',brand:'',unit:'g',kcal:'',protein:'',carbs:'',fat:'',...Object.fromEntries(NUTRIENTS.map(([key])=>[key,'']))});
  useEffect(()=>{setRemote([]);setRemoteError(false);},[query]);
  async function searchOnline(){
    const q=query.trim();if(local||q.length<3||busy)return;
    setBusy(true);setRemoteError(false);
    try {const r=await api('/search?q='+encodeURIComponent(q));setRemote(r.products||[]);setRemoteError(!!r.unavailable);}
    catch {setRemoteError(true)} finally {setBusy(false)}
  }
  const options=useMemo(()=>foodOptions(query,personal.filter(food=>!isSupplement(food)),remote),[query,personal,remote]);
  const sliceSize=sliceGrams(selected);
  const tea=isTea(selected);
  const portionFactor=quantityMode==='slice'?sliceSize:quantityMode==='cup'?TEA_CUP_ML:1;
  const quantity=quantityInBaseUnits(amount,selected,quantityMode);
  const effectiveFood=tea?configuredTeaFood(selected,teaRecipe):selected;
  const displayFood=effectiveFood||selected;
  const scaled=effectiveFood?scaleFood(effectiveFood,quantity||0):selected?scaleFood(selected,0):null;
  const nutritionInfo=genericNutritionInfo(displayFood);
  const seleniumEstimate=favoriteSeleniumInfo(displayFood);
  const nutritionGap=genericNutritionGap(displayFood);
  const recipe=HOMEMADE_FOODS.find(food=>food.id===selected?.id);
  const recipeSources=tea?TEA_SOURCES:recipe?.recipeSources||(selected?.sourceUrl?[{name:'Źródło szacunku',url:selected.sourceUrl}]:[]);
  function selectFood(food){setSelected(resolveFoodNutrition(food));setAmount(String(isTea(food)?1:defaultFoodQuantity(food)));setQuantityMode(isTea(food)?'cup':'base');setTeaRecipe(teaRecipeOf(food));}
  function changeQuantityMode(mode){
    if(mode===quantityMode)return;
    if(mode==='cup') {
      // Never silently change an arbitrary saved ml quantity when switching units.
      const cups=teaCups(quantity);
      if(cups==null)return;
      setAmount(String(cups));
    }else setAmount(String(mode==='slice'?(quantity&&Number.isInteger(quantity/sliceSize)?quantity/sliceSize:1):(quantity||foodBasis(selected))));
    setQuantityMode(mode);
  }
  async function submit(e){e.preventDefault();if(!effectiveFood||quantity==null)return;setSaving(true);try{await onAdd({id:editing?.id||uuid('entry'),day,meal,grams:quantity,food:effectiveFood});onClose();}finally{setSaving(false)}}
  async function saveCustom(e){e.preventDefault();if(!form.name.trim())return;
    const product={id:uuid('own'),name:form.name.trim(),brand:form.brand.trim(),unit:form.unit,source:'Własny'};
    for(const key of ['kcal','protein','carbs','fat',...NUTRIENTS.map(x=>x[0])]){if(form[key]!==''&&form[key]!=null)product[key]=parseNum(form[key]);}
    for(const k of ['kcal','protein','carbs','fat'])if(product[k]===undefined)product[k]=null;
    setSaving(true);try{await onSaveFood(product);selectFood(product);setCustom(false);}finally{setSaving(false)}
  }
  return <Modal title={editing?'Edytuj posiłek':selected?'Dodaj produkt':custom?'Nowy produkt':'Dodaj jedzenie'} className="food-entry-modal" footer={selected?<div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Anuluj</button><button type="submit" form={formId} className="button primary food-entry-save" disabled={saving||quantity==null||!effectiveFood||tea&&!normalizeTeaRecipe(teaRecipe)}>{!saving&&<Check size={18} aria-hidden="true"/>}{saving?'Zapisuję…':'Zapisz'}</button></div>:custom?<div className="modal-actions"><button type="button" className="button ghost" onClick={()=>setCustom(false)}>Wróć</button><button type="submit" form={formId} className="button primary" disabled={saving}>{saving?'Zapisywanie...':'Zapisz produkt i dodaj'}</button></div>:null} subtitle={selected?(tea?'Wybierz kubek herbaty i opcjonalne dodatki.':sliceSize?'Podaj liczbę plastrów lub masę w gramach.':`Wpisz ilość produktu w ${foodUnit(selected)}.`):'Wyszukaj produkt lub dodaj własne wartości.'} onClose={onClose} wide>
    {selected?<form id={formId} onSubmit={submit}>
      <div className="selected-food">
        <FoodPhoto food={selected} size="big"/>
        <div><h3>{displayFood.name}</h3><p><span>{displayText(selected.brand || selected.source)}</span><span>Wartości na {foodBasisLabel(selected)}</span></p></div>
        <button type="button" className="text-link" onClick={()=>{setSelected(null);setQuery('')}}>Zmień</button>
      </div>
      {(selected.source==='Twoja tabela'||selected.imageNote)&&<p className="food-product-note">{selected.source==='Twoja tabela'?'Kalorie i makro z Twojej tabeli. ':''}{selected.imageNote}</p>}
      {nutritionGap&&<p className="food-product-note">{nutritionGap} Nieznane składniki pozostają bez wartości.</p>}
      {sliceSize&&<div className="quantity-unit-toggle" role="group" aria-label="Jednostka porcji"><button type="button" aria-pressed={quantityMode==='base'} onClick={()=>changeQuantityMode('base')}>Gramy</button><button type="button" aria-pressed={quantityMode==='slice'} onClick={()=>changeQuantityMode('slice')}>Plastry</button><span>1 plaster = {sliceSize} g</span></div>}
      {tea&&<div className="quantity-unit-toggle" role="group" aria-label="Jednostka porcji"><button type="button" aria-pressed={quantityMode==='cup'} disabled={quantityMode!=='cup'&&teaCups(quantity)==null} onClick={()=>changeQuantityMode('cup')}>Kubki</button><button type="button" aria-pressed={quantityMode==='base'} onClick={()=>changeQuantityMode('base')}>Mililitry</button><span>1 kubek = 250 ml</span></div>}
      <div className="field-row">
        <label className="field"><span>Ilość ({quantityMode==='cup'?'kubki':quantityMode==='slice'?'plastry':selected.unit==='tablet'?'tabletki':foodUnit(selected)==='ml'?'mililitry':'gramy'})</span><div className="with-unit"><QuantityInput value={amount} onChange={setAmount} whole={['tablet','capsule'].includes(selected.unit)} min={.1/portionFactor} max={100000/portionFactor} autoFocus={allowFieldAutofocus()}/><span>{quantityMode==='cup'?'kub.':quantityMode==='slice'?'pl.':foodUnit(selected)}</span></div></label>
        <label className="field"><span>Posiłek</span><select value={meal} onChange={e=>setMeal(e.target.value)}>{MEALS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      </div>
      {quantityMode==='slice'&&<p className="portion-equivalence">Porcja: <strong>{quantity==null?'—':fmt(quantity,2)} g</strong></p>}
      {tea&&quantityMode==='cup'&&<p className="portion-equivalence">Objętość naparu: <strong>{quantity==null?'—':fmt(quantity,2)} ml</strong></p>}
      {selected.servingSizes?.length>0&&<div className={`serving-presets ${sliceSize?'slice-presets':''}`} aria-label="Szybkie porcje">{selected.servingSizes.map(portion=><button type="button" key={portion.label} title={portion.label} aria-pressed={quantity===portion.quantity} onClick={()=>{setQuantityMode(tea?'cup':sliceSize?'slice':'base');setAmount(String(tea?portion.quantity/TEA_CUP_ML:sliceSize?portion.quantity/sliceSize:portion.quantity));}}>{sliceSize?portion.label.split(' \u2014 ')[0]:portion.label}</button>)}</div>}
      {tea&&<TeaExtras key={selected.id} value={teaRecipe} onChange={setTeaRecipe}/>}
      <div className="portion-preview">
        <div className="portion-energy"><strong>{nutrientLabel(scaled.kcal,false,0)}</strong><span>kcal</span></div>
        <MacroValues values={scaled} food={effectiveFood||selected}/>
      </div>
      {['kcal','protein','carbs','fat'].some(key=>displayFood[key]==null)&&<p className="help-note fat-bound-note">W przekazanych danych brakuje kalorii lub części makro. Zapiszemy je jako nieznane (—), nie jako zero.</p>}
      {displayFood.estimateNotes&&<details className="recipe-estimate"><summary>{recipe?'Jak policzono to danie?':'Założenia szacunku'}</summary><p>{readableNutritionNote(displayFood.estimateNotes)}</p>{recipe&&<p>Wartości są orientacyjne. Masa po przygotowaniu jest założeniem — inna ilość odparowanej wody zmienia wartości na 100 g.</p>}<div className="nutrition-sources">{recipeSources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a>)}</div></details>}
      {NUTRIENTS.some(([key])=>displayFood[key]!=null)&&<details className="food-nutrient-details">
        <summary>Witaminy i pozostałe składniki tej porcji{nutritionInfo?' — szacunek z tabel':''}</summary>
        {nutritionInfo&&<p className="food-product-note generic-nutrition-note">Szacunek dla {nutritionInfo.variant}. Brakujące składniki uzupełniono z <a href={nutritionInfo.url} target="_blank" rel="noreferrer">{nutritionInfo.sourceName} ↗</a>. {nutritionInfo.method||'Wartości zależą od odmiany i przygotowania.'}</p>}
        {seleniumEstimate&&displayFood.selenium===seleniumEstimate.value&&<p className="food-product-note generic-nutrition-note">Selen oszacowano na podstawie tabel dla produktu ogólnego. <a href={seleniumEstimate.url} target="_blank" rel="noreferrer">Źródło szacunku ↗</a></p>}
        {displayFood.partialNutrients?.length>0&&<p className="food-product-note generic-nutrition-note">Wartości mogą obejmować tylko znaną część składnika. Nie wszystkie użyte etykiety podają pełny skład; brakujących wartości nie liczymy jako zero.</p>}
        <div className="micros-grid">{NUTRIENTS.filter(([key])=>displayFood[key]!=null).map(([key,name,unit])=><div className="micro-item" key={key}><span>{name}</span><strong>{foodNutrientLabel(displayFood,key,scaled[key],2)} {unit}</strong></div>)}</div>
      </details>}
      {(displayFood.fatLessThan||displayFood.upperBoundNutrients?.length>0)&&<p className="help-note fat-bound-note">Dla tego produktu część wartości oznacza górną granicę podaną na etykiecie. Do sumy przyjmujemy tę granicę; kalorie pozostają zgodne z podanymi wartościami. Przy brakach danych pokazujemy znaną część wartości.</p>}
    </form>:
    custom?<form id={formId} onSubmit={saveCustom}><p className="help-note">Podawaj wartości <strong>na {foodBasisLabel({unit:form.unit})} produktu</strong>, zgodnie z etykietą. Możesz uzupełnić również mikroskładniki.</p><div className="field-row"><label className="field"><span>Nazwa produktu *</span><input value={form.name} required maxLength={180} placeholder="np. Moje spaghetti" onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="field"><span>Marka (opcjonalnie)</span><input value={form.brand} maxLength={120} placeholder="np. własny przepis" onChange={e=>setForm({...form,brand:e.target.value})}/></label></div><label className="field"><span>Wartości odżywcze podane na</span><select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}><option value="g">100 g — masa produktu</option><option value="ml">100 ml — objętość napoju</option><option value="tablet">1 tabletka — skład suplementu</option></select></label><div className="nutrient-editor">{[['kcal','Kalorie','kcal'],...MACRO_PRESENTATION.map(m=>[m.key,m.fullName,'g']),...NUTRIENTS.map(([k,n,u])=>[k,n,u])].map(([key,label,unit])=><label className="field" key={key}><span>{label}</span><div className="with-unit"><input type="number" step="any" min="0" max="100000" placeholder="—" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/><span>{unit}</span></div></label>)}</div></form>:
    <><div className="search-field"><Search size={20}/><input autoFocus={allowFieldAutofocus()} value={query} placeholder="Szukaj: jajko, cebula, skyr, marka..." onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="Wyczyść"><X size={17}/></button>}</div><div className="search-meta food-search-meta"><span>{query?'WYNIKI WYSZUKIWANIA':'POPULARNE I TWOJE PRODUKTY'}</span><button className="new-food-button" onClick={()=>setCustom(true)}><Plus size={17}/><span>Własny produkt</span></button></div>{!local&&query.trim().length>=3&&<button className="online-search-button" disabled={busy} onClick={searchOnline}><Search size={16}/>{busy?'Wyszukuję...':'Szukaj też w Open Food Facts'}</button>}{local&&query.length>=3&&<p className="inline-hint">Tryb lokalny: wyszukiwanie online jest dostępne po wdrożeniu do Cloudflare.</p>}{busy&&<p className="inline-hint">Szukam produktów w Open Food Facts...</p>}{remoteError&&<p className="inline-hint">Baza zewnętrzna chwilowo niedostępna. Możesz dodać własny produkt.</p>}<div className="food-results">{options.length?options.map(food=><FoodSearchResult key={food.id} food={food} onSelect={selectFood}/>):<div className="empty-search"><Search size={26}/><strong>Brak pasujących produktów</strong><p>Spróbuj innej nazwy lub dodaj własny produkt.</p></div>}</div><div className="source-note"><Info size={15}/> Własne i podstawowe produkty pozostają dostępne. Dane z Open Food Facts mogą być niepełne — sprawdzaj etykiety.</div></>}
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
function MetricModal({day,current,defaultWeight,onSave,onClose}) {
  const [steps,setSteps]=useState(String(current?.steps||0));
  const [weight,setWeight]=useState(current?.weight == null?'':String(current.weight));
  const [notes,setNotes]=useState(current?.notes||'');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  async function save(e){
    e.preventDefault();
    const invalidWeight=weightError(weight);
    if(invalidWeight){setError(invalidWeight);return;}
    setSaving(true);setError('');
    try{await onSave({day,steps:Math.max(0,Math.round(parseNum(steps))),weight:parseWeight(weight),notes});onClose();}
    catch(err){setError(err.message);}
    finally{setSaving(false);}
  }
  return <Modal title="Dane z dnia" subtitle={dateTitle(day)} onClose={onClose}>
    <form onSubmit={save}>
      <label className="field"><span>Liczba kroków</span><div className="with-unit"><input type="number" min="0" max="200000" step="1" value={steps} onChange={e=>setSteps(e.target.value)}/><span>kroków</span></div></label>
      <WeightInput label="Waga (kg) — jeśli dziś była mierzona" value={weight} defaultWeight={defaultWeight} onChange={value=>{setWeight(value);setError('');}}/>
      <label className="field"><span>Notatka (opcjonalnie)</span><textarea rows="3" maxLength={1000} placeholder="Jak Ci dzisiaj poszło?" value={notes} onChange={e=>setNotes(e.target.value)}/></label>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Anuluj</button><button className="button primary" disabled={saving}>{saving?'Zapisywanie…':'Zapisz dzień'}</button></div>
    </form>
  </Modal>;
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
  const [exportModal,setExportModal]=useState(null);
  const [toast,setToast]=useState('');
  const supplementLocks=useRef(new Set());
  const dailyRef=useRef(data.daily);
  const dailyRefreshId=useRef(0);
  dailyRef.current=data.daily;
  const local=mode==='local';
  const recordedDays=useMemo(()=>new Set([...data.entries,...data.daily,...data.activities].map(record=>record.day)),[data.entries,data.daily,data.activities]);
  const daySwipe=useDaySwipe({day,onChange:setDay,disabled:!['ready','local'].includes(mode)||!!foodModal||activityModal||metricModal||!!exportModal});
  useEffect(()=>{
    let mounted=true;
    (async()=>{try{const r=await api('/session');if(!mounted)return;if(!r.authenticated){setMode('auth');return}const s=await api('/state');if(!mounted)return;setData({...empty,...s,profile:normalizeProfile(s.profile)});setMode('ready');}
      catch(err){if(!mounted)return;if(import.meta.env.DEV){setData(readLocal());setMode('local');}else{setSetupError(err.message);setMode('setup')}}})();
    return()=>{mounted=false};
  },[]);
  useEffect(()=>{if(local)writeLocal(data);},[data,local]);
  // Resume from Garmin Connect or pick up a server-side import while visible.
  // Never replace a newer local edit with a response started before that edit.
  useEffect(()=>{
    if(mode!=='ready')return;
    let active=true,pending=false;
    const refresh=async()=>{
      if(pending||document.visibilityState!=='visible'||document.querySelector('[role="dialog"]'))return;
      pending=true;
      const previous=dailyRef.current,requestId=++dailyRefreshId.current;
      try{const result=await api('/state');if(active)setData(current=>current.daily===previous&&requestId===dailyRefreshId.current?{...current,daily:result.daily}:current);}catch{}finally{pending=false;}
    };
    const visible=()=>{if(document.visibilityState==='visible')refresh();};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);
    const timer=setInterval(refresh,300000);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};
  },[mode]);
  async function refreshGarminDaily(){
    const previous=dailyRef.current,requestId=++dailyRefreshId.current,result=await api('/state');
    setData(current=>current.daily===previous&&requestId===dailyRefreshId.current?{...current,daily:result.daily}:current);
  }
  function notify(text){setToast(text);window.setTimeout(()=>setToast(''),3300);}
  async function reload(){const s=await api('/state');setData({...empty,...s,profile:normalizeProfile(s.profile)});setMode('ready');}
  async function add(kind,record){try{if(!local)await mutate(kind,record);setData(s=>({...s,[kind]:[record,...s[kind].filter(x=>x.id!==record.id)]}));notify('Zapisano ✓');}catch(err){notify('Błąd zapisu: '+err.message);throw err}}
  async function remove(kind,record){try{if(!local)await mutate(kind,null,'DELETE',record.id);setData(s=>({...s,[kind]:s[kind].filter(x=>x.id!==record.id)}));notify('Usunięto wpis');}catch(err){notify('Błąd usuwania: '+err.message)}}
  async function saveDaily(record){try{if(!local)await mutate('daily',record);setData(s=>({...s,daily:[{...s.daily.find(x=>x.day===record.day),...record},...s.daily.filter(x=>x.day!==record.day)]}));notify('Dane dnia zapisane ✓');}catch(err){notify('Błąd zapisu: '+err.message);throw err}}
  async function saveProfile(record){try{if(!local)await mutate('profile',record);setData(s=>({...s,profile:record}));notify('Profil zapisany ✓');}catch(err){notify('Błąd zapisu: '+err.message);throw err}}
  async function adjustSupplement(food,delta){
    const id=supplementLogId(day,food.id);
    if(supplementLocks.current.has(id))return;
    supplementLocks.current.add(id);
    try {
      const current=data.entries.find(entry=>entry.id===id);
      const quantity=Math.max(0,(current?.grams||0)+delta);
      if(!quantity){
        if(!current)return;
        if(!local)await mutate('entries',null,'DELETE',id);
        setData(previous=>({...previous,entries:previous.entries.filter(entry=>entry.id!==id)}));
      }else{
        const record={id,day,meal:'supplements',grams:quantity,food:current?.food||food};
        if(!local)await mutate('entries',record);
        setData(previous=>({...previous,entries:[record,...previous.entries.filter(entry=>entry.id!==id)]}));
      }
    }finally{supplementLocks.current.delete(id);}
  }
  function exportData(){const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`forma-backup-${localDay()}.json`;anchor.click();URL.revokeObjectURL(url);}
  async function logout(){try{await api('/logout',{method:'POST'});}catch{}setMode('auth');setData(empty);}
  const todayEntries=useMemo(()=>data.entries.filter(x=>x.day===day),[data.entries,day]);
  const todayActs=useMemo(()=>data.activities.filter(x=>x.day===day),[data.activities,day]);
  const metrics=data.daily.find(x=>x.day===day)||{day,steps:0,weight:null,notes:''};
  const weights=data.daily.filter(d=>d.weight!=null&&d.day<=day).sort((a,b)=>a.day.localeCompare(b.day));
  const weightTrend=useMemo(()=>buildWeightTrend(data.daily,day),[data.daily,day]);
  const weight=weights.at(-1)?.weight||data.profile.startWeight;
  const goal=calcTargets(data.profile,weight);
  const nutrition=useMemo(()=>sumNutrition(todayEntries),[todayEntries]);
  const eaten=nutrition.totals.kcal||0;
  const movement=calcDailyMovement(metrics.steps||0,todayActs,metrics.garminActiveKcal);
  const {workout,stepsBurn,total:extra}=movement;
  const garminCalories=movement.source==='garmin';
  const {budget}=calcDailyBalance(goal,eaten,extra);
  const start=data.profile.startWeight,target=data.profile.targetWeight;
  const progress=start===target?100:Math.min(100,Math.max(0,(start-weight)/(start-target)*100));
  const weeks=recentEnergyDays({entries:data.entries,daily:data.daily,activities:data.activities,day});
  const loggedDays=weeks.filter(d=>d.net!=null);
  const mean=loggedDays.length?sum(loggedDays,'net')/loggedDays.length:0;
  if(mode==='loading')return <div className="loading-screen"><div className="brand-mark"><Leaf/></div><p>Ładuję dziennik...</p></div>;
  if(mode==='auth'||mode==='setup')return <Login onLogin={reload} setupError={mode==='setup'?setupError:null}/>;
  return <div className="app-layout"><aside className="sidebar"><div className="sidebar-brand"><span className="brand-mark"><Leaf size={25}/></span><span>forma<span className="brand-point">.</span><small>TWÓJ DOBRY RYTM</small></span></div><div className="sidebar-nav-label">MENU GŁÓWNE</div><nav className="sidebar-nav">{nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}><Icon size={20}/>{item.label}{view===item.id&&<span className="nav-mark"/>}</button>})}</nav><div className="sidebar-bottom"><div className="sidebar-goal"><span className="goal-symbol"><Target size={20}/></span><small>TWÓJ CEL</small><h3>{formatWeight(target)} kg</h3><div className="goal-meter"><span style={{width:`${progress}%`}}/></div><p>Jeszcze {formatWeight(Math.max(0,weight-target))} kg do celu</p></div><div className="sidebar-profile"><div className="profile-avatar">F</div><div><strong>Mój dziennik</strong><small>{local?'Tryb lokalny':'Prywatne konto'}</small></div><MoreHorizontal size={18}/></div></div></aside>
    <main className="main" {...daySwipe}><Topline day={day} setDay={setDay} view={view} recordedDays={recordedDays}/>{local&&<div className="demo-banner"><Info size={16}/> Tryb lokalny — zapis tylko w tej przeglądarce. W Cloudflare dane będą synchronizowane przez D1.</div>}
      {view==='dashboard'&&<>
        <DailyBalance nutrition={nutrition} goal={goal} budget={budget} movement={extra} movementSource={movement.source} onDetails={()=>setView('progress')}/>
        <section className="dashboard-meals"><SectionTitle title="Dziennik posiłków" subtitle={dateTitle(day)} action={<button className="button primary compact" onClick={()=>setFoodModal({meal:'breakfast'})}><Plus size={17}/> Dodaj jedzenie</button>}/><div className="meals-grid">{MEALS.map(m=><MealCard key={m.id} meal={m} entries={todayEntries.filter(e=>e.meal===m.id)} onAdd={id=>setFoodModal({meal:id})} onEdit={entry=>setFoodModal({editing:entry})} onRemove={e=>remove('entries',e)}/>)}</div><NutritionExportButton onClick={()=>setExportModal({period:'day'})}/></section>
        <div className="daily-tools">
          <SupplementPanel compact plan={data.profile.supplementPlan} onSettings={()=>setView('settings')} entries={data.entries} personal={data.foods} day={day} onAdjust={adjustSupplement} onOpen={()=>setView('supplements')}/>
          <WeightSummary weight={weight} start={start} target={target} trend={weightTrend} onMeasure={()=>setMetricModal(true)}/>
        </div>
        <div className="content-grid dashboard-extras"><div className="panel activity-summary"><SectionTitle title="Ruch & spalanie" action={<button className="round-add" onClick={()=>setActivityModal(true)} aria-label="Dodaj trening"><Plus size={18}/></button>}/><div className="step-summary"><IconBadge Icon={Footprints} color="blue"/><div><span>Dzisiejsze kroki</span><strong>{fmt(metrics.steps)}</strong></div><button className="light-link" onClick={()=>setMetricModal(true)}>Zmień</button></div><div className="step-goal"><div className="meter"><div style={{width:`${percent(metrics.steps,10000)}%`,background:'var(--blue)'}}/></div><small>{fmt(metrics.steps)} / 10 000 kroków</small></div><div className="burn-breakdown">{garminCalories?<div><span><Flame size={16}/> Kalorie aktywne z Garmin</span><b>{fmt(extra)} kcal</b></div>:<><div><span><Footprints size={16}/> Kroki ponad bazę</span><b>{fmt(stepsBurn)} kcal</b></div><div><span><Dumbbell size={16}/> Treningi</span><b>{fmt(workout)} kcal</b></div></>}</div><p className="activity-budget-note">{garminCalories?'Suma z Garmin obejmuje ruch i treningi. Ich kalorii nie doliczamy ponownie.':'Zapisany ruch zwiększa dzisiejszy cel kalorii.'}</p><button className="subtle-full-button" onClick={()=>setActivityModal(true)}><Plus size={16}/> Dodaj trening</button></div><div className="panel week-panel"><SectionTitle title="Ostatnie 7 dni" subtitle="Zjedzone kalorie minus ruch"/><WeekChart days={weeks} goal={goal.calories}/><div className="week-foot"><span>Średni bilans dni z danymi</span><strong>{loggedDays.length?`${fmt(mean)} kcal`:'Brak wpisów'}</strong></div></div></div>
        <div className="panel micros-panel"><SectionTitle title="Mikroskładniki i błonnik" subtitle="Wartości policzone tylko na podstawie dostępnych danych o produktach." action={<span className="soft-badge neutral">NA {dateTitle(day).split(', ')[1]?.toUpperCase()}</span>}/><DailyNutrientPreview summary={nutrition}/><p className="muted-note"><Info size={15}/> „—” oznacza brak danych, nie zero. Suma może być zaniżona, jeśli część produktów nie zawiera informacji o danym składniku.</p></div></>}
      {view==='supplements'&&<SupplementsPage plan={data.profile.supplementPlan} onSettings={()=>setView('settings')} entries={data.entries} personal={data.foods} day={day} onAdjust={adjustSupplement} onSave={food=>add('foods',food)}/>}
      {view==='foods'&&<><div className="feature-intro panel"><div className="feature-icon"><Search size={26}/></div><div><h2>Wpisuj produkty tak, jak Ci wygodnie.</h2><p>Wybierz produkt ze swojej listy, podaj ilość w gramach lub mililitrach albo zapisz własny produkt z etykiety.</p></div><button className="button primary" onClick={()=>setFoodModal({meal:'breakfast'})}><Plus size={18}/> Dodaj jedzenie</button></div><HomemadeFoodsPanel onSelect={item=>setFoodModal({meal:'breakfast',food:item})}/><FavoriteFoodsPanel onSelect={item=>setFoodModal({meal:'breakfast',food:item})}/><div className="panel own-foods-panel"><SectionTitle title="Twoje produkty" subtitle="Dodane ręcznie pozycje — zawsze pod ręką." action={<button className="button outline compact" onClick={()=>setFoodModal({meal:'breakfast'})}><Plus size={17}/> Nowy wpis</button>}/>{data.foods.filter(f=>!isSupplement(f)).length?<div className="food-list">{data.foods.filter(f=>!isSupplement(f)).map(f=><div className="own-row" key={f.id}><FoodRow food={f} onClick={item=>setFoodModal({meal:'breakfast',food:item})}/><button className="remove-button" title="Usuń produkt" onClick={()=>remove('foods',f)}><Trash2 size={17}/></button></div>)}</div>:<div className="empty-state"><IconBadge Icon={Leaf}/><h3>Jeszcze nie ma własnych produktów</h3><p>Dodaj produkt z etykiety, a pojawi się tutaj.</p></div>}</div><div className="panel"><SectionTitle title="Podstawowa baza" subtitle="45 produktów ze zdjęciami — orientacyjne wartości na 100 g."/><div className="food-catalog">{BASE_FOODS.map(f=><FoodRow key={f.id} food={f} onClick={item=>setFoodModal({meal:'breakfast',food:item})}/>)}</div></div><p className="attribution">Dodatkowe wyszukiwanie produktów: <a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">Open Food Facts</a> (ODbL). Sprawdzaj informacje na opakowaniu.</p></>}
      {view==='activity'&&<><div className="activity-stats"><div className="stat-panel panel"><IconBadge Icon={Footprints} color="blue"/><span>Kroki</span><strong>{fmt(metrics.steps)}</strong><small>cel pomocniczy 10 000</small></div><div className="stat-panel panel"><IconBadge Icon={Dumbbell} color="purple"/><span>Trening</span><strong>{fmt(workout)} <small>kcal</small></strong><small>{todayActs.length} aktywności</small></div><div className="stat-panel panel"><IconBadge Icon={Flame} color="sun"/><span>{garminCalories?'Kalorie aktywne':'Szacowany ruch'}</span><strong>{fmt(extra)} <small>kcal</small></strong><small>{garminCalories?'Garmin Connect':'zwiększa dzisiejszy cel'}</small></div></div><div className="panel activity-input-panel"><SectionTitle title="Zapisz swoją aktywność" subtitle="Uzupełnij kroki i treningi z zegarka, telefonu lub notatek."/><div className="activity-actions"><button className="action-tile" onClick={()=>setMetricModal(true)}><IconBadge Icon={Footprints} color="blue"/><strong>Wpisz kroki / wagę</strong><span>Aktualizuj dzień <ArrowRight size={15}/></span></button><button className="action-tile" onClick={()=>setActivityModal(true)}><IconBadge Icon={Dumbbell} color="purple"/><strong>Dodaj trening</strong><span>Siłownia, bieg, rower... <ArrowRight size={15}/></span></button></div></div><div className="panel"><SectionTitle title="Treningi z tego dnia" subtitle={dateTitle(day)} action={<button className="button outline compact" onClick={()=>setActivityModal(true)}><Plus size={17}/> Dodaj</button>}/>{todayActs.length?todayActs.map(a=>{const meta=ACTIVITY_TYPES.find(t=>t.id===a.type);const Icon=activityIcons[a.type]||Flame;return <div className="activity-entry" key={a.id}><IconBadge Icon={Icon} color="blue"/><div><strong>{meta?.name||'Trening'}</strong><span>{fmt(a.minutes)} min {a.distance>0?`— ${fmt(a.distance,1)} km`:''}</span></div><b>{fmt(a.kcal)} kcal</b><button className="remove-button" onClick={()=>remove('activities',a)} aria-label="Usuń trening"><Trash2 size={17}/></button></div>}):<div className="empty-state"><IconBadge Icon={Activity}/><h3>Brak treningów w tym dniu</h3><p>Dodaj sesję na siłowni lub bieganie, a uwzględnimy szacunkowe spalanie.</p></div>}</div><p className="small muted activity-tip"><Info size={16}/> {garminCalories?'Do celu dodajemy kalorie aktywne z Garmin Connect. Ta suma obejmuje codzienny ruch i treningi; zapisane tutaj aktywności pozostają w dzienniku, ale ich kalorii nie dodajemy ponownie.':'Do bazowego celu dodajemy szacowane kalorie z zapisanych kroków i treningów. Pierwsze 3000 kroków pomijamy w szacunku ruchu, a oznaczone kroki z biegu i spaceru odejmujemy od krokomierza.'}</p></>}
      {view==='progress'&&<><NutritionStats entries={data.entries} daily={data.daily} profile={data.profile} day={day} activities={data.activities} onChangeDay={setDay} onExport={period=>setExportModal({period})}/><SectionTitle title="Twoja waga i postępy" subtitle="Pomiary z dziennika."/><div className="progress-stats"><div className="stat-panel panel"><IconBadge Icon={Weight}/><span>Aktualna waga</span><strong>{formatWeight(weight)} <small>kg</small></strong><small>Cel {formatWeight(target)} kg</small></div><div className="stat-panel panel"><IconBadge Icon={TrendingDown} color="blue"/><span>Zmiana od początku</span><strong>{start-weight>0?'-':start-weight<0?'+':''}{formatWeight(Math.abs(start-weight))} <small>kg</small></strong><small>Start {formatWeight(start)} kg</small></div><div className="stat-panel panel"><IconBadge Icon={Target} color="sun"/><span>Do celu</span><strong>{formatWeight(Math.max(0,weight-target))} <small>kg</small></strong><small>{fmt(progress)}% drogi</small></div></div><div className="panel"><SectionTitle title="Historia wagi" subtitle="Twoje pomiary na osi czasu." action={<button className="button primary compact" onClick={()=>setMetricModal(true)}><Plus size={17}/> Dodaj pomiar</button>}/><WeightTrendChart trend={weightTrend}/></div><div className="panel"><SectionTitle title="Bilans kalorii — 7 dni" subtitle="Zjedzone kalorie po odjęciu ruchu w każdym dniu."/><WeekChart days={weeks} goal={goal.calories}/></div><div className="panel"><SectionTitle title="Ostatnie pomiary" subtitle="Zapisane dane wagowe."/>{weights.length?<div className="measure-list">{weights.slice(-12).reverse().map(w=><div key={w.day}><span>{dateTitle(w.day)}</span><strong>{formatWeight(w.weight)} kg</strong></div>)}</div>:<div className="empty-state"><p>Nie zapisano jeszcze żadnej wagi.</p></div>}</div></>}
      {view==='settings'&&<SettingsPage personal={data.foods} currentWeight={weights.at(-1)?.weight} profile={data.profile} onSave={saveProfile} onExport={exportData} local={local} onLogout={logout} day={day} onGarminSynced={refreshGarminDaily}/>}
      <footer className="app-footer">Forma © 2026 — Twoje tempo. Twoja droga. <span>Wskazania kalorii i aktywności są orientacyjne.</span></footer>
    </main><nav className="mobile-nav">{nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}><Icon size={22}/><small>{item.label}</small></button>})}</nav>
    {foodModal&&<FoodModal day={day} personal={data.foods} editing={foodModal.editing||null} initialMeal={foodModal.meal||'breakfast'} initialFood={foodModal.food||null} local={local} onClose={()=>setFoodModal(null)} onAdd={record=>add('entries',record)} onSaveFood={record=>add('foods',record)} onDeleteFood={record=>remove('foods',record)}/>}
    {activityModal&&<ActivityModal day={day} weight={weight} onClose={()=>setActivityModal(false)} onSave={record=>add('activities',record)}/>}
    {metricModal&&<MetricModal day={day} current={metrics} defaultWeight={weight} onClose={()=>setMetricModal(false)} onSave={saveDaily}/>}
    {exportModal&&<NutritionExportModal entries={data.entries} daily={data.daily} activities={data.activities} profile={data.profile} day={day} initialPeriod={exportModal.period} onClose={()=>setExportModal(null)}/>}
    {toast&&<div className="toast" role="status"><Check size={17}/>{toast}</div>}
  </div>;
}
export default App;
