import data from './genericFoodNutrients.json' with {type:'json'};

export const GENERIC_NUTRITION_SOURCE = {name:data.dataset,url:data.url};

// Only built-in generic foods qualify. Never infer composition from the name
// of a branded/custom/OFF food or apply per-100-g data to ml/tablets.
function isGeneric(food) {
  return food && !food.brand && (!food.source || food.source==='Orientacyjne') &&
    (!food.unit || food.unit==='g') && (food.basisQuantity==null || food.basisQuantity===100);
}

export function genericNutritionInfo(food) {
  if (!isGeneric(food)) return null;
  const record=data.foods[food.id];
  return record ? {...record,url:`https://fdc.nal.usda.gov/food-details/${record.fdcId}/nutrients`} : null;
}

export function genericNutritionGap(food) {
  return isGeneric(food) ? data.unmatched[food.id] || null : null;
}

export function enrichGenericFood(food) {
  const record=genericNutritionInfo(food);
  if (!record) return food;
  // Add missing micronutrients only. Preserve zero, existing estimates, label
  // values and all macros. Never mutate a stored diary snapshot or migrate D1.
  const missing=Object.entries(record.nutrients).filter(([key])=>food[key]==null || food[key]==='');
  return missing.length ? {...food,...Object.fromEntries(missing)} : food;
}
