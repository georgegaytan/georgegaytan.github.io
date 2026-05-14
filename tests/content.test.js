const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const EngineCore = require('../src/engine-core.js');

const DECKS_DIR = path.resolve(__dirname, '..', 'decks');

function allDecks() {
  if (!fs.existsSync(DECKS_DIR)) return [];
  return fs.readdirSync(DECKS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(DECKS_DIR, f), 'utf8')));
}

test('S2: every pooled choice item produces valid distractors at every box', () => {
  for (const deck of allDecks()) {
    for (const item of deck.items) {
      if (item.kind !== 'choice' || !item.pool) continue;
      const pool = deck.pools[item.pool].items;
      for (const box of [0, 1, 2, 3, 4, 5]) {
        const distractors = EngineCore.selectDistractors(pool, item.answer, box, 3, 42);
        assert.strictEqual(distractors.length, 3, `${deck.id}:${item.id}@box${box}: should have 3 distractors`);
        assert.strictEqual(new Set(distractors).size, 3, `${deck.id}:${item.id}@box${box}: duplicates among distractors`);
        assert.ok(!distractors.includes(item.answer), `${deck.id}:${item.id}@box${box}: distractor matches answer`);
        for (const d of distractors) {
          assert.ok(pool.includes(d), `${deck.id}:${item.id}@box${box}: distractor "${d}" not from declared pool`);
        }
      }
    }
  }
});

test('S2: every cloze item renders all blanks with matching {N} placeholders', () => {
  for (const deck of allDecks()) {
    for (const item of deck.items) {
      if (item.kind !== 'cloze') continue;
      const placeholders = (item.prompt || '').match(/\{(\d+)\}/g) || [];
      assert.strictEqual(placeholders.length, (item.blanks || []).length,
        `${deck.id}:${item.id}: placeholder count != blank count`);
      const indices = placeholders.map(p => parseInt(p.match(/\d+/)[0], 10)).sort((a,b)=>a-b);
      for (let i = 0; i < indices.length; i++) {
        assert.strictEqual(indices[i], i, `${deck.id}:${item.id}: placeholder indices not contiguous (got ${indices.join(',')})`);
      }
    }
  }
});

test('S2: text items have alts covering at least case-flip OR digraph (when applicable)', () => {
  let missing = 0;
  for (const deck of allDecks()) {
    for (const item of deck.items) {
      if (item.kind !== 'text') continue;
      const ans = item.answer || '';
      const alts = new Set(item.alts || []);
      const flipped = ans.length
        ? (ans[0] === ans[0].toUpperCase() ? ans[0].toLowerCase() : ans[0].toUpperCase()) + ans.slice(1)
        : '';
      const hasDigraph = /[äöüßÄÖÜ]/.test(ans);
      if (flipped && flipped !== ans && !alts.has(flipped)) missing++;
      if (hasDigraph) {
        const digraphed = ans
          .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
          .replace(/Ä/g,'Ae').replace(/Ö/g,'Oe').replace(/Ü/g,'Ue');
        if (digraphed !== ans && !alts.has(digraphed)) missing++;
      }
    }
  }
  if (missing > 0) console.log(`(S2 soft) ${missing} text item(s) missing expected alts`);
});

test('S2: cloze translations have non-zero content-word overlap with German prompt', () => {
  const PARTICLES = new Set(['ich','du','er','sie','es','wir','ihr','der','die','das','den','dem','des','und','oder','aber','mit','von','zu','in','auf','an','für']);
  let suspicious = 0;
  for (const deck of allDecks()) {
    for (const item of deck.items) {
      if (item.kind !== 'cloze' || !item.translation) continue;
      const germanWords = (item.prompt || '')
        .replace(/\{\d+\}/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 4 && !PARTICLES.has(w.toLowerCase()));
      const englishWords = item.translation.split(/\s+/).filter(w => w.length >= 4);
      if (germanWords.length >= 2 && englishWords.length === 0) {
        suspicious++;
        console.log(`(S2 translation) ${deck.id}:${item.id} translation likely too short or unrelated: "${item.translation}"`);
      }
    }
  }
  if (suspicious > 0) console.log(`(S2 soft) ${suspicious} cloze item(s) with suspect translations`);
});
