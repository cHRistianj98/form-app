import React, {useMemo,useState} from 'react';
import {BarChart3,ChevronLeft,ChevronRight,Info} from 'lucide-react';
import {fmt,localDay,shiftDay} from './foods.js';
import {DAILY_REFERENCES,MINERAL_KEYS,NUTRIENTS,REFERENCE_SOURCES,SUPPLEMENT_COMPONENT_KEYS,VITAMIN_KEYS} from './nutrients.js';
import {calendarWeek,nutritionReport} from './nutritionStats.js';
import {displayTotal as totalLabel} from './nutritionDisplay.js';
import {GENERIC_NUTRITION_SOURCES} from './genericNutrition.js';
import {MACRO_PRESENTATION} from './macroPresentation.js';
import ProgressRing from './ProgressRing.jsx';
import {NutritionExportButton} from './NutritionExportModal.jsx';
import {REFERENCE_LIMITS} from './progressPresentation.js';
import IntakeAlerts from './IntakeAlerts.jsx';
import {ADULT_UPPER_LIMITS,LIMIT_STATUS_LABELS,UL_SOURCE} from './intakeAlerts.js';
import './nutrition-stats.css';

const MACROS=[
  {key:'kcal',name:'Kalorie',unit:'kcal',color:'var(--accent)'},
  ...MACRO_PRESENTATION.map(m=>({...m,unit:'g'})),
];
const shortDate=day=>new Date(day+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short'});
const ratio=(value,goal)=>value==null||!goal?null:value/goal*100;

function Coverage({summary,nutrient}) {
  const c=summary.coverage[nutrient];
  if (!c.total) return <span className="nutrition-coverage">Brak wpisów</span>;
  if (!c.known) return <span className="nutrition-coverage">Brak danych — {c.total} wpisów</span>;
  return <span className={`nutrition-coverage ${c.complete?'complete':''}`}>Dane: {c.known}/{c.total} wpisów{!c.complete?' — suma częściowa':''}</span>;
}

function NutrientRing({summary,nutrient,name,target,intake}) {
  const {complete,upper}=summary.coverage[nutrient];
  const mode=REFERENCE_LIMITS.has(nutrient)?'reference-cap':intake?'daily-reference':'reference';
  const intakeLimit=ADULT_UPPER_LIMITS[nutrient]?.supplementsOnly?undefined:intake?.limitReadings[nutrient];
  return <ProgressRing value={summary.totals[nutrient]} target={target} label={name} mode={mode} partial={!complete} upper={upper} intakeLimit={intakeLimit}/>;
}

function LimitStatus({reading}) {
  if(!reading?.status)return null;
  return <small className="nutrient-limit-status" data-ul-status={reading.status}>{LIMIT_STATUS_LABELS[reading.status]}</small>;
}

function SupplementLimit({reading,limit,unit}) {
  const amount=reading?(`${reading.total>reading.knownMinimum?'do ':''}${fmt(reading.total,2)} / `):'';
  return <small>UL suplementów {amount}{fmt(limit,2)} {unit}</small>;
}

function NutrientRows({title,subtitle,keys,report}) {
  const intake=report.period==='day'?report.days[0].intake:null;
  return <section className="panel nutrition-reference-panel">
    <div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
    <div className="nutrition-table" role="table" aria-label={title}>
      <div className="nutrition-table-heading" role="row"><span role="columnheader">Składnik / znana suma</span><span role="columnheader">Odniesienie i UL</span><span role="columnheader">% odniesienia</span></div>
      {keys.map(key=>{
        const [,name,unit]=NUTRIENTS.find(n=>n[0]===key);
        const reference=DAILY_REFERENCES[key];
        const limit=ADULT_UPPER_LIMITS[key];
        const goal=reference.value*report.dayCount;
        const value=report.summary.totals[key];
        const reading=intake?.limitReadings[key];
        return <div className="nutrition-table-row" role="row" key={key} data-nutrient={key}>
          <div role="cell"><strong>{name}</strong><b>{totalLabel(report.summary,key,2)}{value!=null?` ${unit}`:''}</b><Coverage summary={report.summary} nutrient={key}/>
            {report.period==='week'&&value!=null&&<small>Śr. znana: {totalLabel(report.summary,key,2,report.loggedDays)} {unit}/dzień z wpisami</small>}
          </div>
          <div role="cell"><b>{fmt(goal,2)} {unit}</b><small>{reference.source}{report.period==='week'?' × 7':''}</small>
            {limit&&(limit.supplementsOnly&&intake?<SupplementLimit reading={reading} limit={limit.value} unit={unit}/>:
              <small className="nutrition-ul">UL {fmt(limit.value,2)} {unit}/dzień{limit.supplementsOnly?' (z suplementów)':''}</small>)}
          </div>
          <div role="cell"><NutrientRing summary={report.summary} nutrient={key} name={name} target={goal} intake={intake}/><LimitStatus reading={reading}/></div>
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
          {point.percent!=null?<div className="nutrition-day-fill" style={{height:`${point.percent/max*100}%`,background:meta.color}}><span>{fmt(point.percent)}%</span></div>:<span className="nutrition-day-empty">—</span>}
        </div>
      </div>)}
      </div>
      <div className="nutrition-chart-labels">{points.map(point=><div key={point.day} className={point.future?'future':''}><span>{new Date(point.day+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'short'}).replace('.','')}</span><small>{point.future?'przed Tobą':point.summary.entryCount?'zapisano':'brak wpisów'}</small></div>)}</div>
    </div>
    <p className="muted-note"><Info size={14}/> Słupki pokazują znane wartości. Niepełne etykiety mogą zaniżać wynik. Brak wpisów lub danych oznaczamy kreską.</p>
  </section>;
}

export default function NutritionStats({entries,daily,activities=[],profile,day,onChangeDay,onExport}) {
  const [period,setPeriod]=useState('day');
  const [metric,setMetric]=useState('protein');
  const today=localDay();
  const report=useMemo(()=>nutritionReport({entries,daily,activities,profile,day,period,today}),[entries,daily,activities,profile,day,period,today]);
  const week=useMemo(()=>period==='week'?report:nutritionReport({entries,daily,activities,profile,day,period:'week',today}),[entries,daily,activities,profile,day,period,today,report]);
  return <div className="nutrition-stats">
    <section className="panel nutrition-period-panel">
      <div><span className="nutrition-eyebrow"><BarChart3 size={15}/> TWÓJ BILANS</span><h2>{period==='day'?'Podsumowanie dnia':'Podsumowanie tygodnia'}</h2><p>{shortDate(report.from)}{period==='week'?` – ${shortDate(report.to)}`:''} — {report.summary.entryCount} wpisów{period==='week'?` — ${report.loggedDays}/7 dni z wpisami`:''}</p></div>
      <div className="nutrition-period-actions"><div className="nutrition-period-switch" aria-label="Okres statystyk"><button onClick={()=>setPeriod('day')} aria-pressed={period==='day'}>Dzień</button><button onClick={()=>setPeriod('week')} aria-pressed={period==='week'}>Tydzień</button></div>{onExport&&<NutritionExportButton compact onClick={()=>onExport(period)}/>}</div>
    </section>
    {period==='week'&&onChangeDay&&<div className="nutrition-week-nav"><button className="button ghost compact" onClick={()=>onChangeDay(shiftDay(report.from,-7))}><ChevronLeft size={16}/> Poprzedni tydzień</button><button className="button ghost compact" disabled={report.from>=calendarWeek(today)[0]} onClick={()=>onChangeDay(shiftDay(report.from,7))}>Następny tydzień <ChevronRight size={16}/></button></div>}
    {!report.summary.entryCount&&<div className="nutrition-empty"><Info size={18}/><span>Brak wpisów w tym okresie. Dodaj posiłek lub suplement, żeby zobaczyć podsumowanie.</span></div>}
    <div className="nutrition-macro-grid">{MACROS.map(m=>{
      const value=report.summary.totals[m.key],goal=report.goals[m.key];
      const percent=ratio(value,goal);
      return <section className="panel nutrition-macro-card" key={m.key} style={{'--metric-color':m.color}} data-macro={m.key}>
        <span className="nutrition-metric-name"><span>{m.name}</span><ProgressRing value={value} target={goal} label={m.name} mode={m.key==='kcal'?'limit':'goal'} partial={!report.summary.coverage[m.key].complete} upper={report.summary.coverage[m.key].upper}/></span>
        <strong>{totalLabel(report.summary,m.key,m.key==='kcal'?0:1)}<small>{value!=null?m.unit:''}</small></strong>
        {m.key==='kcal'?<><p>Cel bazowy {fmt(report.baseCalories)} kcal</p><p>Cel z ruchem {fmt(goal)} kcal</p></>:<p>Cel {period==='week'?'7 dni':'dnia'}: {fmt(goal)} {m.unit}</p>}
        <div className="meter"><div style={{width:`${Math.min(percent||0,100)}%`,background:m.color}}/></div>
        <span className="nutrition-percent">{percent==null?'—':`${fmt(percent)}% celu`}</span>
        <Coverage summary={report.summary} nutrient={m.key}/>
        {period==='week'&&value!=null&&<small className="nutrition-average">Śr. znana: {totalLabel(report.summary,m.key,m.key==='kcal'?0:1,report.loggedDays)} {m.unit}/dzień z wpisami</small>}
      </section>;
    })}</div>
    <IntakeAlerts days={report.days.map(({day,intake})=>({day,...intake}))} showDates={period==='week'}/>
    <details className="panel nutrition-explanation"><summary>RWS, indywidualny cel i UL</summary>
      <p><strong>RWS</strong> to punkt odniesienia z etykiet. Procent w kółku liczymy względem tej wartości. Zielony odcinek pokazuje, jak blisko znana suma jest górnego poziomu UL.</p>
      <p><strong>Twój cel</strong> kalorii i makroskładników pochodzi z planu w ustawieniach. Indywidualne zapotrzebowanie na witaminy i minerały wymaga osobnej oceny.</p>
      <p><strong>UL</strong> to górny poziom regularnego spożycia dla dorosłych. Limity sprawdzamy osobno dla każdego dnia z dostępnymi danymi. Dla magnezu porównujemy tylko zapis z suplementów, ponieważ jego limit dotyczy określonych form dodanych. <a href={UL_SOURCE.url} target="_blank" rel="noreferrer">Limity EFSA/SCF ↗</a></p>
    </details>
    {period==='week'&&<p className="nutrition-period-note">Plan tygodnia obejmuje 7 dni. Minęło {report.elapsedDays}/7 dni, zapisano {report.loggedDays}/7. Średnia uwzględnia dni z wpisami; nie oznacza pełnego spożycia, jeśli etykiety lub dziennik są niepełne.</p>}
    <WeekMacroChart report={week} metric={metric} setMetric={setMetric}/>
    {report.summary.genericEntryCount>0&&<p className="nutrition-period-note generic-nutrition-summary">Produkty ogólne: {report.summary.genericEntryCount} wpisów. Witaminy i minerały obejmują szacunki z tabel USDA i DTU Frida {GENERIC_NUTRITION_SOURCES.map(source=><a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.name} ↗ </a>)}, również dla brakujących danych we wcześniejszych wpisach. Dane z etykiet pozostają zachowane.</p>}
    <NutrientRows title="Witaminy" subtitle="Dane z etykiet i tabel składu żywności względem RWS dla dorosłych." keys={VITAMIN_KEYS} report={report}/>
    <div className="nutrition-reference-grid">
      <NutrientRows title="Błonnik, cukry, nasycone i sól" subtitle="Porównanie do wartości referencyjnych, nie cele do uzupełnienia." keys={['fiber','sugars','saturatedFat','salt']} report={report}/>
      <NutrientRows title="Składniki mineralne" subtitle="Znane ilości z jedzenia i suplementów." keys={MINERAL_KEYS} report={report}/>
    </div>
    {SUPPLEMENT_COMPONENT_KEYS.some(key=>report.summary.totals[key]!=null)&&<section className="panel nutrition-reference-panel"><div className="section-heading"><div><h2>Składniki suplementów</h2><p>Znane ilości z zapisanych porcji. EPA i DHA są częścią oleju, witanolidy i krzemionka częścią ekstraktów, a kreatyna częścią monohydratu.</p></div></div><div className="micros-grid">{NUTRIENTS.filter(([key])=>SUPPLEMENT_COMPONENT_KEYS.includes(key)&&report.summary.totals[key]!=null).map(([key,name,unit])=><div className="micro-item" key={key} data-nutrient={key}><span>{name}</span><strong>{totalLabel(report.summary,key,2)} {unit}</strong></div>)}</div></section>}
    <details className="panel nutrition-explanation"><summary>Źródła i kompletność danych</summary>
      <p>W tygodniu wartości odniesienia mnożymy przez 7. Błonnik porównujemy do 25 g/dzień według EFSA. Cukry ogółem, tłuszcze nasycone i sól mają etykietowe odniesienia dla 2000 kcal.</p>
      <p>Dane pochodzą z etykiet i szacunków opartych na tabelach USDA SR Legacy oraz DTU Frida. „—” oznacza brak danych. Przy niepełnych danych pokazujemy znaną część spożycia, a dla wartości granicznych uwzględniamy górną granicę z etykiety.</p>
      <p>Cel kalorii i makro dla danego dnia korzysta z ostatniej dostępnej na ten dzień wagi oraz bieżących ustawień profilu. Wartości witaminy A i niacyny z tabel podajemy w równoważnikach RE i NE.</p>
      <div className="nutrition-sources">{[...REFERENCE_SOURCES,...GENERIC_NUTRITION_SOURCES].map(s=><a href={s.url} key={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a>)}</div>
    </details>
  </div>;
}

export function DailyNutrientPreview({summary,intake}) {
  return <><p className="nutrient-ring-legend">Niebieski odcinek prowadzi do <b>RWS</b> z etykiet. Zielony odcinek pokazuje zbliżanie się do <b>UL</b>, górnego poziomu regularnego spożycia. Czerwone kółko oznacza przekroczenie UL.</p>
    {summary.genericEntryCount>0&&<p className="muted-note">Produkty ogólne uwzględniają szacunki z tabel USDA i DTU Frida. {GENERIC_NUTRITION_SOURCES.map(source=><a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.name} ↗ </a>)}</p>}<div className="micros-grid">{NUTRIENTS.map(([key,name,unit])=>{
    const value=summary.totals[key],reference=DAILY_REFERENCES[key];
    const limit=ADULT_UPPER_LIMITS[key],reading=intake.limitReadings[key];
    const referenceLabel=key==='fiber'?'EFSA':REFERENCE_LIMITS.has(key)?'Odniesienie':'RWS';
    return <div className={`micro-item ${reference?'has-reference-progress':''}`} key={key} data-nutrient={key}>
      <span>{name}</span><strong>{totalLabel(summary,key,2)}{value!=null?` ${unit}`:''}</strong>
      {reference?<div className="micro-reference-progress">
        <NutrientRing summary={summary} nutrient={key} name={name} target={reference.value} intake={intake}/>
        <div className="micro-thresholds">
          <small>{referenceLabel} {fmt(reference.value,2)} {unit}</small>
          {limit&&(limit.supplementsOnly?<SupplementLimit reading={reading} limit={limit.value} unit={unit}/>:<small>UL {fmt(limit.value,2)} {unit}</small>)}
          <LimitStatus reading={reading}/>
        </div>
      </div>:<small>{value==null?'Brak danych':'Znana ilość, bez wartości RWS'}</small>}
    </div>;
  })}</div></>;
}
