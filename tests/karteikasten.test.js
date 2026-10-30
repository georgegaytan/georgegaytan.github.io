const test = require('node:test');
const assert = require('node:assert');
const KK = require('../src/karteikasten.js');
const { LESSONS, BOOKS, AGAIN_GAP, keyOf, normalize, knownCount, buildQueue, requeue, markKnown, forget, summarize } = KK;

// A tiny fixture lesson so the logic tests don't depend on deck content.
const L = {
  id: 'L99', n: 99, title: 'Test', book: 'B1.1',
  cards: ['eins', 'zwei', 'drei', 'vier', 'fünf'].map(w => [w, w + '-en', 'Satz ' + w + '.', 'Sentence.', '', 0]),
};

test('data: every card is [de, en, example, translation, note, ch] with no blanks', () => {
  for (const lesson of LESSONS) {
    for (const c of lesson.cards) {
      assert.strictEqual(c.length, 6, `${lesson.id}: ${JSON.stringify(c)} should have 6 fields`);
      for (let i = 0; i < 4; i++) {
        assert.ok(typeof c[i] === 'string' && c[i].trim().length > 0, `${lesson.id}: empty field ${i} in ${JSON.stringify(c)}`);
      }
      assert.strictEqual(typeof c[4], 'string', `${lesson.id}: note must be a string in ${JSON.stringify(c)}`);
      assert.ok(c[5] === 0 || c[5] === 1, `${lesson.id}: CH flag must be 0 or 1 in ${JSON.stringify(c)}`);
    }
  }
});

test('data: lessons are numbered 1..n with unique ids and a known book', () => {
  const books = new Set(BOOKS.map(b => b[0]));
  const ids = new Set();
  LESSONS.forEach((lesson, i) => {
    assert.strictEqual(lesson.n, i + 1, `lesson ${lesson.id} is out of order`);
    assert.ok(!ids.has(lesson.id), `duplicate lesson id ${lesson.id}`);
    ids.add(lesson.id);
    assert.ok(books.has(lesson.book), `${lesson.id} names an unknown book ${lesson.book}`);
    assert.ok(lesson.cards.length > 0, `${lesson.id} has no cards`);
  });
  for (const [book] of BOOKS) assert.ok(LESSONS.some(l => l.book === book), `book ${book} has no lessons`);
});

test('data: card keys are unique within each lesson', () => {
  // Progress is stored as a list of keys per lesson. Two cards with one key
  // would be marked known together.
  for (const lesson of LESSONS) {
    const seen = new Set();
    for (const c of lesson.cards) {
      const k = keyOf(c);
      assert.ok(!seen.has(k), `${lesson.id}: duplicate card key "${k}"`);
      seen.add(k);
    }
  }
});

test('data: German text uses Swiss spelling (no ß outside the DE notes)', () => {
  // The textbook is the Swiss edition. The note field may quote the
  // standard-German form ("DE: zu Fuß"); the headword and example may not.
  for (const lesson of LESSONS) {
    for (const c of lesson.cards) {
      assert.ok(!c[0].includes('ß') && !c[2].includes('ß'), `${lesson.id}: ß in "${c[0]}" / "${c[2]}"`);
    }
  }
});

test('data: no "</" that could end the inline script', () => {
  assert.ok(!JSON.stringify(LESSONS).includes('</'));
});

test('normalize: a missing record gives the defaults', () => {
  const s = normalize(null, LESSONS);
  assert.deepStrictEqual(s, { lesson: LESSONS[0].id, dir: 'de', shuffle: true, known: {} });
});

test('normalize: keeps valid settings and drops invalid ones', () => {
  const s = normalize({ lesson: LESSONS[2].id, dir: 'en', shuffle: false, known: { L01: ['der Artikel, -'] } }, LESSONS);
  assert.deepStrictEqual(s, { lesson: LESSONS[2].id, dir: 'en', shuffle: false, known: { L01: ['der Artikel, -'] } });

  const bad = normalize({ lesson: 'L77', dir: 'fr', shuffle: 'yes', known: { L01: 'x', L02: [1, 'a'] } }, LESSONS);
  assert.strictEqual(bad.lesson, LESSONS[0].id, 'an unknown lesson falls back to the first');
  assert.strictEqual(bad.dir, 'de');
  assert.strictEqual(bad.shuffle, true);
  assert.deepStrictEqual(bad.known, { L02: ['a'] }, 'non-array entries and non-string keys are dropped');
});

test('knownCount: counts only keys that still name a card', () => {
  assert.strictEqual(knownCount(L, []), 0);
  assert.strictEqual(knownCount(L, ['eins', 'drei']), 2);
  // A card removed from the deck must not keep inflating the progress bar.
  assert.strictEqual(knownCount(L, ['eins', 'gelöscht']), 1);
});

test('buildQueue: book order skips known cards', () => {
  assert.deepStrictEqual(buildQueue(L, ['zwei', 'vier'], false), [0, 2, 4]);
});

test('buildQueue: shuffle is a permutation of the unknown cards', () => {
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const q = buildQueue(L, ['eins'], true, rnd);
  assert.deepStrictEqual(q.slice().sort(), [1, 2, 3, 4]);
  assert.notDeepStrictEqual(q, [1, 2, 3, 4], 'this seed should move something');
});

test('buildQueue: a fully known lesson gives an empty queue', () => {
  assert.deepStrictEqual(buildQueue(L, L.cards.map(keyOf), false), []);
});

test('requeue: a missed card comes back after AGAIN_GAP others', () => {
  const q = [10, 11, 12, 13, 14, 15];
  const out = requeue(q, 9);
  assert.strictEqual(out.indexOf(9), AGAIN_GAP);
  assert.deepStrictEqual(q, [10, 11, 12, 13, 14, 15], 'input must not be mutated');
});

test('requeue: with a short queue the missed card goes last', () => {
  assert.deepStrictEqual(requeue([1, 2], 9), [1, 2, 9]);
  assert.deepStrictEqual(requeue([], 9), [9]);
});

test('markKnown: adds the key once and leaves the input alone', () => {
  const before = { L99: ['eins'] };
  const after = markKnown(markKnown(before, L, L.cards[1]), L, L.cards[1]);
  assert.deepStrictEqual(after, { L99: ['eins', 'zwei'] });
  assert.deepStrictEqual(before, { L99: ['eins'] });
});

test('forget: clears one lesson and keeps the others', () => {
  const before = { L99: ['eins'], L01: ['a'] };
  assert.deepStrictEqual(forget(before, L), { L01: ['a'] });
  assert.deepStrictEqual(before, { L99: ['eins'], L01: ['a'] });
});

test('summarize: totals across lessons', () => {
  const M = { id: 'L98', n: 98, title: 'M', book: 'B1.2', cards: [['x', 'x', 'x.', 'x.', '', 0]] };
  assert.deepStrictEqual(summarize([L, M], { L99: ['eins', 'zwei'], L98: ['x'] }), { total: 6, known: 3, lessons: 2 });
});
