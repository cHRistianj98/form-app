export const TEA_ID='favorite:lipton-earl-grey';
export const TEA_CUP_ML=250;
export const TEA_ADDON_KEYS=['lemon','orange','ginger','sugar'];
export const DEFAULT_TEA_RECIPE={version:1,lemon:0,orange:0,ginger:0,sugar:0,consumeAdditions:false};
export const isTea=food=>food?.id===TEA_ID&&food.unit==='ml';

function count(value) {
  const text=String(value??'').trim();
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(text))return null;
  const n=Number(text.replace(',','.'));
  return Number.isFinite(n)&&n>=0&&n<=20?n:null;
}

export function normalizeTeaRecipe(value) {
  if(!value||value.version!==1||typeof value.consumeAdditions!=='boolean')return null;
  const recipe={version:1,consumeAdditions:value.consumeAdditions};
  for(const key of TEA_ADDON_KEYS){const n=count(value[key]);if(n==null)return null;recipe[key]=n;}
  return recipe;
}

export function validTeaRecipe(value) {
  return !!normalizeTeaRecipe(value)&&Object.keys(value).every(key=>['version','consumeAdditions',...TEA_ADDON_KEYS].includes(key))&&TEA_ADDON_KEYS.every(key=>typeof value[key]==='number');
}

export function teaRecipeOf(food) {
  return normalizeTeaRecipe(food?.teaRecipe)||{...DEFAULT_TEA_RECIPE};
}

export const hasTeaExtras=recipe=>TEA_ADDON_KEYS.some(key=>Number(String(recipe[key]).replace(',','.'))>0);
