import {NUTRIENT_FIELDS} from './nutrients.js';
import {isPartialNutrient,isUpperBoundNutrient} from './nutritionQualifiers.js';

// quantity is in the ingredient's declared unit (g or ml), per 100 of that
// unit. The cooked yield is always grams: evaporation changes concentration,
// not total macro energy. Do not divide by the mass of raw batter or dough.
export function calculateDish(ingredients,cookedGrams) {
  return calculateMixture(ingredients,cookedGrams);
}

// Ingredients retain their g/ml basis. The final amount may be cooked grams
// or prepared millilitres; callers declare that unit on the resulting food.
export function calculateMixture(ingredients,preparedQuantity) {
  if (!Number.isFinite(preparedQuantity)||preparedQuantity<=0) throw new Error('Niepoprawna wielkość gotowej porcji');
  if (!Array.isArray(ingredients)||!ingredients.length) throw new Error('Brak składników');
  const active=ingredients.filter(row=>{
    if(!row.food||!Number.isFinite(row.quantity)||row.quantity<0) throw new Error('Niepoprawny składnik');
    return row.quantity>0;
  });
  if(!active.length) throw new Error('Brak składników');
  const result={partialNutrients:[],upperBoundNutrients:[]};
  for(const key of NUTRIENT_FIELDS) {
    let sum=0,known=0,partial=false,upper=false;
    for(const {food,quantity,retention={}} of active) {
      const value=food[key];
      if(value==null||value==='') {partial=true;continue;}
      if(!Number.isFinite(value)||value<0) throw new Error('Niepoprawna wartość odżywcza');
      const factor=retention[key]??1;
      if(!Number.isFinite(factor)||factor<0||factor>1) throw new Error('Niepoprawny współczynnik retencji');
      sum+=value*quantity/100*factor;known++;
      partial ||= isPartialNutrient(food,key);
      upper ||= isUpperBoundNutrient(food,key);
    }
    // Water/pure salt contribute known zero vitamins. If all substantive
    // information is missing, do not turn those zeros into a dish value.
    const available=known>0&&!(partial&&sum===0);
    result[key]=available?sum/preparedQuantity*100:null;
    if(available&&partial) result.partialNutrients.push(key);
    if(available&&upper) result.upperBoundNutrients.push(key);
  }
  return result;
}
