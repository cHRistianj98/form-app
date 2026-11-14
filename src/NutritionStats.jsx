import React, {useMemo,useState} from 'react';
import {BarChart3,ChevronLeft,ChevronRight,Info} from 'lucide-react';
import {fmt,localDay,shiftDay} from './foods.js';
import {DAILY_REFERENCES,MINERAL_KEYS,NUTRIENTS,REFERENCE_SOURCES,VITAMIN_KEYS} from './nutrients.js';
import {calendarWeek,nutritionReport,totalLabel} from './nutritionStats.js';
import {GENERIC_NUTRITION_SOURCE} from './genericNutrition.js';
import './nutrition-stats.css';

const MACROS=[
  {key:'kcal',name:'Kalorie',unit:'kcal',color:'#b8ed87'},
  {key:'protein',name:'Białko',unit:'g',color:'#a49bff'},
  {key:'fat',name:'Tłuszcze',unit:'g',color:'#efa6b1'},
  {key:'carbs',name:'Węglowodany',unit:'g',color:'#efc17b'},
];
const shortDate=day=>new Date(day+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short'});
const ratio=(value,goal)=>value==null||!goal?null:value/goal*100;

function Coverage({summary,nutrient}) {
  const c=summary.coverage[nutrient];
  if (!c.total) return <span className="nutrition-coverage">Brak wpisów</span>;
  if (!c.known) return <span className="nutrition-coverage">Brak danych · {c.total} wpisów</span>;
  return <span className={`nutrition-coverage ${c.complete?'complete':''}`}>Dane: {c.known}/{c.total} wpisów{!c.complete?' · suma częściowa':''}</span>;
}

function NutrientRows({title,subtitle,keys,report}) {
  return <section className="panel nutrition-reference-panel">
    <div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
    <div className="nutrition-table" role="table" aria-label={title}>
      <div className="nutrition-table-heading" role="row"><span role="columnheader">Składnik / znana suma</span><span role="columnheader">Odniesienie</span><span role="columnheader">Realizacja</span></div>
      {keys.map(key=>{
        const [,name,unit]=NUTRIENTS.find(n=>n[0]===key);
        const reference=DAILY_REFERENCES[key];
        const goal=reference.value*report.dayCount;
        const value=report.summary.totals[key];
        const percent=ratio(value,goal);
        const partial=!report.summary.coverage[key].complete;
        return <div className="nutrition-table-row" role="row" key={key} data-nutrient={key}>
          <div role="cell"><strong>{name}</strong><b>{totalLabel(report.summary,key,2)}{value!=null?` ${unit}`:''}</b><Coverage summary={report.summary} nutrient={key}/>
            {report.period==='week'&&value!=null&&<small>Śr. znana: {totalLabel(report.summary,key,2,report.loggedDays)} {unit}/dzień z wpisami</small>}
          </div>
          <div role="cell"><b>{fmt(goal,2)} {unit}</b><small>{reference.source}{report.period==='week'?' × 7':''}</small></div>
          <div role="cell"><b>{percent==null?'—':`${partial?'≈ ':''}${fmt(percent)}%`}</b><div className="meter"><div style={{width:`${Math.min(percent||0,100)}%`,background:'#85c6ab'}}/></div></div>
        </div>;
      })}
    </div>
  </section>;
}

function WeekMacroChart({report,metric,setMetric}) {
  const meta=MACROS.find(item=>item.key===metric);
  const points=report.days.map(d=>{
    const goal=d.goal[metric==='kcal'?'calories':metric];
    return {...d,goal,value:d.summary.totals[metric],percent:ratio(d.summary.totals[metric],goal)};
  });
  const max=Math.max(115,...points.map(p=>p.percent||0))*1.08;
  return <section className="panel nutrition-chart-panel">
    <div className="section-heading"><div><h2>Jak wyglądał tydzień?</h2><p>Każdy dzień względem Twojego dziennego celu.</p></div></div>
    <div className="nutrition-chart-tabs" aria-label="Składnik na wykresie">{MACROS.map(m=><button key={m.key} onClick={()=>setMetric(m.key)} aria-pressed={m.key===metric} className={metric===m.key?'active':''}>{m.name}</button>)}</div>
    <div className="nutrition-week-chart" role="img" aria-label={`${meta.name}: dzienna realizacja celu w tygodniu`}>
      <div className="nutrition-chart-plot">
      <div className="nutrition-chart-goal" style={{bottom:`${100/max*100}%`}}><span>100% celu</span></div>
      {points.map(point=><div key={point.day} className={`nutrition-day-column ${point.future?'future':''}`}>
        <div className="nutrition-day-bar" title={`${point.day}: ${point.future?'przyszły dzień':point.value==null?'brak danych':`${totalLabel(point.summary,metric)} ${meta.unit} / ${fmt(point.goal)} ${meta.unit}`}`}>
          {point.percent!=null?<div className="nutrition-day-fill" style={{height:`${point.percent/max*100}%`,background:meta.color}}><span>{!point.summary.coverage[metric].complete||point.summary.coverage[metric].upper?'≈ ':''}{fmt(point.percent)}%</span></div>:<span className="nutrition-day-empty">—</span>}
        </div>
      </div>)}
      </div>
      <div className="nutrition-chart-labels">{points.map(point=><div key={point.day} className={point.future?'future':''}><span>{new Date(point.day+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'short'}).replace('.','')}</span><small>{point.future?'przed Tobą':point.summary.entryCount?'zapisano':'brak wpisów'}</small></div>)}</div>
    </div>
    <p className="muted-note"><Info size={14}/> Słupki pokazują znane wartości. Niepełne etykiety mogą zaniżać wynik. Brak wpisów lub danych oznaczamy kreską.</p>
  </section>;
}

export default function NutritionStats({entries,daily,profile,day,onChangeDay}) {
  const [period,setPeriod]=useState('day');
  const [metric,setMetric]=useState('protein');
  const today=localDay();
  const report=useMemo(()=>nutritionReport({entries,daily,profile,day,period,today}),[entries,daily,profile,day,period,today]);
  const week=useMemo(()=>period==='week'?report:nutritionReport({entries,daily,profile,day,period:'week',today}),[entries,daily,profile,day,period,today,report]);
  return <div className="nutrition-stats">
    <section className="panel nutrition-period-panel">
      <div><span className="nutrition-eyebrow"><BarChart3 size={15}/> TWÓJ BILANS</span><h2>{period==='day'?'Podsumowanie dnia':'Podsumowanie tygodnia'}</h2><p>{shortDate(report.from)}{period==='week'?` – ${shortDate(report.to)}`:''} · {report.summary.entryCount} wpisów{period==='week'?` · ${report.loggedDays}/7 dni z wpisami`:''}</p></div>
      <div className="nutrition-period-switch" aria-label="Okres statystyk"><button onClick={()=>setPeriod('day')} aria-pressed={period==='day'}>Dzień</button><button onClick={()=>setPeriod('week')} aria-pressed={period==='week'}>Tydzień</button></div>
    </section>
    {period==='week'&&onChangeDay&&<div className="nutrition-week-nav"><button className="button ghost compact" onClick={()=>onChangeDay(shiftDay(report.from,-7))}><ChevronLeft size={16}/> Poprzedni tydzień</button><button className="button ghost compact" disabled={report.from>=calendarWeek(today)[0]} onClick={()=>onChangeDay(shiftDay(report.from,7))}>Następny tydzień <ChevronRight size={16}/></button></div>}
    {!report.summary.entryCount&&<div className="nutrition-empty"><Info size={18}/><span>Brak wpisów w tym okresie. Dodaj posiłek lub suplement, żeby zobaczyć podsumowanie.</span></div>}
    <div className="nutrition-macro-grid">{MACROS.map(m=>{
      const value=report.summary.totals[m.key],goal=report.goals[m.key];
      const percent=ratio(value,goal);
      return <section className="panel nutrition-macro-card" key={m.key} style={{'--metric-color':m.color}} data-macro={m.key}>
        <span className="nutrition-metric-name"><i/>{m.name}</span>
        <strong>{totalLabel(report.summary,m.key,m.key==='kcal'?0:1)}<small>{value!=null?m.unit:''}</small></strong>
        <p>Cel {period==='week'?'7 dni':'dnia'}: {fmt(goal)} {m.unit}</p>
        <div className="meter"><div style={{width:`${Math.min(percent||0,100)}%`,background:m.color}}/></div>
        <span className="nutrition-percent">{percent==null?'—':`${!report.summary.coverage[m.key].complete||report.summary.coverage[m.key].upper?'≈ ':''}${fmt(percent)}% celu`}</span>
        <Coverage summary={report.summary} nutrient={m.key}/>
        {period==='week'&&value!=null&&<small className="nutrition-average">Śr. znana: {totalLabel(report.summary,m.key,m.key==='kcal'?0:1,report.loggedDays)} {m.unit}/dzień z wpisami</small>}
      </section>;
    })}</div>
    {period==='week'&&<p className="nutrition-period-note">Plan tygodnia obejmuje 7 dni. Minęło {report.elapsedDays}/7 dni, zapisano {report.loggedDays}/7. Średnia uwzględnia dni z wpisami; nie oznacza pełnego spożycia, jeśli etykiety lub dziennik są niepełne.</p>}
    <WeekMacroChart report={week} metric={metric} setMetric={setMetric}/>
    {report.summary.genericEntryCount>0&&<p className="nutrition-period-note generic-nutrition-summary">Produkty ogólne: {report.summary.genericEntryCount} wpisów. Witaminy i minerały obejmują szacunki z <a href={GENERIC_NUTRITION_SOURCE.url} target="_blank" rel="noreferrer">USDA FoodData Central ↗</a>, również dla brakujących danych we wcześniejszych wpisach. Dane z etykiet pozostają zachowane.</p>}
    <NutrientRows title="Witaminy" subtitle="Dane z etykiet i tabel składu żywności względem RWS dla dorosłych." keys={VITAMIN_KEYS} report={report}/>
    <div className="nutrition-reference-grid">
      <NutrientRows title="Błonnik, cukry, nasycone i sól" subtitle="Porównanie do wartości referencyjnych, nie cele do uzupełnienia." keys={['fiber','sugars','saturatedFat','salt']} report={report}/>
      <NutrientRows title="Składniki mineralne" subtitle="Znane ilości z jedzenia i suplementów." keys={MINERAL_KEYS} report={report}/>
    </div>
    <details className="panel nutrition-explanation"><summary>Jak czytać dane i normy?</summary><p>Kalorie, białko, tłuszcze i węglowodany porównujemy z Twoim planem z ustawień, uwzględniając ostatnią zapisaną wagę do danego dnia. Zmiana ustawień profilu zmienia odniesienie również dla historii.</p><p>Witaminy i minerały odnosimy do RWS UE dla dorosłych. To wartości odniesienia z etykiet, a nie indywidualna ocena zapotrzebowania ani górny bezpieczny limit. Dla witaminy D RWS z etykiet wynosi 5 µg; nie jest to zalecana dawka suplementacji. Błonnik porównujemy do 25 g/dzień (EFSA). Cukry ogółem, nasycone i sól mają etykietowe odniesienie dla 2000 kcal; cukry ogółem nie są tym samym co cukry wolne.</p><p>Produkty ogólne korzystają z orientacyjnych tabel USDA SR Legacy (2018), dopasowanych do postaci produktu. Uzupełniamy wyłącznie brakujące składniki, także przy obliczaniu starszych wpisów; zapisane kalorie, makro i znane wartości pozostają zachowane. Produkty markowe i własne korzystają ze swoich etykiet. Nieznanych składników, np. biotyny niepodanej w tabeli, nie zastępujemy zerem. Witaminę A z USDA przeliczamy na europejskie równoważniki retinolu (RE), a B3 na równoważniki niacyny (NE).</p><p>W tygodniu wartości odniesienia mnożymy przez 7. Niepełne dane pokazujemy jako częściową sumę (≥), a brak wszystkich danych jako „—”. Znak &lt; zachowuje górną granicę z etykiety; przy połączeniu granicy i braków używamy ≈. Puste dni nie świadczą o zerowym spożyciu. Procenty dla częściowych danych są przybliżone; nie potwierdzają niedoborów ani pełnego pokrycia potrzeb.</p><div className="nutrition-sources">{[...REFERENCE_SOURCES,GENERIC_NUTRITION_SOURCE].map(s=><a href={s.url} key={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a>)}</div></details>
  </div>;
}

export function DailyNutrientPreview({summary}) {
  return <>{summary.genericEntryCount>0&&<p className="muted-note">Produkty ogólne uwzględniają szacunki z <a href={GENERIC_NUTRITION_SOURCE.url} target="_blank" rel="noreferrer">USDA FoodData Central ↗</a>.</p>}<div className="micros-grid">{NUTRIENTS.map(([key,name,unit])=>{
    const value=summary.totals[key],reference=DAILY_REFERENCES[key];
    return <div className="micro-item" key={key}><span>{name}</span><strong>{totalLabel(summary,key,2)}{value!=null?` ${unit}`:''}</strong><small>{value==null?'Brak danych':`${summary.coverage[key].complete?'':'≈ '}${fmt(value/reference.value*100)}% · ${reference.source}`}</small></div>;
  })}</div></>;
}
