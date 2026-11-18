import {ACTIVITY_TYPES,MEALS,calcDailyBalance,calcDailyMovement,fmt,foodUnit,localDay,resolveFoodNutrition,scaleFood,shiftDay} from './foods.js';
import {monthStart,shiftMonth} from './calendar.js';
import {calendarWeek,sumNutrition,targetsOnDay} from './nutritionStats.js';
import {DAILY_REFERENCES,MINERAL_KEYS,NUTRIENTS,REFERENCE_SOURCES,SUPPLEMENT_COMPONENT_KEYS,VITAMIN_KEYS} from './nutrients.js';
import {displayAmount,readableNutritionNote} from './nutritionDisplay.js';
import {isPartialNutrient,isUpperBoundNutrient} from './nutritionQualifiers.js';
import {genericNutritionInfo} from './genericNutrition.js';
import {favoriteSeleniumInfo} from './favoriteFoods.js';
import {normalizeProfile} from './profile.js';
import {supplementPlanFor,supplementScheduleLabel} from './supplementPlan.js';
import {isTea,TEA_CUP_ML,teaRecipeOf} from './teaRecipe.js';
import {teaPortionLabel} from './foodPortions.js';
import {TEA_ADDONS} from './tea.js';
import {isSupplementIntake} from './supplements.js';
import {assessDailyIntake,LIMIT_STATUS_LABELS,UL_SOURCE} from './intakeAlerts.js';

export const EXPORT_PERIODS=[{id:'day',name:'Dzień'},{id:'week',name:'Tydzień'},{id:'month',name:'Miesiąc'}];
const MACROS=[['kcal','Kalorie','kcal'],['protein','Białko','g'],['carbs','Węglowodany','g'],['fat','Tłuszcze','g']];
const META=[...MACROS,...NUTRIENTS];
const meta=key=>META.find(row=>row[0]===key);
const clean=value=>String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim();
const note=value=>clean(readableNutritionNote(value).replace(/<\s*(?=\d)/g,'mniej niż ').replace(/>\s*(?=\d)/g,'więcej niż '));
export const exportDate=day=>new Date(day+'T12:00:00').toLocaleDateString('pl-PL',{day:'2-digit',month:'2-digit',year:'numeric'});
export const isReportSupplement=isSupplementIntake;

export function exportDates(day,period='day') {
  if(!EXPORT_PERIODS.some(option=>option.id===period))throw new Error('Niepoprawny okres raportu');
  if(period==='week')return calendarWeek(day);
  if(period==='month') {
    const first=monthStart(day),next=shiftMonth(first,1);
    const count=Math.round((new Date(next+'T12:00:00Z')-new Date(first+'T12:00:00Z'))/86400000);
    return Array.from({length:count},(_,i)=>shiftDay(first,i));
  }
  return [day];
}

export function shiftExportPeriod(day,period,amount) {
  return period==='month'?shiftMonth(day,amount):shiftDay(day,amount*(period==='week'?7:1));
}

function amount(value,key,{upper=false,divisor=1}={}) {
  if(value==null||!Number.isFinite(value)||!divisor)return 'brak danych';
  const n=value/divisor;
  const digits=n!==0&&Math.abs(n)<.01?6:2;
  return `${displayAmount(n,upper,digits)} ${meta(key)[2]}`;
}

function summaryValue(summary,key) {
  const c=summary.coverage[key];
  if(!c.total)return 'brak wpisów';
  if(!c.known)return 'brak danych';
  const notes=[];
  if(!c.complete)notes.push(`dane częściowe, dostępne wartości w ${c.known}/${c.total} wpisów`);
  if(c.upper)notes.push('uwzględniono górną granicę z etykiety');
  return amount(summary.totals[key],key,{upper:c.upper})+(notes.length?` (${notes.join('; ')})`:'');
}

function entryValue(entry,values,key) {
  const value=amount(values[key],key,{upper:isUpperBoundNutrient(entry.food,key)});
  if(values[key]==null)return value;
  const notes=[isPartialNutrient(entry.food,key)?'dane częściowe':'',isUpperBoundNutrient(entry.food,key)?'górna granica etykiety':''].filter(Boolean);
  return value+(notes.length?` (${notes.join(', ')})`:'');
}

function compactSummary(summary,keys) {
  return keys.map(key=>`${meta(key)[1]}: ${summaryValue(summary,key)}`).join(' | ');
}

function productName(food) {
  return `${clean(food.name)}${food.brand?` (${clean(food.brand)})`:''}`;
}

function entryLines(entry,supplement=false) {
  entry={...entry,food:resolveFoodNutrition(entry.food)};
  const values=scaleFood(entry.food,entry.grams);
  const quantity=isTea(entry.food)?teaPortionLabel(entry.grams):`${fmt(entry.grams,2)} ${foodUnit(entry.food)}`;
  const lines=[`- ${productName(entry.food)} — ${quantity}.`,
    `  ${MACROS.map(([key,name])=>`${name}: ${entryValue(entry,values,key)}`).join(' | ')}`];
  if(supplement) {
    const keys=NUTRIENTS.filter(([key])=>values[key]!=null).map(([key])=>key);
    lines.push(keys.length?`  Skład przyjętej porcji: ${keys.map(key=>`${meta(key)[1]}: ${entryValue(entry,values,key)}`).join(' | ')}`:'  Pozostały skład przyjętej porcji: brak podanych ilości.');
  }
  if(!supplement&&values.selenium!=null)lines.push(`  Selen: ${entryValue(entry,values,'selenium')}.`);
  if(isTea(entry.food)) {
    const recipe=teaRecipeOf(entry.food),cups=entry.grams/TEA_CUP_ML;
    const extras=TEA_ADDONS.filter(addon=>recipe[addon.key]>0).map(addon=>`${addon.name}: ${fmt(recipe[addon.key]*addon.grams*cups,2)} g`);
    if(extras.length)lines.push(`  Dodatki w tej porcji: ${extras.join(', ')}. Owoce i imbir: ${recipe.consumeAdditions?'zjedzone w całości':'plastry pozostają w kubku; transfer składników nieznany'}.`);
  }
  return lines;
}

function sourceLines(entries) {
  const seen=new Set(),lines=[];
  for(const entry of entries) {
    const food=resolveFoodNutrition(entry.food);
    const info=genericNutritionInfo(food);
    const selenium=favoriteSeleniumInfo(food);
    const source=food.sourceUrl||info?.url;
    const notes=food.estimateNotes||info?.method||'';
    const signature=JSON.stringify([food.name,food.brand,source,notes,food.labelNote]);
    if(seen.has(signature))continue;
    seen.add(signature);
    lines.push(`- ${productName(food)}: ${clean(food.source||info?.sourceName||'zapis produktu')}${info?`; ogólny szacunek dla: ${clean(info.variant)}`:''}.${source?` ${clean(source)}`:''}`);
    if(notes)lines.push(`  Założenia: ${note(notes)}`);
    if(selenium&&food.selenium===selenium.value)lines.push(`  Szacunek selenu na podstawie produktu ogólnego (${clean(selenium.variant)}). ${selenium.url}`);
    if(food.labelNote)lines.push(`  Etykieta: ${note(food.labelNote)}`);
  }
  return lines;
}

// This export uses recorded quantities/snapshots and the same enrichment and
// movement rules as the dashboard. It never fills in intakes from a plan.
export function buildNutritionExport({entries=[],daily=[],activities=[],profile,day,period='day',today=localDay()}) {
  const dates=exportDates(day,period),allowed=new Set(dates.filter(date=>date<=today));
  const p=normalizeProfile(profile);
  const selected=entries.filter(entry=>allowed.has(entry.day)).sort((a,b)=>a.day.localeCompare(b.day));
  const days=[...allowed].map(date=>{
    const records=selected.filter(entry=>entry.day===date);
    const food=records.filter(entry=>!isReportSupplement(entry)),supplements=records.filter(isReportSupplement);
    const acts=activities.filter(activity=>activity.day===date);
    const metrics=daily.find(row=>row.day===date);
    const movement=calcDailyMovement(metrics?.steps||0,acts,metrics?.garminActiveKcal);
    const goal=targetsOnDay(p,daily,date);
    return {day:date,records,food,supplements,acts,metrics,movement,goal,budget:calcDailyBalance(goal,0,movement.total).budget,summary:sumNutrition(records)};
  });
  const summary=sumNutrition(selected),foodSummary=sumNutrition(selected.filter(entry=>!isReportSupplement(entry))),suppSummary=sumNutrition(selected.filter(isReportSupplement));
  const recorded=days.filter(d=>d.records.length),foodDays=days.filter(d=>d.food.length);
  const from=dates[0],to=dates.at(-1),includedTo=days.at(-1)?.day??null;
  const contextDay=includedTo||today,contextGoal=targetsOnDay(p,daily,contextDay);
  const lines=[
    '# Raport żywienia — Forma',
    `Okres: ${EXPORT_PERIODS.find(option=>option.id===period).name}. Zakres kalendarzowy: ${exportDate(from)}${from!==to?` – ${exportDate(to)}`:''}.`,
    `Dane do: ${includedTo?exportDate(includedTo):'brak dni do uwzględnienia'}. Przyszłe daty są pominięte.`,
    '',
    '## Prośba o ocenę',
    'Przeanalizuj mój zapis jedzenia razem z suplementami, celami i ruchem. Oceń bilans energii, makro, błonnik, witaminy i minerały. Wskaż możliwe braki podaży, duże ilości oraz składniki powtarzające się w suplementach. Zaproponuj konkretne zmiany produktów lub porcji i wyjaśnij ich sens. Oddziel wnioski oparte na danych od przypuszczeń; gdy zapis jest niepełny, wskaż, czego trzeba się dowiedzieć. Nie traktuj braku danych jako zera ani niskiej wartości w dzienniku jako potwierdzonego niedoboru.',
    '',
    '## Kontekst i cele z ustawień',
    `Wiek: ${fmt(p.age)} lat. Płeć w kalkulatorze: ${p.sex==='female'?'kobieta':'mężczyzna'}. Wzrost: ${fmt(p.height,2)} cm.`,
    `Masa użyta w planie na ${exportDate(contextDay)}: ${fmt(contextGoal.weight,2)} kg (ostatni wcześniejszy pomiar albo masa początkowa). Masa początkowa: ${fmt(p.startWeight,2)} kg. Cel masy: ${fmt(p.targetWeight,2)} kg.`,
    `Przeciętna aktywność: ${contextGoal.activity.name}. Bazowy cel energii: ${fmt(contextGoal.calories,2)} kcal/dzień (${contextGoal.manual?'własny cel':contextGoal.method==='eer2023'?'EER / DRI 2023':'Mifflin–St Jeor'}).`,
    `Plan makro: białko ${fmt(contextGoal.protein,2)} g, węglowodany ${fmt(contextGoal.carbs,2)} g, tłuszcze ${fmt(contextGoal.fat,2)} g/dzień.`,
    'Cel energii w aplikacji = cel bazowy + zapisany ruch. Makro pozostaje z planu. Dane profilu i plan suplementów pochodzą z bieżących ustawień; cele wcześniejszych dni uwzględniają tylko znaną wtedy wagę.',
    '',
    period==='day'?'## Podsumowanie dnia':'## Podsumowanie okresu',
    `Dni z wpisami: ${recorded.length}/${days.length} uwzględnionych dni. Dni z jedzeniem: ${foodDays.length}. Dni tylko z suplementami: ${recorded.length-foodDays.length}.`,
    `Wpisy jedzenia: ${selected.filter(entry=>!isReportSupplement(entry)).length}. Wpisy suplementów: ${selected.filter(isReportSupplement).length}.`,
    'Puste dni nie oznaczają zerowego spożycia. Średnia każdego składnika uwzględnia tylko dni z jego znaną wartością; dzień z choć jednym wpisem nie musi być zapisany w całości.',
  ];

  function nutrientBlock(title,keys) {
    lines.push('',`### ${title}`);
    for(const key of keys) {
      const knownDays=days.filter(d=>d.summary.totals[key]!=null),c=summary.coverage[key];
      lines.push(`- ${meta(key)[1]}: ${summaryValue(summary,key)}.`,
        `  Jedzenie: ${summaryValue(foodSummary,key)}; suplementy: ${summaryValue(suppSummary,key)}.`);
      if(knownDays.length) {
        const average=amount(summary.totals[key],key,{upper:c.upper,divisor:knownDays.length});
        let target='';
        if(MACROS.some(row=>row[0]===key)) {
          const meanGoal=knownDays.reduce((sum,d)=>sum+(key==='kcal'?d.budget:d.goal[key]),0)/knownDays.length;
          target=`; średni cel dla tych dni: ${amount(meanGoal,key)}`;
        }else if(DAILY_REFERENCES[key])target=`; odniesienie: ${amount(DAILY_REFERENCES[key].value,key)}/dzień (${DAILY_REFERENCES[key].source})`;
        lines.push(`  Średnia znanej ilości: ${average}/dzień (${knownDays.length}/${days.length} dni z danymi${!c.complete?'; dane częściowe':''})${target}.`);
      }
    }
  }
  nutrientBlock('Energia i makroskładniki',MACROS.map(row=>row[0]));
  nutrientBlock('Błonnik, cukry, tłuszcze nasycone i sól',['fiber','sugars','saturatedFat','salt']);
  nutrientBlock('Składniki mineralne',MINERAL_KEYS);
  nutrientBlock('Witaminy',VITAMIN_KEYS);
  const components=SUPPLEMENT_COMPONENT_KEYS.filter(key=>summary.totals[key]!=null);
  if(components.length)nutrientBlock('Składniki suplementów',components);
  const energyDays=days.filter(d=>d.summary.totals.kcal!=null);
  const movement=days.reduce((sum,d)=>sum+d.movement.total,0);
  const baseCalories=days.reduce((sum,d)=>sum+d.goal.calories,0);
  const budget=days.reduce((sum,d)=>sum+d.budget,0);
  lines.push('','### Ruch i bilans',`Zapisany ruch w uwzględnionych dniach: ${fmt(movement,2)} kcal (${days.some(d=>d.movement.source==='garmin')?'kalorie aktywne Garmin; w dniach bez danych szacunek z kroków i treningów':'szacunek ponad bazę aplikacji'}).`);
  if(days.length)lines.push(`Cel bazowy w okresie: ${fmt(baseCalories,2)} kcal. Cel z ruchem: ${fmt(budget,2)} kcal.`);
  if(energyDays.length) {
    const energyMovement=energyDays.reduce((sum,d)=>sum+d.movement.total,0);
    lines.push(`Znane spożycie minus ruch: ${amount(summary.totals.kcal-energyMovement,'kcal')} z ${energyDays.length} ${energyDays.length===1?'dnia ze znanymi kaloriami':'dni ze znanymi kaloriami'}${!summary.coverage.kcal.complete?' (spożycie częściowe)':''}.`);
  }else lines.push('Spożycie minus ruch: brak danych o spożyciu.');
  lines.push('To bilans po zapisanym ruchu, a nie wyliczenie całkowitego deficytu energetycznego.');

  const flaggedDays=days.map(d=>({day:d.day,...assessDailyIntake(d.records)})).filter(d=>d.limits.length||d.overlaps.length);
  if(flaggedDays.length) {
    lines.push('','## Alerty żywieniowe w zapisanych dniach');
    for(const date of flaggedDays) {
      lines.push(`### ${exportDate(date.day)}`);
      for(const row of date.limits) {
        const basis=row.status==='possible'?'suma z górnymi granicami':'znana suma';
        lines.push(`- ${row.name}: ${LIMIT_STATUS_LABELS[row.status]}. ${basis} ${amount(row.value,row.key)} / UL ${amount(row.limit,row.key)}/dzień${row.supplementsOnly?' (z suplementów)':''}.`);
      }
      for(const row of date.overlaps) {
        lines.push(`- ${row.name} w kilku przyjętych suplementach: ${row.products.map(product=>`${clean(product.name)} (${product.upper?'do ':''}${amount(product.amount,row.key)})`).join(', ')}.`);
      }
    }
    lines.push('UL dotyczy regularnego spożycia. Każdy dzień porównano osobno na podstawie dostępnych danych.',`${UL_SOURCE.name}: ${UL_SOURCE.url}`);
  }

  const actualSupps=selected.filter(isReportSupplement);
  const supplementGroups=new Map();
  for(const entry of actualSupps) {
    const key=`${entry.food.id}:${foodUnit(entry.food)}`;
    if(!supplementGroups.has(key))supplementGroups.set(key,[]);
    supplementGroups.get(key).push(entry);
  }
  if(supplementGroups.size) {
    lines.push('','## Suplementy — zapisane ilości');
    for(const records of supplementGroups.values()) {
      const food=records[0].food,id=food.id;
      const count=records.reduce((sum,entry)=>sum+entry.grams,0),takenDays=new Set(records.map(entry=>entry.day)).size;
      lines.push(`- ${productName(food)}: ${fmt(count,2)} ${foodUnit(food)} w ${takenDays} ${takenDays===1?'dniu':'dniach'} z zapisem.`);
      if(p.supplementPlan[id]) {
        const plan=supplementPlanFor(p.supplementPlan,id);
        lines.push(`  Plan z ustawień: ${fmt(plan.quantity)} ${foodUnit(food)} — ${supplementScheduleLabel(plan).toLocaleLowerCase('pl-PL')}.`);
      }
      const s=sumNutrition(records),keys=NUTRIENTS.filter(([key])=>s.totals[key]!=null).map(([key])=>key);
      if(keys.length)lines.push(`  Suma składników z tych wpisów: ${compactSummary(s,keys)}.`);
    }
    lines.push('Uwzględniono wyłącznie zapisane dawki; harmonogram nie dodaje niezapisanych kapsułek lub tabletek.');
  }

  lines.push('','## Dziennik dzień po dniu');
  for(const d of days) {
    lines.push('',`### ${exportDate(d.day)} — ${new Date(d.day+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'long'})}`);
    if(!d.records.length)lines.push('Brak wpisów jedzenia i suplementów. Spożycie nieznane.');
    if(!d.records.length&&!d.metrics&&!d.acts.length)continue;
    for(const meal of MEALS) {
      const records=d.food.filter(entry=>entry.meal===meal.id);
      if(records.length){lines.push('',`${meal.name}:`);for(const entry of records)lines.push(...entryLines(entry));}
    }
    const other=d.food.filter(entry=>!MEALS.some(meal=>meal.id===entry.meal));
    if(other.length){lines.push('','Pozostałe jedzenie:');for(const entry of other)lines.push(...entryLines(entry));}
    if(d.supplements.length){lines.push('','Suplementy:');for(const entry of d.supplements)lines.push(...entryLines(entry,true));}
    if(d.records.length) {
      lines.push('','Suma dnia (jedzenie + suplementy):',compactSummary(d.summary,MACROS.map(row=>row[0]))+'.');
      // The day export already contains its full micronutrient summary above.
      if(period!=='day') {
        for(const [title,keys] of [['Błonnik i inne',['fiber','sugars','saturatedFat','salt']],['Minerały',MINERAL_KEYS],['Witaminy',VITAMIN_KEYS],['Składniki suplementów',components]]) {
          if(keys.length)lines.push(`${title}: ${compactSummary(d.summary,keys)}.`);
        }
      }
    }
    lines.push(`Plan dnia: ${fmt(d.goal.calories,2)} kcal + ${fmt(d.movement.total,2)} kcal ruchu = ${fmt(d.budget,2)} kcal; białko ${fmt(d.goal.protein,2)} g, węglowodany ${fmt(d.goal.carbs,2)} g, tłuszcze ${fmt(d.goal.fat,2)} g.`);
    if(d.metrics)lines.push(`Zapisane kroki: ${d.metrics.steps==null?'brak zapisu':fmt(d.metrics.steps)}. Zapisana waga: ${d.metrics.weight==null?'brak pomiaru':`${fmt(d.metrics.weight,2)} kg`}.`);
    for(const activity of d.acts)lines.push(`Aktywność: ${ACTIVITY_TYPES.find(type=>type.id===activity.type)?.name||'Trening'}, ${fmt(activity.minutes,2)} min${activity.distance>0?`, ${fmt(activity.distance,2)} km`:''}; ${fmt(activity.kcal,2)} kcal szacunkowo${activity.includedInSteps?'; kroki treningu zawarte w liczniku':''}.`);
    lines.push(d.movement.source==='garmin'?`Ruch: ${fmt(d.movement.total,2)} kcal aktywnych z Garmin Connect. Zastępują szacunek z kroków i treningów; nie doliczamy go ponownie.`:d.metrics?.steps!=null||d.acts.length?`Ruch: kroki ponad bazę ${fmt(d.movement.stepsBurn,2)} kcal + treningi ${fmt(d.movement.workout,2)} kcal = ${fmt(d.movement.total,2)} kcal.`:'Ruch: brak zapisów kroków i treningów; do budżetu dodano 0 kcal.');
  }
  lines.push('','## Jakość danych i sposób liczenia',
    'Brak danych i brak wpisów nie są zerem. Jawne 0 pozostaje zerem. Dane częściowe są sumą tylko znanej części składu. Granice z etykiet są opisane słownie; przyjmujemy górną granicę do sumy. Ogólne produkty i domowe dania mogą mieć szacunkowe wartości; skład zależy od receptury i przygotowania.',
    'RWS UE to wartości odniesienia dla dorosłych z etykiet, a nie indywidualne zapotrzebowanie ani górny bezpieczny limit. Cukry ogółem nie oznaczają cukrów wolnych. Witamina A: µg RE; niacyna: mg NE; foliany, B12 i selen: µg. EPA i DHA są częścią oleju rybiego; witanolidy i krzemionka są częścią ekstraktów; kreatyna jest częścią monohydratu — nie należy dodawać ich ponownie do masy składnika. Plan suplementów nie jest zapisem spożycia. Opcjonalne produkty i dni tygodnia nie dopisują automatycznie przyjętych sztuk.',
    ...REFERENCE_SOURCES.map(source=>`${source.name}: ${source.url}`),
    '','## Źródła produktów i założenia',...sourceLines(selected));
  if(!selected.length)lines.push('Brak zapisanych produktów w wybranym okresie.');
  return {text:lines.join('\n'),from,to,includedTo,dayCount:dates.length,elapsedDays:days.length,loggedDays:recorded.length,entryCount:selected.length,foodEntries:foodSummary.entryCount,supplementEntries:suppSummary.entryCount};
}
