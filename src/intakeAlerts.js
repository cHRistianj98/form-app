import {resolveFoodNutrition,scaleFood} from './foods.js';
import {MINERAL_KEYS,NUTRIENTS,SUPPLEMENT_COMPONENT_KEYS,VITAMIN_KEYS} from './nutrients.js';
import {isUpperBoundNutrient} from './nutritionQualifiers.js';
import {isSupplementIntake} from './supplements.js';
import {supplementPlanFor,supplementScheduleLabel} from './supplementPlan.js';

export const UL_SOURCE={
  name:'Górne poziomy spożycia dla dorosłych (EFSA/SCF, sierpień 2025)',
  url:'https://www.efsa.europa.eu/sites/default/files/2024-05/ul-summary-report.pdf',
};

// Only use limits that correspond to the form and units tracked in the diary.
// The magnesium check covers supplements, not untracked enrichment of water/food.
export const ADULT_UPPER_LIMITS={
  vitaminD:{value:100}, zinc:{value:25}, selenium:{value:255},
  b6:{value:12}, calcium:{value:2500}, vitaminE:{value:300},
  magnesium:{value:250,supplementsOnly:true},
};

const metadata=Object.fromEntries(NUTRIENTS.map(([key,name,unit])=>[key,{key,name,unit}]));
const overlapKeys=[...MINERAL_KEYS,...VITAMIN_KEYS,...SUPPLEMENT_COMPONENT_KEYS];

function overlaps(products) {
  return overlapKeys.flatMap(key=>{
    const sources=new Map();
    for(const {food,values,schedule} of products) {
      const amount=values[key];
      if(!Number.isFinite(amount)||amount<=0)continue;
      const current=sources.get(food.id);
      sources.set(food.id,{
        name:food.name,schedule,amount:(current?.amount||0)+amount,
        upper:current?.upper||isUpperBoundNutrient(food,key),
      });
    }
    return sources.size>1?[{...metadata[key],products:[...sources.values()]}]:[];
  });
}

export function plannedSupplementOverlaps(catalog,plan) {
  const products=catalog.flatMap(food=>{
    const row=supplementPlanFor(plan,food.id);
    return row.quantity>0?[{food,values:scaleFood(food,row.quantity),schedule:supplementScheduleLabel(row)}]:[];
  });
  return overlaps(products);
}

export function assessDailyIntake(entries) {
  const rows=entries.map(entry=>{
    const food=resolveFoodNutrition(entry.food);
    return {food,values:scaleFood(food,entry.grams),supplement:isSupplementIntake(entry)};
  });
  const supplements=rows.filter(row=>row.supplement);
  const limits=[];

  for(const [key,{value:limit,supplementsOnly=false}] of Object.entries(ADULT_UPPER_LIMITS)) {
    const sources=supplementsOnly?supplements:rows;
    let total=0,knownMinimum=0,supplementAmount=0,supplementUpper=false;
    for(const row of sources) {
      const value=row.values[key];
      if(!Number.isFinite(value))continue;
      total+=value;
      const upper=isUpperBoundNutrient(row.food,key);
      if(row.supplement) {
        supplementAmount+=value;
        supplementUpper ||= upper;
      }
      if(!upper)knownMinimum+=value;
    }
    const epsilon=1e-9;
    if(total<limit-epsilon)continue;
    const status=knownMinimum>limit+epsilon?'over':total>limit+epsilon||knownMinimum<limit-epsilon?'possible':'at';
    limits.push({...metadata[key],limit,value:status==='possible'?total:knownMinimum,supplementAmount,supplementUpper,supplementsOnly,status});
  }
  return {limits,overlaps:overlaps(supplements)};
}

export const LIMIT_STATUS_LABELS={over:'Powyżej UL',at:'Na poziomie UL',possible:'Możliwy poziom UL lub wyżej'};
