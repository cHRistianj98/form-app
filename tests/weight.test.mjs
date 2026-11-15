import test from 'node:test';
import assert from 'node:assert/strict';
import {formatWeight, parseWeight, stepWeight, weightError, weightRange} from '../src/weight.js';
import worker from '../worker/index.js';
import {DEFAULT_PROFILE} from '../src/profile.js';

test('weight accepts integers and one or two decimal places with either separator', () => {
  for (const [input, expected] of [['93',93], ['93,4',93.4], ['93.4',93.4], ['93,45',93.45], ['93.45',93.45], ['20,01',20.01], ['500.00',500], [' 85,25 ',85.25]]) {
    assert.equal(parseWeight(input), expected, input);
    assert.equal(weightError(input), '', input);
  }
});

test('invalid or overly precise input cannot silently become a different weight', () => {
  for (const input of ['', ' ', null, undefined, '93,456', '93.456', '19.99', '500,01', '-85', 'NaN', 'Infinity', '9e1', '0x55', '93,4.5', '93.', '93,', '.45', '93 kg']) {
    assert.equal(parseWeight(input), null, String(input));
    if (String(input ?? '').trim()) assert.ok(weightError(input));
  }
  assert.equal(weightError(''), '');
  assert.ok(weightError('', true));
});

test('weight formatting retains the second decimal in readings and changes', () => {
  assert.equal(formatWeight(93.45), '93,45');
  assert.equal(formatWeight(93.4), '93,4');
  assert.equal(formatWeight(93), '93');
  assert.equal(formatWeight(93.45 - 85.2), '8,25');
});

test('fine adjustments use hundredths without floating-point drift or leaving bounds', () => {
  assert.equal(stepWeight(93.45, 1), 93.46);
  assert.equal(stepWeight(93.45, -1), 93.44);
  assert.equal(stepWeight(93.99, 1), 94);
  assert.equal(stepWeight(20, -1), 20);
  assert.equal(stepWeight(500, 1), 500);
  let weight = 93.45;
  for (let i = 0; i < 100; i++) weight = stepWeight(weight, 1);
  assert.equal(weight, 94.45);
});

test('ruler stays near the entered weight and within the supported limits', () => {
  for (const weight of [20, 20.01, 25, 93.45, 495, 499.99, 500]) {
    const {min, max} = weightRange(weight);
    assert.ok(min >= 20 && max <= 500);
    assert.ok(weight >= min && weight <= max);
    assert.equal(max - min, 10);
  }
});

test('Worker saves and reloads hundredths in daily measurements and both profile weights', async () => {
  let daily = [], savedProfile = null, cookie = '';
  const env = {APP_PASSWORD:'weight-test-password', SESSION_SECRET:'weight-test-session-secret-over-20', DB:{
    prepare(sql) {
      return {
        bind(...args) {return {run:async () => {
          if (sql.startsWith('INSERT INTO daily_metrics')) {
            const [day, steps, weight, notes] = args;
            daily = [{day, steps, weight, notes}];
          }
          if (sql.startsWith('INSERT INTO settings')) savedProfile = JSON.parse(args[0]);
          return {success:true};
        }};},
        all:async () => ({results:sql.includes('daily_metrics') ? daily : []}),
        first:async () => sql.includes('settings')
          ? (savedProfile ? {value_json:JSON.stringify(savedProfile)} : null)
          : daily[0] ?? null,
      };
    },
  }};
  const ask = (path, method = 'GET', body) => worker.fetch(new Request('https://forma.test/api/' + path, {
    method, headers:{'Content-Type':'application/json', Cookie:cookie},
    ...(body ? {body:JSON.stringify(body)} : {}),
  }), env, {});
  const login = await ask('login', 'POST', {password:env.APP_PASSWORD});
  cookie = login.headers.get('Set-Cookie').split(';')[0];
  for (const weight of [93.45, 93.4, 93, 20.01, 499.99, null]) {
    assert.equal((await ask('daily', 'POST', {day:'2026-11-15', steps:1234, weight, notes:'Pomiar'})).status, 200);
    const state = await (await ask('state')).json();
    assert.equal(state.daily[0].weight, weight);
  }
  const profile = {...DEFAULT_PROFILE, startWeight:94.56, targetWeight:85.25};
  assert.equal((await ask('profile', 'POST', profile)).status, 200);
  const state = await (await ask('state')).json();
  assert.equal(state.profile.startWeight, 94.56);
  assert.equal(state.profile.targetWeight, 85.25);
});
