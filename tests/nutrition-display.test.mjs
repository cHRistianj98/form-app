import test from 'node:test';
import assert from 'node:assert/strict';
import {displayAmount,displayFoodNutrientLabel,displayTotal,nutrientDescription,readableNutritionNote} from '../src/nutritionDisplay.js';
import {sumNutrition,totalLabel} from '../src/nutritionStats.js';

test('friendly presentation removes inequality prefixes while keeping unknowns and upper bound rounding',()=>{
  assert.equal(displayAmount(null),'—');assert.equal(displayAmount(NaN),'—');
  assert.equal(displayAmount(5.79,false,2),'5,79');
  const food={fat:.005,upperBoundNutrients:['fat'],calcium:25,partialNutrients:['calcium']};
  assert.equal(displayFoodNutrientLabel(food,'fat'), '0,1');
  assert.equal(displayFoodNutrientLabel(food,'calcium'), '25');
  assert.equal(nutrientDescription(food,'fat'),'Górna granica z etykiety');
  assert.equal(nutrientDescription(food,'calcium'),'Dane częściowe');
  const summary=sumNutrition([{food,grams:200}]);
  assert.equal(displayTotal(summary,'calcium',2),'50');
  assert.equal(displayTotal(summary,'fat',2),'0,01');
  assert.equal(displayTotal(summary,'kcal'),'—');
  assert.equal(displayTotal(summary,'calcium',2,0),'—');
  assert.match(totalLabel(summary,'calcium'),/^≥ /);
  assert.equal(summary.coverage.calcium.complete,false);
  assert.equal(summary.coverage.fat.upper,true);
});

test('historical recipe explanations express inequalities in words',()=>{
  assert.equal(readableNutritionNote('Wartości ≥ 5, ≤ 10; >= 3, <= 7.'),'Wartości co najmniej 5, nie więcej niż 10; co najmniej 3, nie więcej niż 7.');
  assert.equal(readableNutritionNote('≈ 5 g; ~~ 10 g.'),'szacunkowo 5 g; szacunkowo 10 g.');
});
