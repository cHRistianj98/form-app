export const REFERENCE_LIMITS=new Set(['sugars','saturatedFat','salt']);

export function progressPresentation(value,target,{mode='goal',upper=false,partial=false,intakeLimit}={}) {
  if(value==null||!Number.isFinite(value)||!Number.isFinite(target)||target<=0)return {percent:null,fraction:0,done:false,tone:'unknown',text:'—',status:'Brak danych',approximate:false};
  const percent=Math.max(0,value/target*100);
  const fraction=Math.min(1,percent/100);
  const approximate=partial||upper;
  const displayed=percent<100?Math.min(99,Math.round(percent)):Math.round(percent);
  const text=`${displayed}%`;
  if(mode==='limit'||mode==='reference-cap')return {percent,fraction,done:false,tone:percent>=100?'limit':mode==='reference-cap'?'reference':'progress',text,approximate,
    status:percent>=100?(upper?'Granica powyżej odniesienia':percent>100?'Powyżej odniesienia':'Osiągnięto wartość odniesienia'):'Wykorzystanie wartości odniesienia'};
  if(mode==='reference')return {percent,fraction,done:false,tone:'reference',text,approximate,status:'Procent wartości odniesienia'};
  if(mode==='daily-reference') {
    const {limit,knownMinimum,status}=intakeLimit||{};
    const base={percent,fraction,done:false,tone:'reference',text,approximate};
    if(status==='over')return {...base,fraction:1,tone:'exceeded',status:'Powyżej UL'};
    if(status==='at'||status==='possible')return {...base,fraction:1,tone:'limit',
      status:status==='at'?'Na poziomie UL':'Możliwy poziom UL lub wyżej'};
    const twoStages=Number.isFinite(limit)&&limit>target;
    const known=twoStages?knownMinimum:value;
    const reached=known>=target&&(twoStages||!upper);
    return {...base,
      fraction:Math.max(0,Math.min(1,known/target)),
      ...(twoStages?{secondFraction:Math.min(1,Math.max(0,(known-target)/(limit-target)))}:{}),
      tone:reached?'done':'reference',done:reached,
      status:reached?(twoStages?'Wartość odniesienia osiągnięta · zakres do UL':'Wartość odniesienia osiągnięta'):'Poniżej wartości odniesienia'};
  }
  const done=percent>=100&&!upper;
  return {percent,fraction,done,tone:done?'done':'progress',text,approximate,
    status:done?'Cel osiągnięty':'W trakcie'};
}
