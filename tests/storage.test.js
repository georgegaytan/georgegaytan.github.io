const test = require('node:test');
const assert = require('node:assert');
const { makeShim } = require('./_helpers/localStorageShim.js');

test('storage: loadDeck returns null when no state stored', () => {
  global.localStorage = makeShim();
  delete require.cache[require.resolve('../src/storage.js')];
  const Storage = require('../src/storage.js');
  assert.strictEqual(Storage.loadDeck('declension'), null);
});

test('storage: saveDeck then loadDeck round-trips state', () => {
  global.localStorage = makeShim();
  delete require.cache[require.resolve('../src/storage.js')];
  const Storage = require('../src/storage.js');
  const state = { deckId: 'declension', version: 1, items: { 'a': { box: 2 } } };
  Storage.saveDeck('declension', state);
  assert.deepStrictEqual(Storage.loadDeck('declension'), state);
});

test('storage: loadGlobal returns null when nothing stored', () => {
  global.localStorage = makeShim();
  delete require.cache[require.resolve('../src/storage.js')];
  const Storage = require('../src/storage.js');
  assert.strictEqual(Storage.loadGlobal(), null);
});

test('storage: saveGlobal then loadGlobal round-trips', () => {
  global.localStorage = makeShim();
  delete require.cache[require.resolve('../src/storage.js')];
  const Storage = require('../src/storage.js');
  const g = { version: 1, streak: { current: 5, lastDay: '2026-05-14' } };
  Storage.saveGlobal(g);
  assert.deepStrictEqual(Storage.loadGlobal(), g);
});

test('storage: listDeckIds returns ids for stored decks', () => {
  global.localStorage = makeShim();
  delete require.cache[require.resolve('../src/storage.js')];
  const Storage = require('../src/storage.js');
  Storage.saveDeck('declension', { items: {} });
  Storage.saveDeck('modal-verbs', { items: {} });
  assert.deepStrictEqual(Storage.listDeckIds().sort(), ['declension', 'modal-verbs']);
});

test('storage: exportAll captures global + all deck state', () => {
  global.localStorage = makeShim();
  delete require.cache[require.resolve('../src/storage.js')];
  const Storage = require('../src/storage.js');
  Storage.saveGlobal({ version: 1, streak: { current: 3, lastDay: '2026-05-14' } });
  Storage.saveDeck('declension', { items: { x: { box: 1 } } });
  const backup = Storage.exportAll();
  assert.strictEqual(backup.version, 1);
  assert.ok(typeof backup.exported === 'string');
  assert.strictEqual(backup.data.gd_global.streak.current, 3);
  assert.deepStrictEqual(backup.data.gd_deck_declension.items.x, { box: 1 });
});

test('storage: importAll restores state, returns true on success', () => {
  global.localStorage = makeShim();
  delete require.cache[require.resolve('../src/storage.js')];
  const Storage = require('../src/storage.js');
  const backup = {
    version: 1,
    exported: '2026-05-14T00:00:00Z',
    data: {
      gd_global: { version: 1, streak: { current: 7, lastDay: '2026-05-14' } },
      gd_deck_declension: { items: { foo: { box: 4 } } },
    },
  };
  assert.strictEqual(Storage.importAll(backup), true);
  assert.strictEqual(Storage.loadGlobal().streak.current, 7);
  assert.deepStrictEqual(Storage.loadDeck('declension').items.foo, { box: 4 });
});

test('storage: importAll rejects mismatched version', () => {
  global.localStorage = makeShim();
  delete require.cache[require.resolve('../src/storage.js')];
  const Storage = require('../src/storage.js');
  assert.strictEqual(Storage.importAll({ version: 99, data: {} }), false);
});
