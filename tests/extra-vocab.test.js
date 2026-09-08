const test = require('node:test');
const assert = require('node:assert');
const EV = require('../src/extra-vocab.js');
const { DATA, EPISODES, INTERVALS, DAY, keyOf, activeIndices, isDue, nextEntry, dueIndices, shuffle, summarize, toTSV } = EV;

const NOW = Date.UTC(2026, 0, 15);

test('data: every row is [episode, de, en, example, translation] with no blanks', () => {
  for (const row of DATA) {
    assert.strictEqual(row.length, 5, `row ${JSON.stringify(row)} should have 5 fields`);
    assert.ok(Number.isInteger(row[0]) && row[0] >= 1 && row[0] <= EPISODES.length,
      `episode out of range: ${row[0]}`);
    for (let i = 1; i < 5; i++) {
      assert.ok(typeof row[i] === 'string' && row[i].trim().length > 0,
        `empty field ${i} in ${JSON.stringify(row)}`);
    }
  }
});

test('data: every episode has cards', () => {
  for (let e = 1; e <= EPISODES.length; e++) {
    assert.ok(DATA.some(r => r[0] === e), `episode ${e} has no cards`);
  }
});

test('data: card keys are unique', () => {
  const seen = new Set();
  for (const row of DATA) {
    const k = keyOf(row);
    assert.ok(!seen.has(k), `duplicate card key: ${k}`);
    seen.add(k);
  }
});

test('data: no German headword is repeated across episodes', () => {
  // A term appearing twice would be scheduled as two independent cards and
  // show up twice in an "Alle Folgen" round, which reads as a bug.
  const byTerm = new Map();
  for (const row of DATA) {
    const t = row[1];
    if (byTerm.has(t)) {
      assert.fail(`"${t}" appears in episodes ${byTerm.get(t)} and ${row[0]}`);
    }
    byTerm.set(t, row[0]);
  }
});

// Separable prefixes, longest first: the surface form in an example splits
// them off (rausfliegen -> fliegt raus), so the stem check has to look past
// the prefix as well as at the whole word.
const SEP_PREFIXES = ['zurück', 'vorbei', 'raus', 'rein', 'nach', 'über', 'unter',
  'durch', 'auf', 'aus', 'ein', 'mit', 'vor', 'an', 'ab', 'bei', 'los', 'weg', 'um', 'zu'];

// Prefixes of the headword that the example is allowed to match on: the whole
// word (4 chars, enough to survive a ge- participle like buchen -> gebucht) or
// the stem behind a separable prefix (3 chars, absagen -> abgesagt).
function stemsOf(word) {
  const out = [word.slice(0, 4)];
  for (const p of SEP_PREFIXES) {
    if (word.startsWith(p) && word.length - p.length >= 4) out.push(word.slice(p.length, p.length + 3));
  }
  return out;
}

test('data: the German example actually uses the headword', () => {
  // Smoke test against an example pasted onto the wrong entry. Only
  // single-word headwords are checked; multi-word entries and phrases are
  // exempt because there is no single stem to look for.
  const singleWord = DATA.filter(r => /^[a-zäöüß]+$/.test(r[1]));
  assert.ok(singleWord.length > 20, 'sanity: the filter should match a real slice of the deck');
  for (const row of singleWord) {
    const example = row[3].toLowerCase();
    assert.ok(stemsOf(row[1].toLowerCase()).some(s => example.includes(s)),
      `example for "${row[1]}" doesn't use it: ${row[3]}`);
  }
});

test('data: the stem check would catch a swapped example', () => {
  assert.ok(!stemsOf('buchen').some(s => 'die ziehung ist heute abend um acht.'.includes(s)));
  assert.ok(stemsOf('buchen').some(s => 'ich habe schon ein hotel gebucht.'.includes(s)));
  assert.ok(stemsOf('rausfliegen').some(s => 'der typ fliegt raus, und zwar sofort!'.includes(s)));
});

test('activeIndices: all vs. episode selection', () => {
  const all = activeIndices(DATA, true, {});
  assert.strictEqual(all.length, DATA.length);

  const ep3 = activeIndices(DATA, false, { 3: true });
  assert.ok(ep3.length > 0);
  assert.ok(ep3.every(i => DATA[i][0] === 3));

  const ep3and7 = activeIndices(DATA, false, { 3: true, 7: true });
  assert.strictEqual(ep3and7.length, ep3.length + activeIndices(DATA, false, { 7: true }).length);

  assert.deepStrictEqual(activeIndices(DATA, false, {}), []);
});

test('isDue: unseen cards are due, scheduled ones wait', () => {
  assert.ok(isDue(undefined, NOW));
  assert.ok(isDue({ b: 2, d: NOW - 1 }, NOW));
  assert.ok(isDue({ b: 2, d: NOW }, NOW), 'due exactly now counts as due');
  assert.ok(!isDue({ b: 2, d: NOW + 1 }, NOW));
});

test('nextEntry: a hit steps one box out, a miss resets to box 0', () => {
  const fresh = nextEntry(undefined, true, NOW);
  assert.strictEqual(fresh.b, 1);
  assert.strictEqual(fresh.d, NOW + INTERVALS[1] * DAY);

  const second = nextEntry(fresh, true, NOW);
  assert.strictEqual(second.b, 2);

  const missed = nextEntry(second, false, NOW);
  assert.strictEqual(missed.b, 0);
  assert.strictEqual(missed.d, NOW, 'a missed card is due again immediately');
  assert.ok(isDue(missed, NOW));
});

test('nextEntry: box is capped at the last interval', () => {
  let e = undefined;
  for (let i = 0; i < 20; i++) e = nextEntry(e, true, NOW);
  assert.strictEqual(e.b, INTERVALS.length - 1);
  assert.strictEqual(e.d, NOW + INTERVALS[INTERVALS.length - 1] * DAY);
});

test('dueIndices: filters out cards scheduled into the future', () => {
  const idx = activeIndices(DATA, false, { 1: true });
  const progress = {};
  progress[keyOf(DATA[idx[0]])] = { b: 3, d: NOW + 5 * DAY };
  progress[keyOf(DATA[idx[1]])] = { b: 1, d: NOW - DAY };

  const due = dueIndices(DATA, idx, progress, NOW);
  assert.ok(!due.includes(idx[0]), 'future card should not be due');
  assert.ok(due.includes(idx[1]), 'overdue card should be due');
  assert.strictEqual(due.length, idx.length - 1);
});

test('shuffle: preserves membership and does not mutate the input', () => {
  const input = [0, 1, 2, 3, 4, 5, 6, 7];
  const seq = [0.9, 0.1, 0.5, 0.3, 0.7, 0.2, 0.4];
  let i = 0;
  const out = shuffle(input, () => seq[i++ % seq.length]);
  assert.deepStrictEqual(input, [0, 1, 2, 3, 4, 5, 6, 7], 'input untouched');
  assert.deepStrictEqual(out.slice().sort((a, b) => a - b), input);
});

test('summarize: buckets cards by box and counts what is due', () => {
  const idx = activeIndices(DATA, false, { 6: true });
  const progress = {};
  progress[keyOf(DATA[idx[0]])] = { b: 1, d: NOW + DAY };       // learning, not due
  progress[keyOf(DATA[idx[1]])] = { b: 5, d: NOW + 10 * DAY };  // solid, not due
  progress[keyOf(DATA[idx[2]])] = { b: 4, d: NOW - DAY };       // solid, due

  const s = summarize(DATA, idx, progress, NOW);
  assert.strictEqual(s.total, idx.length);
  assert.strictEqual(s.fresh, idx.length - 3);
  assert.strictEqual(s.learning, 1);
  assert.strictEqual(s.solid, 2);
  assert.strictEqual(s.due, idx.length - 2, 'unseen cards plus the overdue one');
});

test('toTSV: five tab-separated columns per card, zero-padded episode tag', () => {
  const idx = activeIndices(DATA, false, { 1: true, 12: true });
  const lines = toTSV(DATA, idx).split('\n');
  assert.strictEqual(lines.length, idx.length);
  for (const line of lines) {
    const cols = line.split('\t');
    assert.strictEqual(cols.length, 5, `bad column count: ${line}`);
    assert.match(cols[4], /^extra ep(01|12)$/);
  }
  assert.ok(lines.some(l => l.endsWith('extra ep01')));
  assert.ok(lines.some(l => l.endsWith('extra ep12')));
});

test('toTSV: no field contains a tab or newline that would break the import', () => {
  for (const row of DATA) {
    for (let i = 1; i < 5; i++) {
      assert.ok(!/[\t\n\r]/.test(row[i]), `field ${i} of "${row[1]}" contains a separator`);
    }
  }
});

test('module: the storage key is namespaced so it rides along in backups', () => {
  assert.strictEqual(EV.DECK_ID, 'extra-vocab');
});

