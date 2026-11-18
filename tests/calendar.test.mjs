import test from 'node:test';
import assert from 'node:assert/strict';
import {adjacentDiaryDay,calendarCells,calendarDayLabel,dayInMonth,daySwipeDirection,monthStart,shiftMonth} from '../src/calendar.js';

test('calendar starts on Monday, marks the active month/today and disables future dates',()=>{
  const cells=calendarCells('2026-11-18','2026-11-18');
  assert.equal(cells.length,42);assert.equal(cells[0].day,'2026-10-26');
  assert.equal(cells[6].day,'2026-11-01');assert.equal(cells[6].inMonth,true);
  assert.equal(cells[0].inMonth,false);
  assert.equal(cells.find(c=>c.day==='2026-11-18').today,true);
  assert.equal(cells.find(c=>c.day==='2026-11-18').disabled,false);
  assert.equal(cells.find(c=>c.day==='2026-11-19').disabled,true);
  assert.equal(cells.filter(c=>c.inMonth).length,30);
});

test('calendar includes leap day and month/year navigation avoids day overflow',()=>{
  assert.equal(calendarCells('2024-02-01','2026-11-18').filter(c=>c.inMonth).length,29);
  assert.equal(calendarCells('2025-02-01','2026-11-18').filter(c=>c.inMonth).length,28);
  assert.equal(monthStart('2026-11-18'),'2026-11-01');
  assert.equal(shiftMonth('2026-01-31',1),'2026-02-01');
  assert.equal(shiftMonth('2026-12-15',1),'2027-01-01');
  assert.equal(shiftMonth('2026-01-15',-1),'2025-12-01');
  assert.equal(dayInMonth('2024-01-31','2024-02-01','2026-11-18'),'2024-02-29');
  assert.equal(dayInMonth('2025-01-31','2025-02-01','2026-11-18'),'2025-02-28');
  assert.equal(dayInMonth('2026-10-31','2026-11-01','2026-11-18'),'2026-11-18');
  assert.match(calendarDayLabel('2026-11-18'),/18 listopada 2026/);
});

test('right swipe goes back, left swipe advances, and small/vertical/diagonal/slow/multitouch drags are ignored',()=>{
  assert.equal(daySwipeDirection({dx:120,dy:8,duration:300}),-1);
  assert.equal(daySwipeDirection({dx:-120,dy:-20,duration:300}),1);
  for(const gesture of [
    {dx:20,dy:0,duration:100},{dx:5,dy:120,duration:300},
    {dx:80,dy:50,duration:300},{dx:120,dy:60,maxY:0,duration:300},
    {dx:120,dy:0,maxY:70,duration:300},{dx:120,dy:0,duration:1800},
    {dx:120,dy:0,duration:300,fingers:2},
  ])assert.equal(daySwipeDirection(gesture),0,JSON.stringify(gesture));
});

test('day navigation crosses month/leap boundaries and stops at today',()=>{
  assert.equal(adjacentDiaryDay('2026-11-01',-1,'2026-11-18'),'2026-10-31');
  assert.equal(adjacentDiaryDay('2024-03-01',-1,'2026-11-18'),'2024-02-29');
  assert.equal(adjacentDiaryDay('2026-11-17',1,'2026-11-18'),'2026-11-18');
  assert.equal(adjacentDiaryDay('2026-11-18',1,'2026-11-18'),'2026-11-18');
});
