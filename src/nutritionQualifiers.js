// Qualifiers travel with saved snapshots; unknown data is never replaced by 0.
export const isPartialNutrient = (food,key) => food?.partialNutrients?.includes(key)===true;
export const isUpperBoundNutrient = (food,key) =>
  food?.upperBoundNutrients?.includes(key)===true || (key==='fat'&&food?.fatLessThan===true);
