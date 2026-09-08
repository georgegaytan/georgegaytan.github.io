// Session logic that used to live untested inside engine-ui.js. Every function
// here is pure: `today` is passed in, nothing touches Storage or the DOM.
const test = require('node:test');
const assert = require('node:assert');
const EngineCore = require('../src/engine-core.js');

const T = '2026-09-08';

function deck(id, itemIds, kind) {
  return {
    id,
    items: itemIds.map((iid, i) => (
      kind === 'cloze'
        ? { id: iid, kind: 'cloze', prompt: '{0}', blanks: [{ answer: 'x', topic: 'topic_' + (i % 2) }] }
        : { id: iid, kind: 'text', prompt: 'p', answer: 'a', topic: 'topic_' + (i % 2) }
    )),
  };
}

function itemState(over) {
  return Object.assign({ box: 0, ease: 2.5, interval: 0, due: null, lapses: 0, lastSeen: null, seenCount: 0 }, over);
}

// ---------------------------------------------------------------------------
// localDay / addDays
// ---------------------------------------------------------------------------

test('localDay: uses the local calendar day, not UTC', () => {
  // 23:30 local on the 8th. In any zone east of UTC this is still the 8th
  // locally but may already be the 9th (or still the 8th) in UTC - the point is
  // that the answer follows the wall clock the learner is looking at.
  const d = new Date(2026, 8, 8, 23, 30, 0);
  assert.strictEqual(EngineCore.localDay(d), '2026-09-08');
  const early = new Date(2026, 8, 9, 0, 30, 0);
  assert.strictEqual(EngineCore.localDay(early), '2026-09-09');
});

test('localDay: accepts a stored ISO instant and zero-pads', () => {
  const iso = new Date(2026, 0, 5, 12, 0, 0).toISOString();
  assert.strictEqual(EngineCore.localDay(iso), '2026-01-05');
  assert.strictEqual(EngineCore.localDay('not a date'), null);
});

test('addDays: pure calendar arithmetic across month and year ends', () => {
  assert.strictEqual(EngineCore.addDays('2026-01-31', 1), '2026-02-01');
  assert.strictEqual(EngineCore.addDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(EngineCore.addDays('2026-03-01', -1), '2026-02-28');
  assert.strictEqual(EngineCore.addDays('2026-09-08', 0), '2026-09-08');
});

// ---------------------------------------------------------------------------
// initDeckState
// ---------------------------------------------------------------------------

test('initDeckState: creates a complete state from nothing', () => {
  const d = deck('d', ['a', 'b']);
  const s = EngineCore.initDeckState(null, d, T);
  assert.strictEqual(s.deckId, 'd');
  assert.strictEqual(s.version, 1);
  assert.deepStrictEqual(Object.keys(s.items).sort(), ['a', 'b']);
  assert.strictEqual(s.items.a.box, 0);
  assert.strictEqual(s.sessionMeta.todayDate, T);
  assert.strictEqual(s.sessionMeta.newToday, 0);
});

test('initDeckState: adds items authored since the state was saved, keeps the rest', () => {
  const d = deck('d', ['a', 'b', 'c']);
  const saved = { deckId: 'd', version: 1, items: { a: itemState({ box: 3 }) }, sessionMeta: { todayDate: T, newToday: 4 } };
  const s = EngineCore.initDeckState(saved, d, T);
  assert.strictEqual(s, saved, 'mutates and returns the same object Storage holds');
  assert.strictEqual(s.items.a.box, 3, 'existing progress untouched');
  assert.strictEqual(s.items.b.box, 0);
  assert.strictEqual(s.items.c.box, 0);
  assert.strictEqual(s.sessionMeta.newToday, 4, 'same day keeps its counters');
});

test('initDeckState: resets daily counters on a new day', () => {
  const d = deck('d', ['a']);
  const saved = { items: { a: itemState() }, sessionMeta: { todayDate: '2026-09-07', newToday: 15 } };
  const s = EngineCore.initDeckState(saved, d, T);
  assert.strictEqual(s.sessionMeta.todayDate, T);
  assert.strictEqual(s.sessionMeta.newToday, 0);
});

test('initDeckState: tolerates a backup with no sessionMeta or items', () => {
  // Regression: an imported/hand-edited state without sessionMeta threw on
  // first open (reading .todayDate of undefined).
  const d = deck('d', ['a']);
  assert.doesNotThrow(() => EngineCore.initDeckState({ deckId: 'd' }, d, T));
  const s = EngineCore.initDeckState({ deckId: 'd', items: 'garbage' }, d, T);
  assert.strictEqual(s.items.a.box, 0);
  assert.strictEqual(s.sessionMeta.todayDate, T);
});

// ---------------------------------------------------------------------------
// isIntroduction / deckProgress / actionableCount
// ---------------------------------------------------------------------------

test('isIntroduction: only box 0 counts, regardless of the outcome that follows', () => {
  assert.strictEqual(EngineCore.isIntroduction(itemState({ box: 0 })), true);
  assert.strictEqual(EngineCore.isIntroduction(itemState({ box: 1 })), false);
  assert.strictEqual(EngineCore.isIntroduction(null), false);
  // A new card answered wrong leaves box 0 too (-> box 1): it must be tallied
  // against the daily cap exactly like one answered right.
  const before = itemState({ box: 0 });
  const after = EngineCore.srsUpdate(before, 'wrong');
  assert.strictEqual(after.box, 1);
  assert.strictEqual(EngineCore.isIntroduction(before), true);
});

test('deckProgress: counts box >= 4 as mastered', () => {
  assert.strictEqual(EngineCore.deckProgress(null), null);
  assert.strictEqual(EngineCore.deckProgress({ items: {} }), null);
  const p = EngineCore.deckProgress({ items: { a: itemState({ box: 4 }), b: itemState({ box: 3 }), c: itemState({ box: 6 }), d: itemState() } });
  assert.deepStrictEqual(p, { mastered: 2, total: 4, pct: 50, label: '2/4 mastered' });
});

test('actionableCount: overdue + struggling-not-seen-today + new within allowance', () => {
  const d = deck('d', ['over', 'strug', 'strugSeen', 'mastered', 'n1', 'n2', 'n3']);
  const seenNow = new Date(T + 'T12:00:00').toISOString();
  const state = { items: {
    over: itemState({ box: 2, due: '2026-09-01' }),
    strug: itemState({ box: 2, due: '2026-09-20' }),
    strugSeen: itemState({ box: 2, due: '2026-09-20', lastSeen: seenNow }),
    mastered: itemState({ box: 5, due: '2026-10-01' }),
    n1: itemState(), n2: itemState(), n3: itemState(),
  } };
  // 1 overdue + 1 struggling (the seen-today one is excluded) + min(3 new, allowance)
  assert.strictEqual(EngineCore.actionableCount(state, d, T, 0, 15), 5);
  assert.strictEqual(EngineCore.actionableCount(state, d, T, 14, 15), 3, 'one new slot left');
  assert.strictEqual(EngineCore.actionableCount(state, d, T, 15, 15), 2, 'cap reached: no new');
});

// ---------------------------------------------------------------------------
// buildDailyReviewQueue
// ---------------------------------------------------------------------------

const fixedRng = () => 0.5;

test('daily review: a never-opened deck contributes its new cards', () => {
  // Regression: decks with no saved state were skipped, so a fresh install
  // saw "No items due today" until every deck had been opened once by hand.
  const d1 = deck('d1', ['a', 'b']);
  const d2 = deck('d2', ['c', 'd']);
  const states = { d1: EngineCore.initDeckState(null, d1, T), d2: EngineCore.initDeckState(null, d2, T) };
  const q = EngineCore.buildDailyReviewQueue([d1, d2], states, T, { rng: fixedRng });
  assert.strictEqual(q.length, 4);
  assert.deepStrictEqual(new Set(q.map(e => e.deckId)), new Set(['d1', 'd2']));
  assert.ok(q.every(e => e.state && e.itemDef && e.deckDef), 'entries carry what the UI needs');
});

test('daily review: due and struggling cards come first, oldest due first', () => {
  const d = deck('d', ['late', 'later', 'strug', 'fresh']);
  const states = { d: { items: {
    late: itemState({ box: 2, due: '2026-09-01' }),
    later: itemState({ box: 2, due: '2026-09-05' }),
    strug: itemState({ box: 1, due: '2026-09-30' }),
    fresh: itemState(),
  }, sessionMeta: { todayDate: T, newToday: 0 } } };
  const q = EngineCore.buildDailyReviewQueue([d], states, T, { rng: fixedRng });
  const ids = q.map(e => e.itemDef.id);
  assert.strictEqual(ids[ids.length - 1], 'fresh', 'new cards trail the due ones');
  assert.ok(ids.indexOf('late') < ids.indexOf('later'), 'oldest due first');
});

test('daily review: respects each deck\'s remaining daily allowance', () => {
  // Regression: the review capped new cards at 15 in total but ignored how
  // many a deck had already introduced today, so a deck drill plus a review
  // could introduce 30 from one deck.
  const d = deck('d', Array.from({ length: 20 }, (_, i) => 'n' + i));
  const state = EngineCore.initDeckState(null, d, T);
  state.sessionMeta.newToday = 13;
  const q = EngineCore.buildDailyReviewQueue([d], { d: state }, T, { newCap: 15, rng: fixedRng });
  assert.strictEqual(q.length, 2, '15 - 13 = 2 new cards allowed from this deck');
  state.sessionMeta.newToday = 15;
  assert.strictEqual(EngineCore.buildDailyReviewQueue([d], { d: state }, T, { newCap: 15, rng: fixedRng }).length, 0);
});

test('daily review: caps new cards across decks and the queue length', () => {
  const decks = ['a', 'b', 'c'].map(id => deck(id, Array.from({ length: 20 }, (_, i) => id + i)));
  const states = {};
  for (const d of decks) states[d.id] = EngineCore.initDeckState(null, d, T);
  const q = EngineCore.buildDailyReviewQueue(decks, states, T, { newCap: 15, limit: 30, rng: Math.random });
  assert.strictEqual(q.length, 15, 'new cards are capped at newCap overall, even with 60 available');
  const q2 = EngineCore.buildDailyReviewQueue(decks, states, T, { newCap: 100, limit: 30, rng: Math.random });
  assert.strictEqual(q2.length, 30, 'and the queue never exceeds the session limit');
});

test('daily review: alternates decks and topics when the pool allows', () => {
  const d1 = deck('d1', ['a1', 'a2', 'a3']);
  const d2 = deck('d2', ['b1', 'b2', 'b3']);
  const states = { d1: EngineCore.initDeckState(null, d1, T), d2: EngineCore.initDeckState(null, d2, T) };
  const q = EngineCore.buildDailyReviewQueue([d1, d2], states, T, { rng: fixedRng });
  for (let i = 1; i < q.length; i++) {
    assert.notStrictEqual(q[i].deckId, q[i - 1].deckId, `same deck back-to-back at ${i}`);
  }
});

test('daily review: a struggling card seen today is left alone', () => {
  const d = deck('d', ['s']);
  const seenNow = new Date(T + 'T09:00:00').toISOString();
  const states = { d: { items: { s: itemState({ box: 1, due: '2026-09-30', lastSeen: seenNow }) }, sessionMeta: { todayDate: T } } };
  assert.strictEqual(EngineCore.buildDailyReviewQueue([d], states, T, { rng: fixedRng }).length, 0);
});

// ---------------------------------------------------------------------------
// Display decisions
// ---------------------------------------------------------------------------

test('uniformFirstCase: lowercases everything only when casing disagrees', () => {
  assert.deepStrictEqual(EngineCore.uniformFirstCase(['Nach', 'noch', 'schon']), ['nach', 'noch', 'schon']);
  assert.deepStrictEqual(EngineCore.uniformFirstCase(['Der', 'Die', 'Das']), ['Der', 'Die', 'Das'], 'uniform already');
  assert.deepStrictEqual(EngineCore.uniformFirstCase(['über', 'Über']), ['über', 'über'], 'handles umlauts');
});

test('hashCode / shuffleDeterministic: stable for a seed, different across seeds', () => {
  const a = EngineCore.hashCode('item:0'), b = EngineCore.hashCode('item:1');
  assert.notStrictEqual(a, b);
  assert.strictEqual(EngineCore.hashCode('item:0'), a);
  const x = EngineCore.shuffleDeterministic([1, 2, 3, 4, 5, 6, 7, 8], 42);
  const y = EngineCore.shuffleDeterministic([1, 2, 3, 4, 5, 6, 7, 8], 42);
  assert.deepStrictEqual(x, y);
  assert.deepStrictEqual(x.slice().sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
});
