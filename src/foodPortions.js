import {FAVORITE_FOODS} from './favoriteFoods.js';
import {isTea,TEA_CUP_ML} from './teaRecipe.js';

export function defaultFoodQuantity(food) {
  const quantity=food?.defaultQuantity??FAVORITE_FOODS.find(item=>item.id===food?.id)?.defaultQuantity;
  if(Number.isFinite(quantity)&&quantity>=.1&&quantity<=100000)return quantity;
  return ['tablet','capsule'].includes(food?.unit)?1:100;
}

// Older diary snapshots keep their original nutrition; only the new portion
// convenience is looked up by identity when the snapshot predates it.
export function sliceGrams(food) {
  if(!food||!['g',undefined].includes(food.unit))return null;
  const size=food.sliceGrams??FAVORITE_FOODS.find(item=>item.id===food.id)?.sliceGrams;
  return Number.isFinite(size)&&size>0&&size<=100000?size:null;
}

export function parseQuantity(value,{whole=false,min=.1,max=100000}={}) {
  const text=String(value??'').trim();
  if(!(whole?/^\d+$/:/^\d+(?:[.,]\d{1,2})?$/).test(text))return null;
  const quantity=Number(text.replace(',','.'));
  return quantity>=min&&quantity<=max?quantity:null;
}

export function quantityInBaseUnits(value,food,mode='base') {
  const factor=mode==='slice'?sliceGrams(food):mode==='cup'?(isTea(food)?TEA_CUP_ML:null):1;
  if(factor==null)return null;
  const quantity=parseQuantity(value,{whole:['tablet','capsule'].includes(food?.unit),min:.1/factor,max:100000/factor});
  return quantity==null?null:Math.round(quantity*factor*10000)/10000;
}

export function teaCups(quantity) {
  if(!Number.isFinite(quantity)||quantity<=0)return null;
  const cups=Math.round(quantity/TEA_CUP_ML*100)/100;
  return Math.abs(cups*TEA_CUP_ML-quantity)<.00001?cups:null;
}

export function teaPortionLabel(quantity) {
  const cups=teaCups(quantity);
  const number=n=>n.toLocaleString('pl-PL',{maximumFractionDigits:2});
  if(cups==null)return `${number(quantity)} ml`;
  const word=cups===1?'kubek':Number.isInteger(cups)&&cups%10>=2&&cups%10<=4&&(cups%100<12||cups%100>14)?'kubki':Number.isInteger(cups)?'kubków':'kubka';
  return `${number(cups)} ${word} (${number(quantity)} ml)`;
}
