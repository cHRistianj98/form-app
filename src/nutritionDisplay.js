import {fmt} from './foods.js';
import {isPartialNutrient,isUpperBoundNutrient} from './nutritionQualifiers.js';

// Keep numeric presentation simple; completeness and label bounds are carried
// by descriptions/coverage rather than inequality symbols before every value.
export function displayAmount(value,upper=false,digits=1) {
  if(value==null||!Number.isFinite(value))return '—';
  return fmt(upper?Math.ceil(value*10**digits)/10**digits:value,digits);
}
export function displayFoodNutrientLabel(food,key,value=food[key],digits=1) {
  return displayAmount(value,isUpperBoundNutrient(food,key),digits);
}
export function displayTotal(summary,key,digits=1,divisor=1) {
  const value=summary.totals[key];
  return value==null||!Number.isFinite(divisor)||divisor<=0?'—':displayAmount(value/divisor,summary.coverage[key].upper,digits);
}
export function nutrientDescription(food,key) {
  const partial=isPartialNutrient(food,key),upper=isUpperBoundNutrient(food,key);
  return partial&&upper?'Szacunek z niepełnych danych i górnej granicy etykiety':partial?'Dane częściowe':upper?'Górna granica z etykiety':'';
}
export function readableNutritionNote(text='') {
  return text.replace(/≥|>=/g,'co najmniej').replace(/≤|<=/g,'nie więcej niż').replace(/≈|~~?/g,'szacunkowo');
}
