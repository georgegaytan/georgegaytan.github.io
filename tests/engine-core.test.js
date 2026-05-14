const test = require('node:test');
const assert = require('node:assert');
const EngineCore = require('../src/engine-core.js');

test('engine-core: module exports an object', () => {
  assert.strictEqual(typeof EngineCore, 'object');
  assert.notStrictEqual(EngineCore, null);
});

test('srsUpdate: new item correct → box 1, interval 1', () => {
  const item = { box: 0, ease: 2.5, interval: 0, lapses: 0 };
  const updated = EngineCore.srsUpdate(item, 'correct');
  assert.strictEqual(updated.box, 1);
  assert.strictEqual(updated.ease, 2.5);
  assert.strictEqual(updated.interval, 1);
  assert.strictEqual(updated.lapses, 0);
});

test('srsUpdate: box 2 correct → box 3, interval grows by ease', () => {
  const item = { box: 2, ease: 2.5, interval: 3, lapses: 0 };
  const updated = EngineCore.srsUpdate(item, 'correct');
  assert.strictEqual(updated.box, 3);
  assert.strictEqual(updated.ease, 2.5);
  assert.strictEqual(updated.interval, 8);
});

test('srsUpdate: correct-aided holds box, grows interval by ease * 0.5', () => {
  const item = { box: 2, ease: 2.5, interval: 4, lapses: 0 };
  const updated = EngineCore.srsUpdate(item, 'correct-aided');
  assert.strictEqual(updated.box, 2);
  assert.strictEqual(updated.ease, 2.5);
  assert.strictEqual(updated.interval, 5);
});

test('srsUpdate: wrong resets box to 1, drops ease by 0.15, interval to 1, lapses++', () => {
  const item = { box: 3, ease: 2.5, interval: 12, lapses: 0 };
  const updated = EngineCore.srsUpdate(item, 'wrong');
  assert.strictEqual(updated.box, 1);
  assert.strictEqual(updated.ease, 2.35);
  assert.strictEqual(updated.interval, 1);
  assert.strictEqual(updated.lapses, 1);
});

test('srsUpdate: ease floors at 1.3', () => {
  const item = { box: 5, ease: 1.4, interval: 30, lapses: 5 };
  const updated = EngineCore.srsUpdate(item, 'wrong');
  assert.strictEqual(updated.ease, 1.3);
});

test('srsUpdate: minimum interval is 1', () => {
  const item = { box: 0, ease: 2.5, interval: 0, lapses: 0 };
  const updated = EngineCore.srsUpdate(item, 'correct');
  assert.strictEqual(updated.interval, 1);
});

test('srsUpdate: throws on unknown outcome', () => {
  const item = { box: 0, ease: 2.5, interval: 0, lapses: 0 };
  assert.throws(() => EngineCore.srsUpdate(item, 'maybe'), /unknown outcome/i);
});
