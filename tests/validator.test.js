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
