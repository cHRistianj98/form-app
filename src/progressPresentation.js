export const REFERENCE_LIMITS=new Set(['sugars','saturatedFat','salt']);

export function progressPresentation(value,target,{mode='goal',upper=false,partial=false}={}) {
  if(value==null||!Number.isFinite(value)||!Number.isFinite(target)||target<=0)return {percent:null,fraction:0,done:false,tone:'unknown',text:'—',status:'Brak danych',approximate:false};
  const percent=Math.max(0,value/target*100);
  const fraction=Math.min(1,percent/100);
  const approximate=partial||upper;
  const displayed=percent<100?Math.min(99,Math.round(percent)):Math.round(percent);
  const text=`${displayed}%`;
  if(mode==='limit')return {percent,fraction,done:false,tone:percent>=100?'limit':'progress',text,approximate,
    status:percent>=100?(upper?'Granica powyżej odniesienia':percent>100?'Powyżej odniesienia':'Osiągnięto wartość odniesienia'):'Wykorzystanie wartości odniesienia'};
  if(mode==='reference')return {percent,fraction,done:false,tone:'progress',text,approximate,status:'Procent wartości odniesienia'};
  const done=percent>=100&&!upper;
  return {percent,fraction,done,tone:done?'done':'progress',text,approximate,
    status:done?'Cel osiągnięty':'W trakcie'};
}
