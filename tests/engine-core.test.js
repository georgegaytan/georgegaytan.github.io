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

test('selectNextItem: returns null when no items', () => {
  const state = { items: {} };
  assert.strictEqual(EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0 }), null);
});

test('selectNextItem: prefers overdue items first', () => {
  const state = { items: {
    'a': { box: 2, due: '2026-05-10', topics: ['t1'] },
    'b': { box: 0, due: null, topics: ['t2'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0 });
  assert.strictEqual(id, 'a');
});

test('selectNextItem: prefers older overdue first', () => {
  const state = { items: {
    'a': { box: 2, due: '2026-05-12', topics: ['t1'] },
    'b': { box: 2, due: '2026-05-10', topics: ['t2'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0 });
  assert.strictEqual(id, 'b');
});

test('selectNextItem: low-box-not-seen-today after overdue', () => {
  const state = { items: {
    'lo': { box: 1, due: '2026-05-15', topics: ['t1'] },
    'hi': { box: 4, due: '2026-05-15', topics: ['t2'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0 });
  assert.strictEqual(id, 'lo');
});

test('selectNextItem: new items only if newToday < cap', () => {
  const state = { items: {
    'n1': { box: 0, due: null, topics: ['t1'] },
  }};
  const idAllowed = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0, newCap: 5 });
  assert.strictEqual(idAllowed, 'n1');
  const idAtCap = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 5, newCap: 5 });
  assert.strictEqual(idAtCap, null);
});

test('selectNextItem: never returns an item whose topics intersect the last item\'s', () => {
  const state = { items: {
    'a1': { box: 2, due: '2026-05-10', topics: ['nom_m'] },
    'a2': { box: 2, due: '2026-05-10', topics: ['nom_m'] },
    'b1': { box: 2, due: '2026-05-10', topics: ['acc_f'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: ['a1'], lastTopics: ['nom_m'], newToday: 0 });
  assert.strictEqual(id, 'b1');
});

test('selectNextItem: multi-topic cloze items respect topic intersection', () => {
  const state = { items: {
    'multi': { box: 2, due: '2026-05-10', topics: ['nom_m', 'adj_ending'] },
    'ok':    { box: 2, due: '2026-05-10', topics: ['gen_f'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], lastTopics: ['adj_ending'], newToday: 0 });
  assert.strictEqual(id, 'ok');
});

test('selectNextItem: skips items in sessionSeen', () => {
  const state = { items: {
    'a': { box: 2, due: '2026-05-10', topics: ['t1'] },
    'b': { box: 2, due: '2026-05-10', topics: ['t2'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: ['a'], newToday: 0 });
  assert.strictEqual(id, 'b');
});

test('selectNextItem: falls through to new items only after overdue + low-box exhausted', () => {
  const state = { items: {
    'overdue': { box: 2, due: '2026-05-10', topics: ['t1'] },
    'new': { box: 0, due: null, topics: ['t2'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0 });
  assert.strictEqual(id, 'overdue');
});
