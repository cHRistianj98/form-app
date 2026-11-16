import {FAVORITE_FOODS} from './favoriteFoods.js';

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
  const factor=mode==='slice'?sliceGrams(food):1;
  if(factor==null)return null;
  const quantity=parseQuantity(value,{whole:['tablet','capsule'].includes(food?.unit),min:.1/factor,max:100000/factor});
  return quantity==null?null:Math.round(quantity*factor*10000)/10000;
}
