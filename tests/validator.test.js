const test = require('node:test');
const assert = require('node:assert');
const { validateDeck, validateDecks } = require('../build/validator.js');

const validClozeItem = {
  id: 'x_001', kind: 'cloze', prompt: '{0} Mann liest.',
  blanks: [{ answer: 'Der', alts: ['der'], topic: 'nom_m_def' }],
};

function deck(items) {
  return { id: 't', name: 'Test', icon: '🧪', color: '#fff', description: 'd', items: items };
}

function deckWithPools(items, pools) {
  return { id: 't', name: 'Test', icon: '🧪', color: '#fff', description: 'd', pools: pools, items: items };
}

test('C1: duplicate item ids across decks → error', () => {
  const d1 = deck([{ id: 'dup', kind: 'text', prompt: 'a', answer: 'x', topic: 't' }]);
  const d2 = deck([{ id: 'dup', kind: 'text', prompt: 'b', answer: 'y', topic: 't' }]);
  const errs = validateDecks([d1, { ...d2, id: 'd2' }]);
  assert.ok(errs.some(e => e.code === 'C1' && e.severity === 'error'));
});

test('C2: cloze placeholder count mismatch → error', () => {
  const item = { id: 'a', kind: 'cloze', prompt: '{0} {1}', blanks: [{ answer: 'x', topic: 't' }] };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C2' && e.severity === 'error'));
});

test('C3: prompt contains literal answer as a whole word → error', () => {
  const item = { id: 'a', kind: 'text', prompt: 'der Apfel ist rot', answer: 'Apfel', topic: 't' };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C3' && e.severity === 'error'));
});

test('C3: answer substring inside a different word → no error (word boundary)', () => {
  const item = { id: 'a', kind: 'text', prompt: 'können', answer: 'kann', topic: 't' };
  const errs = validateDeck(deck([item]));
  assert.strictEqual(errs.filter(e => e.code === 'C3').length, 0);
});

test('C3: allowEcho:true suppresses C3 even when answer appears as a word', () => {
  const item = { id: 'a', kind: 'cloze', prompt: 'Ich kann das. Du {0} es auch.', blanks: [{ answer: 'kann', topic: 't' }], allowEcho: true };
  const errs = validateDeck(deck([item]));
  assert.strictEqual(errs.filter(e => e.code === 'C3').length, 0);
});

test('C4: topic not snake_case → error', () => {
  const item = { id: 'a', kind: 'text', prompt: 'p', answer: 'x', topic: 'BadTopic' };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C4' && e.severity === 'error'));
});

test('valid cloze item produces no errors', () => {
  const errs = validateDeck(deck([validClozeItem]));
  assert.strictEqual(errs.filter(e => e.severity === 'error').length, 0);
});

test('C5: choice with neither options nor pool → error', () => {
  const item = { id: 'a', kind: 'choice', prompt: 'p', answer: 'x', topic: 't' };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C5'));
});

test('C5: choice with BOTH options AND pool → error', () => {
  const item = { id: 'a', kind: 'choice', prompt: 'p', options: ['x','y'], pool: 'somepool', answer: 'x', topic: 't' };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C5'));
});

test('C6: choice options has fewer than 2 entries → error', () => {
  const item = { id: 'a', kind: 'choice', prompt: 'p', options: ['x'], answer: 'x', topic: 't' };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C6'));
});

test('C6: choice options has duplicates → error', () => {
  const item = { id: 'a', kind: 'choice', prompt: 'p', options: ['x','x','y'], answer: 'x', topic: 't' };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C6'));
});

test('C6: choice answer not in options → error', () => {
  const item = { id: 'a', kind: 'choice', prompt: 'p', options: ['x','y'], answer: 'z', topic: 't' };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C6'));
});

test('valid Mode A choice item produces no errors', () => {
  const item = { id: 'a', kind: 'choice', prompt: 'p', options: ['x','y','z'], answer: 'y', topic: 't' };
  const errs = validateDeck(deck([item]));
  assert.strictEqual(errs.filter(e => e.severity === 'error').length, 0);
});

test('C7: pool reference not in deck.pools → error', () => {
  const item = { id: 'a', kind: 'choice', prompt: 'p', pool: 'ghost', answer: 'x', topic: 't' };
  const errs = validateDeck(deckWithPools([item], {}));
  assert.ok(errs.some(e => e.code === 'C7'));
});

test('C8: pool exists but answer not in pool.items → error', () => {
  const pools = { p1: { category: 'modal_verb_form', items: ['kann','könnt','können','konnte'] } };
  const item = { id: 'a', kind: 'choice', prompt: 'p', pool: 'p1', answer: 'darf', topic: 't' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.ok(errs.some(e => e.code === 'C8'));
});

test('C9: pool.items.length < 4 → error', () => {
  const pools = { p1: { category: 'modal_verb_form', items: ['kann','könnt','können'] } };
  const item = { id: 'a', kind: 'choice', prompt: 'p', pool: 'p1', answer: 'können', topic: 't' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.ok(errs.some(e => e.code === 'C9'));
});

test('C10: pool.items has duplicates → error', () => {
  const pools = { p1: { category: 'modal_verb_form', items: ['kann','kann','können','könnt','konnte'] } };
  const item = { id: 'a', kind: 'choice', prompt: 'p', pool: 'p1', answer: 'können', topic: 't' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.ok(errs.some(e => e.code === 'C10'));
});

test('C11: pool.category not in allowlist → error', () => {
  const pools = { p1: { category: 'invented_category', items: ['a','b','c','d'] } };
  const item = { id: 'a', kind: 'choice', prompt: 'p', pool: 'p1', answer: 'a', topic: 't' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.ok(errs.some(e => e.code === 'C11'));
});

test('C11: pool missing category → error', () => {
  const pools = { p1: { items: ['a','b','c','d'] } };
  const item = { id: 'a', kind: 'choice', prompt: 'p', pool: 'p1', answer: 'a', topic: 't' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.ok(errs.some(e => e.code === 'C11'));
});

test('valid Mode B choice item produces no errors', () => {
  const pools = { p1: { category: 'modal_verb_form', items: ['kann','kannst','können','könnt','konnte'] } };
  const item = { id: 'a', kind: 'choice', prompt: '{0} sprechen', pool: 'p1', answer: 'können', topic: 'modal_k' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.strictEqual(errs.filter(e => e.severity === 'error').length, 0);
});

test('C12: modal_verb_form pool entry not in known modal forms → error', () => {
  const pools = { p1: { category: 'modal_verb_form', items: ['kann','können','könnt','frühstücken'] } };
  const item = { id: 'a', kind: 'choice', prompt: '{0} sprechen', pool: 'p1', answer: 'können', topic: 'modal_k' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.ok(errs.some(e => e.code === 'C12' && /frühstücken/.test(e.message)));
});

test('C12: definite_article pool with non-article entry → error', () => {
  const pools = { p1: { category: 'definite_article', items: ['der','die','das','meinem'] } };
  const item = { id: 'a', kind: 'choice', prompt: '{0} Mann', pool: 'p1', answer: 'der', topic: 'nom_m' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.ok(errs.some(e => e.code === 'C12' && /meinem/.test(e.message)));
});

test('C12: noun_gender pool with non-gender → error', () => {
  const pools = { p1: { category: 'noun_gender', items: ['der','die','das','den'] } };
  const item = { id: 'a', kind: 'choice', prompt: 'Apfel', pool: 'p1', answer: 'der', topic: 'g_m' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.ok(errs.some(e => e.code === 'C12' && /den/.test(e.message)));
});

test('C12: adj_ending pool with bogus entry → error', () => {
  const pools = { p1: { category: 'adj_ending', items: ['','e','en','XYZ'] } };
  const item = { id: 'a', kind: 'choice', prompt: 'rot{0}', pool: 'p1', answer: 'e', topic: 'ae' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.ok(errs.some(e => e.code === 'C12' && /XYZ/.test(e.message)));
});

test('C12: well-formed modal_verb_form pool produces no C12 error', () => {
  const pools = { p1: { category: 'modal_verb_form', items: ['kann','kannst','können','könnt','konnte'] } };
  const item = { id: 'a', kind: 'choice', prompt: '{0} sprechen', pool: 'p1', answer: 'können', topic: 'modal_k' };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.strictEqual(errs.filter(e => e.code === 'C12').length, 0);
});

test('C13: cloze blank with empty answer → error', () => {
  const item = { id: 'a', kind: 'cloze', prompt: '{0}', blanks: [{ answer: '', topic: 't' }] };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C13'));
});

test('C13: text with empty answer → error', () => {
  const item = { id: 'a', kind: 'text', prompt: 'p', answer: '', topic: 't' };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C13'));
});

test('C13: cloze with acceptAny and empty blank answer is OK', () => {
  const item = {
    id: 'a', kind: 'cloze', prompt: 'Ich {0} gehen.',
    blanks: [{ answer: '', topic: 'modal' }],
    acceptAny: [['kann'], ['muss'], ['will']]
  };
  const errs = validateDeck(deck([item]));
  assert.strictEqual(errs.filter(e => e.code === 'C13').length, 0);
});

test('C14: missing case-flipped alt at sentence start → warning', () => {
  const item = { id: 'a', kind: 'cloze', prompt: '{0} Mann liest.', blanks: [{ answer: 'Der', alts: [], topic: 'nom_m_def' }] };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C14' && e.severity === 'warning'));
});

test('C14: mid-sentence answer does NOT trigger spurious case-flip warning', () => {
  const item = { id: 'a', kind: 'cloze', prompt: 'Der Hund {0} schnell.', blanks: [{ answer: 'läuft', alts: [], topic: 'verb' }] };
  const errs = validateDeck(deck([item]));
  const caseFlipWarns = errs.filter(e => e.code === 'C14' && /Läuft/.test(e.message));
  assert.strictEqual(caseFlipWarns.length, 0);
});

test('C14: missing ae/oe/ue/ss variant → warning (regardless of position)', () => {
  const item = { id: 'a', kind: 'cloze', prompt: 'Ich {0} Deutsch lernen.', blanks: [{ answer: 'möchte', alts: [], topic: 'modal_m' }] };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C14' && /moechte/.test(e.message)));
});

test('C15: cloze translation missing → warning only', () => {
  const item = { id: 'a', kind: 'cloze', prompt: '{0} Mann liest.', blanks: [{ answer: 'Der', alts: ['der'], topic: 'nom_m_def' }] };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C15' && e.severity === 'warning'));
});

test('scaffoldPool: blank references undeclared pool → error', () => {
  const item = {
    id: 'a', kind: 'cloze', prompt: '{0} Mann',
    blanks: [{ answer: 'Der', alts: ['der'], topic: 'nom_m_def', scaffoldPool: 'ghost' }]
  };
  const errs = validateDeck(deckWithPools([item], {}));
  assert.ok(errs.some(e => e.code === 'C19' && /ghost/.test(e.message)));
});

test('scaffoldPool: blank references valid pool → no error', () => {
  const pools = { p1: { category: 'definite_article', items: ['der','die','das','den'] } };
  const item = {
    id: 'a', kind: 'cloze', prompt: '{0} Mann',
    blanks: [{ answer: 'Der', alts: ['der'], topic: 'nom_m_def', scaffoldPool: 'p1' }]
  };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.strictEqual(errs.filter(e => e.code === 'C19').length, 0);
});

test('scaffoldPool: answer not in pool → error', () => {
  const pools = { p1: { category: 'definite_article', items: ['der','die','das','den'] } };
  const item = {
    id: 'a', kind: 'cloze', prompt: '{0} Mann',
    blanks: [{ answer: 'Mann', alts: [], topic: 'noun', scaffoldPool: 'p1' }]
  };
  const errs = validateDeck(deckWithPools([item], pools));
  assert.ok(errs.some(e => e.code === 'C19' && /not in pool/.test(e.message)));
});

test('C16: same lemma asserted with different genders → error', () => {
  const d1 = {
    id: 'vocab', name: 'Vocab', icon: '📖', color: '#fff', description: 'd', items: [
      { id: 'v_apfel', kind: 'choice', prompt: 'Apfel', options: ['der','die','das'], answer: 'der', topic: 'gender_m' }
    ]
  };
  const d2 = {
    id: 'vocab2', name: 'V2', icon: '📖', color: '#fff', description: 'd', items: [
      { id: 'v2_apfel', kind: 'choice', prompt: 'Apfel', options: ['der','die','das'], answer: 'die', topic: 'gender_f' }
    ]
  };
  const errs = validateDecks([d1, d2]);
  assert.ok(errs.some(e => e.code === 'C16'));
});

test('C16: same lemma asserted consistently → no error', () => {
  const d1 = { id: 'vocab', name: 'V', icon: '📖', color: '#fff', description: 'd', items: [
    { id: 'v_apfel', kind: 'choice', prompt: 'Apfel', options: ['der','die','das'], answer: 'der', topic: 'gender_m' }
  ]};
  const d2 = { id: 'vocab2', name: 'V2', icon: '📖', color: '#fff', description: 'd', items: [
    { id: 'v2_apfel', kind: 'choice', prompt: 'Apfel', options: ['der','die','das'], answer: 'der', topic: 'gender_m' }
  ]};
  const errs = validateDecks([d1, d2]);
  assert.strictEqual(errs.filter(e => e.code === 'C16').length, 0);
});

test('C16: implicit gender from indefinite article disagrees with explicit → error', () => {
  const vocab = { id: 'vocab', name: 'V', icon: '📖', color: '#fff', description: 'd', items: [
    { id: 'v_apfel', kind: 'choice', prompt: 'Apfel', options: ['der','die','das'], answer: 'der', topic: 'gender_m' }
  ]};
  const decl = { id: 'decl', name: 'D', icon: '📐', color: '#fff', description: 'd', items: [
    { id: 'd_apfel_1', kind: 'cloze', prompt: '{0} Apfel ist rot.', blanks: [{ answer: 'eine', alts: [], topic: 'nom_indef' }] }
  ]};
  const errs = validateDecks([vocab, decl]);
  assert.ok(errs.some(e => e.code === 'C16' && /Apfel/.test(e.message)));
});

test('C16: implicit gender from definite article agrees → no error', () => {
  const vocab = { id: 'vocab', name: 'V', icon: '📖', color: '#fff', description: 'd', items: [
    { id: 'v_apfel', kind: 'choice', prompt: 'Apfel', options: ['der','die','das'], answer: 'der', topic: 'gender_m' }
  ]};
  const decl = { id: 'decl', name: 'D', icon: '📐', color: '#fff', description: 'd', items: [
    { id: 'd_apfel_1', kind: 'cloze', prompt: '{0} Apfel ist rot.', blanks: [{ answer: 'Der', alts: ['der'], topic: 'nom_m_def' }] }
  ]};
  const errs = validateDecks([vocab, decl]);
  assert.strictEqual(errs.filter(e => e.code === 'C16').length, 0);
});

test('C18: Mode A options all match a known category → error suggesting Mode B', () => {
  const item = {
    id: 'a', kind: 'choice', prompt: 'Sie ___ Deutsch sprechen.',
    options: ['kann','können','darf','muss'],
    answer: 'können', topic: 'modal_form'
  };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C18' && /modal_verb_form/.test(e.message)));
});

test('C18: Mode A with mixed-category options is fine', () => {
  const item = {
    id: 'a', kind: 'choice', prompt: 'doch (in this context):',
    options: ['however', 'yes (contradicting)', 'after all', 'particle of emphasis'],
    answer: 'however', topic: 'doch_meaning'
  };
  const errs = validateDeck(deck([item]));
  assert.strictEqual(errs.filter(e => e.code === 'C18').length, 0);
});

test('C18: noun_gender Mode A is fine (the canonical exception)', () => {
  const item = {
    id: 'a', kind: 'choice', prompt: 'Apfel',
    options: ['der','die','das'],
    answer: 'der', topic: 'gender_m'
  };
  const errs = validateDeck(deck([item]));
  assert.strictEqual(errs.filter(e => e.code === 'C18').length, 0);
});

test('C18: 2-option Mode A is exempt (intrinsic binary choice)', () => {
  const item = {
    id: 'a', kind: 'choice', prompt: 'Ich ___ gegangen.',
    options: ['bin','habe'],
    answer: 'bin', topic: 'aux_choice'
  };
  const errs = validateDeck(deck([item]));
  assert.strictEqual(errs.filter(e => e.code === 'C18').length, 0);
});
