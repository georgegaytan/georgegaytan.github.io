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

test('normalizeAnswer: trims and collapses whitespace', () => {
  assert.strictEqual(EngineCore.normalizeAnswer('  der   Mann  '), 'der mann');
});

test('normalizeAnswer: lowercases by default', () => {
  assert.strictEqual(EngineCore.normalizeAnswer('Der Mann'), 'der mann');
});

test('normalizeAnswer: preserves case when caseSensitive=true', () => {
  assert.strictEqual(EngineCore.normalizeAnswer('Der Mann', { caseSensitive: true }), 'Der Mann');
});

test('normalizeAnswer: maps ae→ä, oe→ö, ue→ü, ss→ß', () => {
  assert.strictEqual(EngineCore.normalizeAnswer('moechte'), 'möchte');
  assert.strictEqual(EngineCore.normalizeAnswer('Strasse'), 'straße');
  assert.strictEqual(EngineCore.normalizeAnswer('Aepfel'), 'äpfel');
  assert.strictEqual(EngineCore.normalizeAnswer('fuer'), 'für');
});

test('answersMatch: exact match', () => {
  assert.strictEqual(EngineCore.answersMatch('möchte', 'möchte', []), true);
});

test('answersMatch: accepts ae/oe/ue/ss variant', () => {
  assert.strictEqual(EngineCore.answersMatch('moechte', 'möchte', []), true);
  assert.strictEqual(EngineCore.answersMatch('Strasse', 'Straße', []), true);
});

test('answersMatch: case-insensitive by default', () => {
  assert.strictEqual(EngineCore.answersMatch('DER', 'der', []), true);
});

test('answersMatch: rejects mismatched answer', () => {
  assert.strictEqual(EngineCore.answersMatch('das', 'der', []), false);
});

test('answersMatch: accepts any alt', () => {
  assert.strictEqual(EngineCore.answersMatch('der Apfel', 'Apfel', ['der Apfel']), true);
});

test('answersMatch: case-sensitive when flag set, rejects wrong case', () => {
  assert.strictEqual(
    EngineCore.answersMatch('der', 'Der', [], { caseSensitive: true }),
    false
  );
});

test('selectDistractors: excludes the answer', () => {
  const pool = ['kann', 'kannst', 'können', 'könnt', 'konnte', 'konnten'];
  const distractors = EngineCore.selectDistractors(pool, 'können', 0, 3, 42);
  assert.strictEqual(distractors.includes('können'), false);
});

test('selectDistractors: returns exactly N distractors', () => {
  const pool = ['kann', 'kannst', 'können', 'könnt', 'konnte', 'konnten'];
  assert.strictEqual(EngineCore.selectDistractors(pool, 'können', 0, 3, 42).length, 3);
});

test('selectDistractors: all distractors unique', () => {
  const pool = ['kann', 'kannst', 'können', 'könnt', 'konnte', 'konnten'];
  const d = EngineCore.selectDistractors(pool, 'können', 0, 3, 42);
  assert.strictEqual(new Set(d).size, d.length);
});

test('selectDistractors: deterministic given same seed', () => {
  const pool = ['kann', 'kannst', 'können', 'könnt', 'konnte', 'konnten'];
  const a = EngineCore.selectDistractors(pool, 'können', 2, 3, 42);
  const b = EngineCore.selectDistractors(pool, 'können', 2, 3, 42);
  assert.deepStrictEqual(a, b);
});

test('selectDistractors: box 0 prefers far distractors (high Levenshtein)', () => {
  const pool = ['können', 'könnt', 'kann', 'verfassungsmäßig'];
  const distractors = EngineCore.selectDistractors(pool, 'können', 0, 1, 7);
  assert.strictEqual(distractors[0], 'verfassungsmäßig');
});

test('selectDistractors: box 4+ prefers near distractors (adversarial)', () => {
  const pool = ['können', 'könnt', 'kann', 'verfassungsmäßig'];
  const distractors = EngineCore.selectDistractors(pool, 'können', 4, 1, 7);
  assert.strictEqual(distractors[0], 'könnt');
});

test('selectDistractors: throws if pool too small', () => {
  assert.throws(
    () => EngineCore.selectDistractors(['a', 'b'], 'a', 0, 3, 42),
    /pool too small/i
  );
});
