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

test('storage: init() with a failing hydrate marks Storage degraded', async () => {
  const { createFailingBackend } = require('./_helpers/mockBackend.js');
  global.localStorage = makeShim();
  Storage._reset();
  Storage._setBackend(createFailingBackend('hydrate'));
  await Storage.init();
  assert.strictEqual(Storage.isDegraded(), true);
  assert.strictEqual(Storage.loadGlobal(), null);
});

test('storage: init() migrates legacy localStorage keys when backend empty', async () => {
  const { Storage, backend } = setup({
    legacyData: {
      gd_global: { version: 1, streak: { current: 5, lastDay: '2026-05-14' } },
      gd_deck_declension: { items: { x: { box: 2 } } },
    },
  });
  await Storage.init();
  assert.ok(backend.data.has('gd_global'), 'gd_global copied to backend');
  assert.ok(backend.data.has('gd_deck_declension'), 'deck copied to backend');
  assert.ok(backend.data.has('migrated_to_idb'), 'migration marker written');
  assert.strictEqual(Storage.loadGlobal().streak.current, 5);
  assert.strictEqual(Storage.loadDeck('declension').items.x.box, 2);
});

test('storage: migration clears legacy localStorage keys after copy', async () => {
  const { Storage } = setup({
    legacyData: {
      gd_global: { version: 1 },
      gd_deck_a: { items: {} },
      gd_deck_b: { items: {} },
      unrelated_key: 'should stay',
    },
  });
  await Storage.init();
  assert.strictEqual(global.localStorage.getItem('gd_global'), null);
  assert.strictEqual(global.localStorage.getItem('gd_deck_a'), null);
  assert.strictEqual(global.localStorage.getItem('gd_deck_b'), null);
  assert.strictEqual(global.localStorage.getItem('unrelated_key'), 'should stay');
});

test('storage: migration is idempotent - second init does not re-migrate', async () => {
  const { Storage, backend } = setup({
    legacyData: { gd_deck_x: { items: {} } },
  });
  await Storage.init();
  global.localStorage.setItem('gd_deck_y', JSON.stringify({ items: { y: { box: 1 } } }));
  Storage._reset();
  Storage._setBackend({
    data: backend.data,
    hydrate() { return Promise.resolve(new Map(backend.data)); },
    put(k, v) { backend.data.set(k, v); return Promise.resolve(); },
    del(k) { backend.data.delete(k); return Promise.resolve(); },
  });
  await Storage.init();
  assert.strictEqual(backend.data.has('gd_deck_y'), false, 'second init must not migrate gd_deck_y');
  assert.ok(global.localStorage.getItem('gd_deck_y') !== null, 'gd_deck_y still in localStorage (not migrated)');
});

test('storage: malformed legacy JSON is skipped, others still migrate', async () => {
  const { Storage, backend } = setup();
  global.localStorage.setItem('gd_global', '{invalid');
  global.localStorage.setItem('gd_deck_a', JSON.stringify({ items: { a: { box: 1 } } }));
  await Storage.init();
  assert.strictEqual(backend.data.has('gd_global'), false, 'malformed key skipped');
  assert.ok(backend.data.has('gd_deck_a'), 'sibling still migrated');
  assert.ok(backend.data.has('migrated_to_idb'), 'marker still written');
});

test('storage: when primary backend hydrate rejects, falls back to localStorage', async () => {
  const { createFailingBackend } = require('./_helpers/mockBackend.js');
  global.localStorage = makeShim();
  global.localStorage.setItem('gd_global', JSON.stringify({ version: 1, streak: { current: 9, lastDay: '2026-05-14' } }));
  Storage._reset();
  Storage._setBackend(createFailingBackend('hydrate'));
  await Storage.init();
  assert.strictEqual(Storage.isDegraded(), true);
  assert.strictEqual(Storage.loadGlobal().streak.current, 9);
});

test('storage: init() does not throw when navigator.storage is absent (Node env)', async () => {
  const { Storage } = setup();
  await Storage.init();
  assert.ok(true);
});
