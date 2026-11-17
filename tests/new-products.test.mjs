import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE_FOODS,FAVORITE_FOODS,foodBasis,foodOptions,scaleFood} from '../src/foods.js';
import {defaultFoodQuantity} from '../src/foodPortions.js';
import {genericNutritionInfo} from '../src/genericNutrition.js';
import {sumNutrition} from '../src/nutritionStats.js';

const garlic=BASE_FOODS.find(f=>f.id==='base:garlic');
const sausage=BASE_FOODS.find(f=>f.id==='base:rustic-sausage');
const yogurt=FAVORITE_FOODS.find(f=>f.id==='favorite:lidl-protein-cup');
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('fresh garlic uses raw USDA composition and a 3 g clove scales macros and micros together',()=>{
  assert.equal(genericNutritionInfo(garlic).fdcId,169230);
  assert.equal(garlic.servingSizes[0].quantity,3);
  const portion=scaleFood(garlic,3);
  near(portion.kcal,4.47);near(portion.protein,.1908);near(portion.carbs,.9918);
  near(portion.vitaminC,.936);near(portion.potassium,12.03);near(portion.b6,.03705);
  assert.equal(portion.biotin,null);
  assert.ok(foodOptions('ząbek czosnku').some(f=>f.id===garlic.id));
});

test('generic rustic sausage carries its proxy assumption and source-backed macro/mineral/B-vitamin values',()=>{
  const info=genericNutritionInfo(sausage);
  assert.equal(info.fdcId,174577);assert.match(info.method,/bez wskazanej marki/);
  const portion=scaleFood(sausage,50);
  near(portion.kcal,163);near(portion.protein,7.05);near(portion.fat,14.36);
  near(portion.salt,1.095);near(portion.iron,.72);near(portion.zinc,.965);
  near(portion.b12,.49);near(portion.b1,.251);
  assert.equal(foodOptions('kielbasa wiejska krucha')[0].id,sausage.id);
});

test('Jogurt High Protein defaults to a 200 g pack without changing its 100 g label or inventing missing label values',()=>{
  assert.equal(yogurt.name,'Jogurt High Protein');assert.equal(foodBasis(yogurt),100);
  assert.equal(defaultFoodQuantity(yogurt),200);
  assert.equal(defaultFoodQuantity({id:yogurt.id,unit:'g',name:'High Protein, kubek'}),200);
  assert.equal(defaultFoodQuantity(garlic),100);assert.equal(defaultFoodQuantity({unit:'tablet'}),1);
  assert.equal(yogurt.servingSizes[0].label,'Opakowanie 200 g');
  const pack=scaleFood(yogurt,200);
  near(pack.kcal,142);near(pack.protein,20);near(pack.carbs,13.4);near(pack.fat,.6);
  near(pack.calcium,240);near(pack.magnesium,24);near(pack.potassium,280);near(pack.b12,1.4);
  assert.equal(pack.sugars,null);assert.equal(pack.salt,null);assert.equal(pack.biotin,null);
  assert.match(yogurt.estimateNotes,/To przybliżenie/);assert.match(yogurt.sourceUrl,/DTU/);
  assert.equal(foodOptions('high protein kubek')[0].id,yogurt.id);
  assert.equal(foodOptions('jogurt hight protein')[0].id,yogurt.id);
  const total=sumNutrition([{food:yogurt,grams:200},{food:garlic,grams:3},{food:sausage,grams:50}]);
  near(total.totals.kcal,309.47);near(total.totals.b12,1.89);
});
