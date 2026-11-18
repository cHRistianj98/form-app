import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWeightTrend} from '../src/weightTrend.js';

const day='2026-11-18';
const reading=(day,weight)=>({day,weight});

test('trend compares two adjacent seven-calendar-day windows and ignores future measurements',()=>{
  const daily=Array.from({length:14},(_,i)=>reading(`2026-11-${String(i+5).padStart(2,'0')}`,i<7?100:90));
  const trend=buildWeightTrend([...daily,reading('2026-11-04',200),reading('2026-11-19',150)],day);
  assert.deepEqual(trend.current,{from:'2026-11-12',to:day,count:7,average:90});
  assert.deepEqual(trend.previous,{from:'2026-11-05',to:'2026-11-11',count:7,average:100});
  assert.equal(trend.change,-10);assert.deepEqual(trend.latest,reading(day,90));
  assert.equal(trend.points.some(point=>point.day>'2026-11-18'),false);
});

test('sparse windows average only actual readings and use daily rolling averages for chart points',()=>{
  const daily=[reading('2026-11-05',95),reading('2026-11-11',95.5),reading('2026-11-12',94.75),reading(day,94.25)];
  const trend=buildWeightTrend(daily,day);
  assert.equal(trend.current.average,94.5);assert.equal(trend.current.count,2);
  assert.equal(trend.previous.average,95.25);assert.equal(trend.previous.count,2);assert.equal(trend.change,-.75);
  assert.equal(trend.points.find(point=>point.day==='2026-11-12').average,95.13);
  assert.equal(trend.points.at(-1).average,94.5);assert.equal(trend.points.length,4);
  const historical=buildWeightTrend(daily,'2026-11-11');
  assert.equal(historical.current.average,95.25);assert.equal(historical.latest.day,'2026-11-11');
});

test('no observations, one observation and old observations stay distinct from zero or a fabricated baseline',()=>{
  const empty=buildWeightTrend([],day);
  assert.equal(empty.current.average,null);assert.equal(empty.previous.average,null);assert.equal(empty.change,null);assert.equal(empty.latest,null);assert.deepEqual(empty.points,[]);
  const single=buildWeightTrend([reading(day,94.75)],day);
  assert.equal(single.current.average,94.75);assert.equal(single.current.count,1);assert.equal(single.change,null);assert.equal(single.points[0].average,94.75);
  const stale=buildWeightTrend([reading('2026-09-01',94.75)],day);
  assert.equal(stale.latest.weight,94.75);assert.equal(stale.current.average,null);assert.equal(stale.previous.average,null);assert.deepEqual(stale.points,[]);
});

test('week boundaries remain correct through leap days, DST changes and New Year',()=>{
  for(const [date,from,previousFrom,previousTo] of [
    ['2024-03-01','2024-02-24','2024-02-17','2024-02-23'],
    ['2026-03-29','2026-03-23','2026-03-16','2026-03-22'],
    ['2026-10-25','2026-10-19','2026-10-12','2026-10-18'],
    ['2027-01-01','2026-12-26','2026-12-19','2026-12-25'],
  ]) {
    const trend=buildWeightTrend([reading(from,90),reading(previousTo,91)],date);
    assert.equal(trend.current.from,from);assert.equal(trend.previous.from,previousFrom);assert.equal(trend.previous.to,previousTo);assert.equal(trend.change,-1);
  }
});

test('duplicate days do not gain extra weight and invalid observations are ignored without mutating data',()=>{
  const daily=[reading(day,94.75),reading(day,100),reading('2026-11-17',94.25),reading('2026-11-31',95),reading('invalid',95),reading('2026-11-16',null),reading('2026-11-15',0),reading('2026-11-14','95'),reading('2026-11-13',501),reading('2026-11-12',Infinity)];
  const snapshot=structuredClone(daily),trend=buildWeightTrend(daily,day);
  assert.deepEqual(daily,snapshot);assert.equal(trend.current.count,2);assert.equal(trend.current.average,94.5);assert.equal(trend.latest.weight,94.75);
});

test('mean weights and visible differences retain hundredth precision at rounding boundaries',()=>{
  const trend=buildWeightTrend([reading('2026-11-11',94.76),reading('2026-11-12',94.74),reading(day,94.75)],day);
  assert.equal(trend.current.average,94.75);assert.equal(trend.change,-.01);
  const equal=buildWeightTrend([reading('2026-11-11',94.75),reading(day,94.75)],day);
  assert.equal(equal.change,0);
});

test('28-day chart retains earlier readings only as context for the rolling average',()=>{
  const trend=buildWeightTrend([reading('2026-10-21',100),reading('2026-10-22',90),reading(day,89)],day);
  assert.equal(trend.from,'2026-10-22');assert.equal(trend.points.length,2);assert.equal(trend.points[0].day,'2026-10-22');assert.equal(trend.points[0].average,95);
  assert.equal(trend.points.at(-1).average,89);
  for(const invalid of ['2026-02-29','2026-13-01','not-a-day',null])assert.throws(()=>buildWeightTrend([],invalid),/Invalid weight trend day/);
});
