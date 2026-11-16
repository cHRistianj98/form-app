// These are the user's requested tracking targets, not manufacturer dosing advice.
export const DEFAULT_SUPPLEMENT_PLAN={
  'supplement:essensey-ashwagandha-forte':{quantity:1,schedule:'daily'},
  'supplement:essensey-magnesium-b6':{quantity:1,schedule:'daily'},
  'supplement:now-omega-3':{quantity:2,schedule:'daily'},
  'supplement:essensey-biotin-horsetail-zinc':{quantity:1,schedule:'daily'},
  'supplement:essensey-zinc':{quantity:1,schedule:'odd'},
  'supplement:essensey-vitamin-d3-forte':{quantity:1,schedule:'daily'},
};
export const SUPPLEMENT_SCHEDULES=[
  {id:'daily',label:'Codziennie'},
  {id:'odd',label:'Nieparzyste dni miesiąca'},
  {id:'even',label:'Parzyste dni miesiąca'},
];
const validRow=row=>row&&typeof row==='object'&&!Array.isArray(row)&&Number.isInteger(row.quantity)&&row.quantity>=0&&row.quantity<=100&&SUPPLEMENT_SCHEDULES.some(option=>option.id===row.schedule);
export function validSupplementPlan(plan) {
  return !!plan&&typeof plan==='object'&&!Array.isArray(plan)&&Object.keys(plan).length<=100&&Object.entries(plan).every(([id,row])=>/^[\w:-]{1,100}$/.test(id)&&validRow(row));
}
export function normalizeSupplementPlan(plan) {
  const rows={...DEFAULT_SUPPLEMENT_PLAN,...(validSupplementPlan(plan)?plan:{})};
  return Object.fromEntries(Object.entries(rows).map(([id,row])=>[id,{quantity:row.quantity,schedule:row.schedule}]));
}
export function supplementPlanFor(plan,foodId) {
  const row=plan?.[foodId]??DEFAULT_SUPPLEMENT_PLAN[foodId];
  return validRow(row)?row:{quantity:1,schedule:'daily'};
}
export function supplementTarget(plan,foodId,day) {
  const row=supplementPlanFor(plan,foodId);
  // Parity is the calendar day of the month, including month/year boundaries.
  const date=Number(day.slice(8,10));
  const skipped=(row.schedule==='odd'&&date%2===0)||(row.schedule==='even'&&date%2===1);
  return skipped?0:row.quantity;
}
export function supplementPlanProgress(catalog,entries,day,plan) {
  const rows=catalog.map(food=>{
    const count=entries.filter(entry=>entry.day===day&&entry.food.id===food.id&&entry.food.kind==='supplement').reduce((sum,entry)=>sum+entry.grams,0);
    const target=supplementTarget(plan,food.id,day);
    return {food,count,target,done:target>0&&count>=target};
  });
  const due=rows.filter(row=>row.target>0);
  const planned=due.reduce((sum,row)=>sum+row.target,0);
  const completed=due.reduce((sum,row)=>sum+Math.min(row.count,row.target),0);
  return {rows,planned,completed,plannedProducts:due.length,completedProducts:due.filter(row=>row.done).length,
    taken:rows.reduce((sum,row)=>sum+row.count,0),done:planned>0&&completed===planned};
}
