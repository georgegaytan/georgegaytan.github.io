const test = require('node:test');
const assert = require('node:assert');
const { makeShim } = require('./_helpers/localStorageShim.js');
const { createMockBackend } = require('./_helpers/mockBackend.js');
const Storage = require('../src/storage.js');

function setup({ legacyData, backendSeed } = {}) {
  global.localStorage = makeShim();
  if (legacyData) {
    for (const [k, v] of Object.entries(legacyData)) {
      global.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }
  Storage._reset();
  const backend = createMockBackend(backendSeed);
  Storage._setBackend(backend);
  return { Storage, backend };
}

test('storage: loadDeck returns null when no state stored', () => {
  const { Storage } = setup();
  assert.strictEqual(Storage.loadDeck('declension'), null);
});

test('storage: saveDeck then loadDeck round-trips state', () => {
  const { Storage } = setup();
  const state = { deckId: 'declension', version: 1, items: { a: { box: 2 } } };
  Storage.saveDeck('declension', state);
  assert.deepStrictEqual(Storage.loadDeck('declension'), state);
});

test('storage: loadGlobal returns null when nothing stored', () => {
  const { Storage } = setup();
  assert.strictEqual(Storage.loadGlobal(), null);
});

test('storage: saveGlobal then loadGlobal round-trips', () => {
  const { Storage } = setup();
  const g = { version: 1, streak: { current: 5, lastDay: '2026-05-14' } };
  Storage.saveGlobal(g);
  assert.deepStrictEqual(Storage.loadGlobal(), g);
});

test('storage: listDeckIds returns ids for stored decks', () => {
  const { Storage } = setup();
  Storage.saveDeck('declension', { items: {} });
  Storage.saveDeck('modal-verbs', { items: {} });
  assert.deepStrictEqual(Storage.listDeckIds().sort(), ['declension', 'modal-verbs']);
});

test('storage: exportAll captures global + all deck state', () => {
  const { Storage } = setup();
  Storage.saveGlobal({ version: 1, streak: { current: 3, lastDay: '2026-05-14' } });
  Storage.saveDeck('declension', { items: { x: { box: 1 } } });
  const backup = Storage.exportAll();
  assert.strictEqual(backup.version, 1);
  assert.ok(typeof backup.exported === 'string');
  assert.strictEqual(backup.data.gd_global.streak.current, 3);
  assert.deepStrictEqual(backup.data.gd_deck_declension.items.x, { box: 1 });
});

test('storage: importAll restores state, returns true on success', () => {
  const { Storage } = setup();
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
  const { Storage } = setup();
  assert.strictEqual(Storage.importAll({ version: 99, data: {} }), false);
});

test('storage: saveDeck writes through to the backend', async () => {
  const { Storage, backend } = setup();
  Storage.saveDeck('declension', { items: { a: { box: 1 } } });
  await new Promise(r => setImmediate(r));
  assert.deepStrictEqual(backend.data.get('gd_deck_declension'), { items: { a: { box: 1 } } });
});

test('storage: saveGlobal writes through to the backend', async () => {
  const { Storage, backend } = setup();
  Storage.saveGlobal({ version: 1, streak: { current: 1, lastDay: '2026-05-14' } });
  await new Promise(r => setImmediate(r));
  assert.strictEqual(backend.data.get('gd_global').streak.current, 1);
});

test('storage: importAll writes through every restored key', async () => {
  const { Storage, backend } = setup();
  Storage.importAll({
    version: 1,
    exported: '2026-05-14T00:00:00Z',
    data: {
      gd_global: { version: 1, streak: { current: 7, lastDay: '2026-05-14' } },
      gd_deck_declension: { items: { foo: { box: 4 } } },
    },
  });
  await new Promise(r => setImmediate(r));
  assert.ok(backend.data.has('gd_global'));
  assert.ok(backend.data.has('gd_deck_declension'));
});

test('storage: init() hydrates the map from a non-empty backend', async () => {
  const seed = new Map([
    ['gd_global', { version: 1, streak: { current: 3, lastDay: '2026-05-14' } }],
    ['gd_deck_declension', { items: { foo: { box: 4 } } }],
  ]);
  const { Storage } = setup({ backendSeed: seed });
  await Storage.init();
  assert.strictEqual(Storage.loadGlobal().streak.current, 3);
  assert.deepStrictEqual(Storage.loadDeck('declension').items.foo, { box: 4 });
});

test('storage: init() returns the same promise on repeated calls', async () => {
  const { Storage } = setup();
  const a = Storage.init();
  const b = Storage.init();
  assert.strictEqual(a, b);
  await a;
});
