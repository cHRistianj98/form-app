import test from 'node:test';
import assert from 'node:assert/strict';
import {FAVORITE_FOODS,scaleFood} from '../src/foods.js';
import {parseQuantity,quantityInBaseUnits,sliceGrams} from '../src/foodPortions.js';

test('Gouda and high protein slices count as 16 g and 14 g without changing the 100 g label',()=>{
  for(const [id,size,kcal,protein] of [['hochland-gouda',16,77.76,5.12],['lidl-protein-cheese',14,55.44,8.68]]) {
    const food=FAVORITE_FOODS.find(f=>f.id===`favorite:${id}`);
    assert.equal(sliceGrams(food),size);
    const grams=quantityInBaseUnits('2',food,'slice');
    assert.equal(grams,size*2);
    assert.ok(Math.abs(scaleFood(food,grams).kcal-kcal)<1e-9);
    assert.ok(Math.abs(scaleFood(food,grams).protein-protein)<1e-9);
    assert.equal(food.unit,'g');
    assert.equal(quantityInBaseUnits('100',food),100);
    assert.equal(quantityInBaseUnits('1,5',food,'slice'),size*1.5);
    assert.equal(quantityInBaseUnits('100000',food,'slice'),null);
  }
});

test('legacy cheese snapshots gain slice convenience without replacing their recorded nutrition',()=>{
  const old={id:'favorite:hochland-gouda',name:'Gouda',kcal:245,unit:'g'};
  const before=structuredClone(old);
  assert.equal(sliceGrams(old),16);
  assert.equal(quantityInBaseUnits('3',old,'slice'),48);
  assert.deepEqual(old,before);
  assert.equal(sliceGrams({id:old.id,unit:'ml'}),null);
  assert.equal(sliceGrams({id:'own:other',unit:'g'}),null);
});

test('quantity accepts dot/comma and rejects malformed, fractional tablets and out of range amounts',()=>{
  for(const [text,value] of [['100',100],['25,5',25.5],['25.50',25.5],['0,1',.1]])assert.equal(parseQuantity(text),value);
  for(const text of ['', '0', '0.01','-1','1e2','100001','1,2.3','1,234','1.','NaN'])assert.equal(parseQuantity(text),null,text);
  assert.equal(quantityInBaseUnits('1.5',{unit:'tablet'}),null);
  assert.equal(quantityInBaseUnits('2',{unit:'tablet'}),2);
  assert.equal(quantityInBaseUnits('0,01',{unit:'g',sliceGrams:14},'slice'),.14);
});
