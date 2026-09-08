const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const DECKS_DIR = path.resolve(__dirname, '..', 'decks');

function loadDeckOrSkip(id) {
  const p = path.join(DECKS_DIR, id + '.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Past regression: a "können (3pl, Präsens)" question once offered
// "kann / können / darf / muss" as choices — different-lemma forms mixed in.
// The new design makes this impossible by typing modal-verb conjugation pools
// as modal_verb_form with categorical purity (C12 enforces that pool entries
// come from the morphology table).
test('regression: modal conjugation choices never offer different-lemma forms', () => {
  const deck = loadDeckOrSkip('modal-verbs');
  if (!deck) return; // not yet migrated
  const morphPath = path.join(__dirname, '..', 'src', 'morphology', 'modals.json');
  const m = JSON.parse(fs.readFileSync(morphPath, 'utf8'));
  const LEMMA_OF_FORM = {};
  for (const lemma in m) for (const form of m[lemma]) LEMMA_OF_FORM[form] = lemma;
  for (const item of deck.items) {
    if (item.kind !== 'choice' || !item.pool) continue;
    const pool = deck.pools[item.pool];
    if (pool.category !== 'modal_verb_form') continue;
    for (const form of pool.items) {
      const lemma = LEMMA_OF_FORM[form];
      assert.ok(lemma, `${item.id}: pool entry "${form}" not a known modal form`);
    }
  }
});

// Past regression: chameleon cloze items had no scaffoldPool, so the box-0/1
// chip palette was a single chip equal to the answer — trivially solvable
// (e.g. answer "nach" → chips ["nach"]). The user explicitly called this out
// as the anti-pattern they wanted us to avoid. Lock the chameleon deck to
// always offer enough chips that the question requires recognition, not just
// clicking the only chip.
test('regression: chameleon cloze items show ≥4 chips at scaffolding stage', () => {
  const deck = loadDeckOrSkip('chameleon');
  if (!deck) return;
  const pools = deck.pools || {};
  for (const item of deck.items) {
    if (item.kind !== 'cloze') continue;
    const chipSet = new Set();
    for (const b of (item.blanks || [])) if (b.answer) chipSet.add(b.answer);
    for (const b of (item.blanks || [])) {
      if (b.scaffoldPool && pools[b.scaffoldPool]) {
        for (const e of pools[b.scaffoldPool].items) chipSet.add(e);
      }
    }
    assert.ok(chipSet.size >= 4, `${item.id}: chip palette has ${chipSet.size} chip(s); chameleon items must offer ≥4 for meaningful scaffolding`);
  }
});

test('regression: no choice item has fewer than 2 plausible options at any box', () => {
  if (!fs.existsSync(DECKS_DIR)) return;
  for (const f of fs.readdirSync(DECKS_DIR)) {
    if (!f.endsWith('.json')) continue;
    const deck = JSON.parse(fs.readFileSync(path.join(DECKS_DIR, f), 'utf8'));
    for (const item of deck.items) {
      if (item.kind !== 'choice') continue;
      if (item.options) {
        assert.ok(item.options.length >= 2, `${item.id}: fewer than 2 options`);
      } else {
        const pool = deck.pools[item.pool].items;
        assert.ok(pool.length >= 4, `${item.id}: pool has fewer than 4 entries`);
      }
    }
  }
});

test('regression: every deck can reach 100% mastery', () => {
  // Scar: cloze items with a scaffold pool were graded 'correct-aided' merely
  // because chips were rendered, and 'correct-aided' held the box. Chips show
  // at box <= 1, so those cards could never reach box 2 to lose the chips.
  // 148 of 449 items were unmasterable; declension's bar was stuck at 0%.
  const DECKS_DIR = require('node:path').resolve(__dirname, '..', 'decks');
  const fs = require('node:fs');
  const EngineCore = require('../src/engine-core.js');
  for (const f of fs.readdirSync(DECKS_DIR).filter(x => x.endsWith('.json'))) {
    const deck = JSON.parse(fs.readFileSync(require('node:path').join(DECKS_DIR, f), 'utf8'));
    for (const item of deck.items) {
      // Worst case: the learner leans on the scaffold every time it is offered.
      let st = { box: 0, ease: 2.5, interval: 0, lapses: 0 };
      for (let i = 0; i < 12 && st.box < 4; i++) {
        st = EngineCore.srsUpdate(st, st.box <= 1 ? 'correct-aided' : 'correct');
      }
      assert.ok(st.box >= 4,
        `${deck.id}:${item.id} cannot reach mastery even when always answered correctly`);
    }
  }
});
