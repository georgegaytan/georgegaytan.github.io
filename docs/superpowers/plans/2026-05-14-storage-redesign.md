# Storage Redesign Implementation Plan (Option D)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move persisted state from `localStorage` to IndexedDB, request persistent-storage permission, and migrate legacy data once — eliminating the iOS-Safari "progress randomly wiped" failure mode.

**Architecture:** `src/storage.js` keeps its existing 7-function synchronous public API (so engine-ui.js is essentially untouched), but its internals become: (1) an in-memory `Map` as the runtime source of truth, (2) a pluggable async backend driver `{hydrate, put, del}` (real IDB in browser, localStorage fallback if IDB fails, mock in tests), (3) an idempotent `Storage.init()` that hydrates the map at boot, performs a one-time migration from legacy `localStorage` keys, and feature-detects `navigator.storage.persist()`.

**Tech Stack:** Vanilla JavaScript (UMD pattern), built-in `node:test`, hand-rolled mock backend in tests. No npm deps. No bundler. No transpiler.

**Source spec:** [`docs/superpowers/specs/2026-05-14-storage-redesign-design.md`](../specs/2026-05-14-storage-redesign-design.md).

---

## Plan Conventions

- Every implementation step shows actual code, not "implement X."
- Every test step shows actual assertions and the command to run them.
- Every task ends with a commit step. One commit per task; sometimes more.
- TDD: write failing test → confirm it fails → implement minimum → confirm pass → commit.
- All commits sign as `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- The default test command on this project is bare `node --test` (Node 24 on Windows treats `node --test tests/` as a module path).
- All log lines emitted by `src/storage.js` use the prefix `[gd-storage]` for easy filtering.

---

## Naming and constants (referenced throughout)

| Name | Value | Where defined |
|---|---|---|
| `GLOBAL_KEY` | `'gd_global'` | `src/storage.js` (module top) |
| `DECK_KEY_PREFIX` | `'gd_deck_'` | `src/storage.js` (module top) |
| `MIGRATED_MARKER` | `'migrated_to_idb'` | `src/storage.js` (module top) |
| IDB database name | `'gd_storage'` | `makeIdbBackend()` |
| IDB object-store name | `'kv'` | `makeIdbBackend()` |
| IDB schema version | `1` | `makeIdbBackend()` |

Backend interface (every backend implements this):

```js
{
  hydrate(): Promise<Map<string, any>>,
  put(key: string, value: any): Promise<void>,
  del(key: string): Promise<void>
}
```

---

## Phase 0 — Test scaffold for the new world

Existing `tests/storage.test.js` calls `delete require.cache[...]` between tests. The new design uses explicit reset/inject hooks. Phase 0 lays those hooks down first so every later phase can write straight-line TDD against them.

### Task 0.1: Add `createMockBackend` helper to test helpers directory

**Files:**
- Create: `tests/_helpers/mockBackend.js`

- [ ] **Step 1: Write the helper**

`tests/_helpers/mockBackend.js`:

```js
function createMockBackend(seed) {
  const data = new Map(seed || []);
  return {
    data,
    hydrate() { return Promise.resolve(new Map(data)); },
    put(k, v) { data.set(k, v); return Promise.resolve(); },
    del(k) { data.delete(k); return Promise.resolve(); },
  };
}

function createFailingBackend(stage) {
  return {
    data: new Map(),
    hydrate() { return stage === 'hydrate' ? Promise.reject(new Error('hydrate failed')) : Promise.resolve(new Map()); },
    put() { return stage === 'put' ? Promise.reject(new Error('put failed')) : Promise.resolve(); },
    del() { return stage === 'del' ? Promise.reject(new Error('del failed')) : Promise.resolve(); },
  };
}

module.exports = { createMockBackend, createFailingBackend };
```

- [ ] **Step 2: Smoke-check that the helper requires cleanly**

Run: `node -e "console.log(require('./tests/_helpers/mockBackend.js'))"`
Expected: prints `{ createMockBackend: [Function: ...], createFailingBackend: [Function: ...] }`. No throw.

- [ ] **Step 3: Commit**

```bash
git add tests/_helpers/mockBackend.js
git commit -m "$(cat <<'EOF'
test: add mock backend helpers for storage tests

createMockBackend returns a fresh Map-backed driver implementing
{hydrate, put, del}; createFailingBackend lets tests target a single
stage of the driver to fail. Used by upcoming Storage.init / migration
tests.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Rewrite `src/storage.js` against a mock backend

Refactor `src/storage.js` so the public 7 functions stay sync but read/write through an in-memory map, with `backend.put`/`backend.del` fired as fire-and-forget side effects. The legacy `localStorage` code path moves into a *backend driver* (used only as the IDB-failure fallback). Phase 1 ends with the *mock* backend wired in; the real IDB backend lands in Phase 4.

### Task 1.1: Rewrite `tests/storage.test.js` to use `_reset` / `_setBackend`

**Files:**
- Modify: `tests/storage.test.js` (full rewrite)

- [ ] **Step 1: Replace the file**

`tests/storage.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail (the new `_reset`/`_setBackend` hooks don't exist yet)**

Run: `node --test tests/storage.test.js`
Expected: All 8 tests fail with `TypeError: Storage._reset is not a function` or `Storage._setBackend is not a function`.

- [ ] **Step 3: Commit (red)**

```bash
git add tests/storage.test.js
git commit -m "$(cat <<'EOF'
test: port storage tests to _reset / _setBackend hooks (red)

Drops the per-test delete-require-cache trick and instead asks the
module to expose explicit reset and backend-injection hooks. Tests
fail until Phase 1.2 lands the rewrite.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.2: Rewrite `src/storage.js` to use in-memory Map + mock backend

**Files:**
- Modify: `src/storage.js` (full rewrite)

- [ ] **Step 1: Replace the file**

`src/storage.js`:

```js
(function (global) {
  const DECK_KEY_PREFIX = 'gd_deck_';
  const GLOBAL_KEY = 'gd_global';
  const MIGRATED_MARKER = 'migrated_to_idb';

  // ---- module state ----
  let storageMap = new Map();
  let backend = null;
  let initPromise = null;
  let degraded = false;

  // ---- helpers ----
  function ls() { return global.localStorage; }

  function isManagedKey(k) {
    return k === GLOBAL_KEY || k === MIGRATED_MARKER || (typeof k === 'string' && k.startsWith(DECK_KEY_PREFIX));
  }

  function safePut(key, value) {
    if (!backend) return;
    try {
      const p = backend.put(key, value);
      if (p && typeof p.catch === 'function') {
        p.catch(err => console.warn('[gd-storage] put failed:', key, err));
      }
    } catch (err) {
      console.warn('[gd-storage] put threw:', key, err);
    }
  }

  // ---- public API (sync) ----
  function loadDeck(deckId) {
    const v = storageMap.get(DECK_KEY_PREFIX + deckId);
    return v == null ? null : v;
  }

  function saveDeck(deckId, state) {
    const key = DECK_KEY_PREFIX + deckId;
    storageMap.set(key, state);
    safePut(key, state);
  }

  function loadGlobal() {
    const v = storageMap.get(GLOBAL_KEY);
    return v == null ? null : v;
  }

  function saveGlobal(state) {
    storageMap.set(GLOBAL_KEY, state);
    safePut(GLOBAL_KEY, state);
  }

  function listDeckIds() {
    const ids = [];
    for (const key of storageMap.keys()) {
      if (typeof key === 'string' && key.startsWith(DECK_KEY_PREFIX)) {
        ids.push(key.slice(DECK_KEY_PREFIX.length));
      }
    }
    return ids;
  }

  function exportAll() {
    const data = {};
    const g = storageMap.get(GLOBAL_KEY);
    if (g != null) data[GLOBAL_KEY] = g;
    for (const id of listDeckIds()) {
      const v = storageMap.get(DECK_KEY_PREFIX + id);
      if (v != null) data[DECK_KEY_PREFIX + id] = v;
    }
    return { version: 1, exported: new Date().toISOString(), data: data };
  }

  function importAll(backup) {
    if (!backup || typeof backup !== 'object') return false;
    if (backup.version !== 1) return false;
    if (!backup.data || typeof backup.data !== 'object') return false;
    for (const key in backup.data) {
      if (isManagedKey(key) && key !== MIGRATED_MARKER) {
        storageMap.set(key, backup.data[key]);
        safePut(key, backup.data[key]);
      }
    }
    return true;
  }

  function isDegraded() { return degraded; }

  // ---- init / migration (filled in Phases 2–5) ----
  function init() {
    if (initPromise) return initPromise;
    initPromise = Promise.resolve(); // placeholder; Phase 2 replaces this
    return initPromise;
  }

  // ---- test hooks ----
  function _reset() {
    storageMap = new Map();
    backend = null;
    initPromise = null;
    degraded = false;
  }
  function _setBackend(b) { backend = b; }
  function _getBackend() { return backend; }
  function _getMap() { return storageMap; }

  const Storage = {
    loadDeck, saveDeck, loadGlobal, saveGlobal,
    listDeckIds, exportAll, importAll,
    init, isDegraded,
    _reset, _setBackend, _getBackend, _getMap,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
  } else {
    global.Storage = Storage;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `node --test tests/storage.test.js`
Expected: 8/8 pass. No failures.

- [ ] **Step 3: Run the full suite to confirm nothing else broke**

Run: `node --test`
Expected: All tests pass (storage now goes through the map but the API contract is identical to the legacy localStorage version — engine-ui call paths unchanged).

- [ ] **Step 4: Commit (green)**

```bash
git add src/storage.js
git commit -m "$(cat <<'EOF'
refactor: storage internals — in-memory Map + pluggable backend

Public API (loadDeck/saveDeck/loadGlobal/saveGlobal/listDeckIds/
exportAll/importAll) keeps its synchronous signatures. Reads now go
through an in-memory Map; writes update the map and fire
backend.put as a side effect. _reset / _setBackend test hooks let
unit tests inject a mock driver. Storage.init() still a stub —
Phase 2 fills in hydration.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.3: Add test that `saveDeck` fires `backend.put`

The Phase 1 rewrite *should* already pass this — it's protection against future regressions where someone removes the write-through.

**Files:**
- Modify: `tests/storage.test.js` (append new test)

- [ ] **Step 1: Append the test**

```js
test('storage: saveDeck writes through to the backend', async () => {
  const { Storage, backend } = setup();
  Storage.saveDeck('declension', { items: { a: { box: 1 } } });
  // backend.put is fire-and-forget; let the microtask queue drain.
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
```

- [ ] **Step 2: Run the new tests**

Run: `node --test tests/storage.test.js`
Expected: 11/11 pass.

- [ ] **Step 3: Commit**

```bash
git add tests/storage.test.js
git commit -m "$(cat <<'EOF'
test: assert saveDeck / saveGlobal / importAll write through backend

Guards against future regressions that silently drop the backend.put
side effect and turn storage back into an in-memory-only cache.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — `Storage.init()` async hydration

Boot path: open the backend, hydrate the in-memory map from it, memoize the promise so repeated calls share one boot. The IDB-specific code lands in Phase 4 — for now the hook is generic over any backend.

### Task 2.1: Test that `init()` hydrates the map from a non-empty backend

**Files:**
- Modify: `tests/storage.test.js`

- [ ] **Step 1: Append the test (red)**

```js
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
```

- [ ] **Step 2: Run — confirm failure**

Run: `node --test tests/storage.test.js`
Expected: first new test fails (loadGlobal returns `null` because init is still a stub). Second test passes (the stub already memoizes).

- [ ] **Step 3: Replace `Storage.init()` body in `src/storage.js`**

Replace the `init()` definition with:

```js
  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!backend) return; // tests may forget to set one — be permissive
      try {
        storageMap = await backend.hydrate();
      } catch (err) {
        console.warn('[gd-storage] hydrate failed:', err);
        degraded = true;
        storageMap = new Map();
      }
    })();
    return initPromise;
  }
```

- [ ] **Step 4: Run again — confirm both tests pass**

Run: `node --test tests/storage.test.js`
Expected: all tests pass (13 total).

- [ ] **Step 5: Commit**

```bash
git add src/storage.js tests/storage.test.js
git commit -m "$(cat <<'EOF'
feat(storage): Storage.init() hydrates in-memory map from backend

init() is idempotent — initPromise memoized after first call, so
boot is shared. If hydrate() rejects, fall back to an empty map and
mark the module as degraded; later phases surface that as a UI
banner.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.2: Test that hydrate failure sets `degraded`

**Files:**
- Modify: `tests/storage.test.js`

- [ ] **Step 1: Append the test**

```js
test('storage: init() with a failing hydrate marks Storage degraded', async () => {
  const { createFailingBackend } = require('./_helpers/mockBackend.js');
  global.localStorage = makeShim();
  Storage._reset();
  Storage._setBackend(createFailingBackend('hydrate'));
  await Storage.init();
  assert.strictEqual(Storage.isDegraded(), true);
  // Map empties out; loads return null.
  assert.strictEqual(Storage.loadGlobal(), null);
});
```

- [ ] **Step 2: Run — confirm pass**

Run: `node --test tests/storage.test.js`
Expected: all 14 tests pass. (The implementation already handles this; this is regression armor.)

- [ ] **Step 3: Commit**

```bash
git add tests/storage.test.js
git commit -m "$(cat <<'EOF'
test: assert hydrate failure trips Storage.isDegraded()

Regression armor — protects the future UI banner contract from a
quiet refactor that swallows the failure but leaves degraded=false.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — One-time migration from legacy `localStorage`

When init runs against a freshly empty backend, copy any `gd_global` / `gd_deck_*` keys from `localStorage` into the backend, write the `migrated_to_idb` marker, then remove the legacy keys. The marker makes the migration idempotent.

### Task 3.1: Test that legacy localStorage is migrated when the backend is empty

**Files:**
- Modify: `tests/storage.test.js`

- [ ] **Step 1: Append the tests (red)**

```js
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

test('storage: migration is idempotent — second init does not re-migrate', async () => {
  const { Storage, backend } = setup({
    legacyData: { gd_deck_x: { items: {} } },
  });
  await Storage.init();
  // Simulate stray legacy data appearing later (shouldn't happen, but prove the marker holds).
  global.localStorage.setItem('gd_deck_y', JSON.stringify({ items: { y: { box: 1 } } }));
  // Force a second init by clearing the promise (simulates a new tab loading the bundle fresh,
  // but with the same backend state). Use the test hook indirectly by re-seeding the backend.
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
```

- [ ] **Step 2: Run — confirm failure**

Run: `node --test tests/storage.test.js`
Expected: 4 new tests fail (no migration code yet).

- [ ] **Step 3: Replace `init()` in `src/storage.js`**

Replace the existing `init()` definition with the migration-aware version:

```js
  function readLegacyLocalStorageEntries() {
    const out = [];
    const store = ls();
    if (!store) return out;
    const keysToCheck = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k === GLOBAL_KEY || (typeof k === 'string' && k.startsWith(DECK_KEY_PREFIX))) {
        keysToCheck.push(k);
      }
    }
    for (const k of keysToCheck) {
      const raw = store.getItem(k);
      try {
        out.push({ key: k, value: JSON.parse(raw) });
      } catch (err) {
        console.warn('[gd-storage] malformed legacy key, skipping:', k);
      }
    }
    return out;
  }

  function clearLegacyLocalStorageKeys() {
    const store = ls();
    if (!store) return;
    const keys = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k === GLOBAL_KEY || (typeof k === 'string' && k.startsWith(DECK_KEY_PREFIX))) {
        keys.push(k);
      }
    }
    for (const k of keys) store.removeItem(k);
  }

  async function migrateLegacyIntoBackend() {
    const entries = readLegacyLocalStorageEntries();
    if (entries.length === 0) {
      // Still write the marker so we never re-check on subsequent boots.
      const marker = { at: new Date().toISOString(), count: 0 };
      storageMap.set(MIGRATED_MARKER, marker);
      try { await backend.put(MIGRATED_MARKER, marker); } catch (err) { console.warn('[gd-storage] marker put failed:', err); }
      return;
    }
    for (const { key, value } of entries) {
      storageMap.set(key, value);
      try { await backend.put(key, value); } catch (err) { console.warn('[gd-storage] migrate put failed:', key, err); }
    }
    const marker = { at: new Date().toISOString(), count: entries.length };
    storageMap.set(MIGRATED_MARKER, marker);
    try { await backend.put(MIGRATED_MARKER, marker); } catch (err) { console.warn('[gd-storage] marker put failed:', err); }
    clearLegacyLocalStorageKeys();
    console.log('[gd-storage] migrated', entries.length, 'legacy key(s) from localStorage');
  }

  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!backend) return;
      try {
        storageMap = await backend.hydrate();
      } catch (err) {
        console.warn('[gd-storage] hydrate failed:', err);
        degraded = true;
        storageMap = new Map();
      }
      if (!storageMap.has(MIGRATED_MARKER)) {
        await migrateLegacyIntoBackend();
      }
    })();
    return initPromise;
  }
```

- [ ] **Step 4: Run — confirm all 18 tests pass**

Run: `node --test tests/storage.test.js`
Expected: 18/18 pass.

- [ ] **Step 5: Commit**

```bash
git add src/storage.js tests/storage.test.js
git commit -m "$(cat <<'EOF'
feat(storage): one-time legacy localStorage migration in init()

When init runs against a backend without the migrated_to_idb marker,
copy gd_global + gd_deck_* keys from localStorage into the backend,
write the marker (count + ISO timestamp), then remove the legacy
keys. Idempotent: subsequent inits see the marker and skip. Malformed
JSON on one key is logged and skipped; siblings still migrate.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Real IndexedDB backend driver

Browser-only code path. Not exercised in Node tests; verified by a manual smoke test at the end of the plan. The driver implements the same `{hydrate, put, del}` interface as the mock.

### Task 4.1: Add `makeIdbBackend()` and `makeLocalStorageBackend()` to `src/storage.js`

**Files:**
- Modify: `src/storage.js`

- [ ] **Step 1: Add the two factories**

Insert these *above* the public-API section in `src/storage.js`:

```js
  // ---- IDB backend (browser) ----
  function makeIdbBackend() {
    const DB_NAME = 'gd_storage';
    const STORE = 'kv';
    const VERSION = 1;
    let dbPromise = null;

    function open() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        let req;
        try { req = indexedDB.open(DB_NAME, VERSION); } catch (e) { reject(e); return; }
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('indexedDB open blocked'));
      });
      return dbPromise;
    }

    function hydrate() {
      return open().then(db => new Promise((resolve, reject) => {
        const map = new Map();
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.openCursor();
        req.onsuccess = () => {
          const c = req.result;
          if (!c) { resolve(map); return; }
          try {
            const v = typeof c.value === 'string' ? JSON.parse(c.value) : c.value;
            map.set(c.key, v);
          } catch (err) {
            console.warn('[gd-storage] malformed value on hydrate, key:', c.key, err);
          }
          c.continue();
        };
        req.onerror = () => reject(req.error);
      }));
    }

    function putOnce(key, value) {
      return open().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
        tx.objectStore(STORE).put(JSON.stringify(value), key);
      }));
    }

    function put(key, value) {
      return putOnce(key, value).catch(err => {
        console.warn('[gd-storage] idb put failed, retrying in 500ms:', key, err);
        return new Promise(r => setTimeout(r, 500)).then(() => putOnce(key, value));
      }).catch(err => {
        console.warn('[gd-storage] idb put failed after retry:', key, err);
      });
    }

    function del(key) {
      return open().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(STORE).delete(key);
      })).catch(err => console.warn('[gd-storage] idb del failed:', key, err));
    }

    return { hydrate, put, del };
  }

  // ---- localStorage backend (fallback for when IDB cannot open) ----
  function makeLocalStorageBackend() {
    function hydrate() {
      const m = new Map();
      const store = ls();
      if (!store) return Promise.resolve(m);
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (!isManagedKey(k)) continue;
        try { m.set(k, JSON.parse(store.getItem(k))); }
        catch (err) { console.warn('[gd-storage] localStorage backend: malformed value, key:', k); }
      }
      return Promise.resolve(m);
    }
    function put(k, v) {
      try { ls().setItem(k, JSON.stringify(v)); } catch (err) { console.warn('[gd-storage] ls put failed:', k, err); }
      return Promise.resolve();
    }
    function del(k) {
      try { ls().removeItem(k); } catch (err) { console.warn('[gd-storage] ls del failed:', k, err); }
      return Promise.resolve();
    }
    return { hydrate, put, del };
  }

  function pickDefaultBackend() {
    if (typeof indexedDB !== 'undefined') {
      try { return makeIdbBackend(); } catch (e) { console.warn('[gd-storage] idb constructor threw:', e); }
    }
    return makeLocalStorageBackend();
  }
```

- [ ] **Step 2: Wire `init()` to fall back when the chosen backend fails to hydrate**

Replace the `init()` body with the fallback-aware version:

```js
  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!backend) backend = pickDefaultBackend();
      try {
        storageMap = await backend.hydrate();
      } catch (err) {
        console.warn('[gd-storage] primary backend hydrate failed, falling back to localStorage:', err);
        degraded = true;
        backend = makeLocalStorageBackend();
        try {
          storageMap = await backend.hydrate();
        } catch (err2) {
          console.warn('[gd-storage] fallback hydrate failed too — starting empty:', err2);
          storageMap = new Map();
        }
      }
      if (!storageMap.has(MIGRATED_MARKER)) {
        await migrateLegacyIntoBackend();
      }
    })();
    return initPromise;
  }
```

- [ ] **Step 3: Run the test suite — confirm Node tests still pass**

Run: `node --test`
Expected: All tests pass. (The new code is browser-only — `typeof indexedDB !== 'undefined'` is false in Node, and tests already inject a mock via `_setBackend` before calling `init()`, so `pickDefaultBackend()` is never reached in tests.)

- [ ] **Step 4: Commit**

```bash
git add src/storage.js
git commit -m "$(cat <<'EOF'
feat(storage): real IndexedDB backend driver + localStorage fallback

makeIdbBackend opens database "gd_storage", object store "kv" (schema
v1). hydrate streams every key into a Map; put serializes JSON and
retries once after 500ms; del removes a key. makeLocalStorageBackend
is the fallback used when IDB's open or hydrate rejects — surfaces
isDegraded=true so the UI can warn. pickDefaultBackend tries IDB
first when available, else falls back. Browser-only paths; Node
tests still inject mock backends via _setBackend.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.2: Test the localStorage fallback path through init

The IDB driver itself can't be exercised in Node, but the fallback shape *can* — we simulate it by injecting a failing primary backend and asserting that the module recovers via the real `makeLocalStorageBackend` factory.

**Files:**
- Modify: `tests/storage.test.js`

- [ ] **Step 1: Append the test**

```js
test('storage: when primary backend hydrate rejects, falls back to localStorage', async () => {
  const { createFailingBackend } = require('./_helpers/mockBackend.js');
  global.localStorage = makeShim();
  global.localStorage.setItem('gd_global', JSON.stringify({ version: 1, streak: { current: 9, lastDay: '2026-05-14' } }));
  Storage._reset();
  Storage._setBackend(createFailingBackend('hydrate'));
  await Storage.init();
  assert.strictEqual(Storage.isDegraded(), true);
  // localStorage fallback successfully read the legacy key.
  assert.strictEqual(Storage.loadGlobal().streak.current, 9);
});
```

- [ ] **Step 2: Run — confirm pass**

Run: `node --test tests/storage.test.js`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/storage.test.js
git commit -m "$(cat <<'EOF'
test: fallback path engages when primary hydrate rejects

Seeds the localStorage shim, injects a primary backend whose
hydrate() rejects, asserts init falls back to the localStorage
backend, surfaces isDegraded=true, and successfully reads the
seeded legacy data.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — Persistent storage permission

After `init()` resolves, ask the browser to mark this origin's storage as persistent. Strictly a side effect; never blocks anything, never throws.

### Task 5.1: Call `navigator.storage.persist()` after a successful init

**Files:**
- Modify: `src/storage.js`

- [ ] **Step 1: Add a helper and call it at the end of init**

Add this helper near the other module-level helpers in `src/storage.js`:

```js
  function requestPersistentStorage() {
    if (typeof navigator === 'undefined') return;
    if (!navigator.storage || typeof navigator.storage.persist !== 'function') return;
    try {
      const p = navigator.storage.persist();
      if (p && typeof p.then === 'function') {
        p.then(granted => console.log('[gd-storage] persistent storage:', granted ? 'granted' : 'denied'))
         .catch(err => console.warn('[gd-storage] persist() rejected:', err));
      }
    } catch (err) {
      console.warn('[gd-storage] persist() threw:', err);
    }
  }
```

Then add the call as the *last* line inside the `init()` async IIFE, after migration:

```js
  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!backend) backend = pickDefaultBackend();
      try {
        storageMap = await backend.hydrate();
      } catch (err) {
        console.warn('[gd-storage] primary backend hydrate failed, falling back to localStorage:', err);
        degraded = true;
        backend = makeLocalStorageBackend();
        try {
          storageMap = await backend.hydrate();
        } catch (err2) {
          console.warn('[gd-storage] fallback hydrate failed too — starting empty:', err2);
          storageMap = new Map();
        }
      }
      if (!storageMap.has(MIGRATED_MARKER)) {
        await migrateLegacyIntoBackend();
      }
      requestPersistentStorage();
    })();
    return initPromise;
  }
```

- [ ] **Step 2: Add a Node-side test that init does not throw when navigator is absent**

Append to `tests/storage.test.js`:

```js
test('storage: init() does not throw when navigator.storage is absent (Node env)', async () => {
  const { Storage } = setup();
  await Storage.init(); // would throw if persist() call wasn't guarded
  assert.ok(true);
});
```

- [ ] **Step 3: Run — confirm pass**

Run: `node --test tests/storage.test.js`
Expected: all tests pass. `typeof navigator === 'undefined'` is true in Node, so the helper no-ops.

- [ ] **Step 4: Commit**

```bash
git add src/storage.js tests/storage.test.js
git commit -m "$(cat <<'EOF'
feat(storage): request navigator.storage.persist() after init

Once init resolves we ask the browser to exempt this origin from
storage eviction. Fire-and-forget; logs the outcome at most once
per session. Feature-detected so Node tests pass through silently.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6 — Degraded-mode banner UI

When `Storage.isDegraded()` is true after boot, render a dismissible banner above the menu warning the user that progress may not survive the session. Dismissal is session-only — clicking × hides the banner for this tab; reopening the site re-shows it if the condition still holds.

### Task 6.1: Add banner CSS

**Files:**
- Modify: `src/styles.css` (append rules)

- [ ] **Step 1: Append the rules**

```css

/* Degraded-storage banner (shown when IDB unavailable and we're on the
   localStorage fallback — Storage.isDegraded() is true). */
.storage-banner {
  width: 100%;
  max-width: 440px;
  margin: 24px auto 0;
  padding: 12px 14px;
  background: #2a1f10;
  border: 1px solid #5a4520;
  border-radius: 10px;
  color: #f0c060;
  font-size: 13px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.storage-banner.hidden { display: none; }
.storage-banner .body { flex: 1; }
.storage-banner .close {
  background: transparent;
  border: none;
  color: #f0c060;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles.css
git commit -m "$(cat <<'EOF'
style: add storage-banner styles for degraded-mode warning

Amber banner anchored above the menu deck list. Used when
Storage.isDegraded() is true (IDB unavailable, on localStorage
fallback). Dismissible × button for the session.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6.2: Render the banner in the menu

**Files:**
- Modify: `src/engine-ui.js` (inside `renderMenu`)

- [ ] **Step 1: Add a module-scoped `bannerDismissed` flag**

Near the top of the engine-ui IIFE (after the helper definitions, around the line that declares `function today()`), add:

```js
  let bannerDismissed = false; // session-only; reset on full page reload
```

- [ ] **Step 2: Render the banner inside `renderMenu`**

In `renderMenu`, immediately *after* `menu.appendChild(list);` (currently line ~89 — locate the line that ends `menu.appendChild(list);` and insert the new block right after it):

```js
    if (Storage.isDegraded && Storage.isDegraded() && !bannerDismissed) {
      const banner = el('div', { class: 'storage-banner', id: 'storageBanner' });
      banner.appendChild(el('div', { class: 'body' },
        'Your browser couldn’t open persistent storage. Progress in this session may not survive a reload. Use Export below to back up.'
      ));
      banner.appendChild(el('button', {
        class: 'close',
        'aria-label': 'Dismiss',
        onclick: () => { bannerDismissed = true; const b = document.getElementById('storageBanner'); if (b) b.classList.add('hidden'); },
      }, '×'));
      menu.appendChild(banner);
    }
```

- [ ] **Step 3: Run the full test suite**

Run: `node --test`
Expected: all tests pass. (Banner is browser-only code; no Node test touches it.)

- [ ] **Step 4: Commit**

```bash
git add src/engine-ui.js
git commit -m "$(cat <<'EOF'
feat(ui): render degraded-storage warning banner on menu

When Storage.isDegraded() returns true the menu surfaces an amber
banner reminding the user to export. Dismissable for the session;
re-renders next page load if the condition still holds.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 7 — Boot wiring

The only call-site change. `renderMenu()` is wrapped in `Storage.init().finally(renderMenu)` so we render against hydrated state.

### Task 7.1: Wrap renderMenu in Storage.init() in engine-ui's boot block

**Files:**
- Modify: `src/engine-ui.js` (lines ~553–556, the `DOMContentLoaded` handler)

- [ ] **Step 1: Replace the existing `DOMContentLoaded` handler**

Find the block at the bottom of `engine-ui.js`:

```js
    window.addEventListener('DOMContentLoaded', () => {
      renderMenu();
    });
```

Replace with:

```js
    window.addEventListener('DOMContentLoaded', () => {
      Storage.init()
        .catch(err => console.warn('[gd-storage] init degraded:', err))
        .finally(renderMenu);
    });
```

- [ ] **Step 2: Run the full test suite to make sure nothing regressed**

Run: `node --test`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/engine-ui.js
git commit -m "$(cat <<'EOF'
feat(ui): await Storage.init() before first render

renderMenu runs in .finally so the menu shows even if init rejects —
the degraded banner explains why progress may not persist. popstate
listener and the rest of engine-ui keep their existing sync paths;
init's memoization means stray re-calls share the original boot.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 8 — Rebuild and verify

### Task 8.1: Rebuild `index.html`

**Files:**
- Modify: `index.html` (built artifact)

- [ ] **Step 1: Run the build**

Run: `node build/build.js`
Expected: prints `Built ...\index.html (7 decks, 0 warning(s))`. Exit code 0.

- [ ] **Step 2: Sanity-check the inlined storage module**

Run:

```bash
grep -c "makeIdbBackend\|requestPersistentStorage\|migrated_to_idb" index.html
```

Expected: a number ≥ 5 (each symbol should appear at least once, often more).

- [ ] **Step 3: Run the full test suite once more**

Run: `node --test`
Expected: all tests pass (no test mentions snapshot drift for content; content didn't change).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
build: rebuild index.html with IDB-backed storage

Inlines the new storage module: in-memory Map, pluggable IDB backend
with localStorage fallback, one-time legacy migration, persist()
request, isDegraded surface and menu banner. Engine-ui boot now
awaits Storage.init() before first render.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8.2: Manual browser smoke test (happy path)

**Not automated — perform in a real browser.**

- [ ] **Step 1: Open `index.html` directly from disk (or via the GitHub Pages URL after pushing)**

```text
file:///C:/Users/gsgay/Side%20Projects/georgegaytan.github.io/index.html
```

- [ ] **Step 2: Open DevTools → Application → IndexedDB**

Confirm a database named `gd_storage` appears with an object store `kv` (empty on first load).

- [ ] **Step 3: Open the Console tab**

Look for log lines beginning `[gd-storage]`. On a fresh browser you should see one of:
- `[gd-storage] persistent storage: granted` (or `denied`)
- No `failed` warnings.

- [ ] **Step 4: Start a deck (e.g. Declension), answer 2–3 items, navigate back to menu**

- [ ] **Step 5: In DevTools → Application → IndexedDB → gd_storage → kv**

Refresh the store view; confirm at least one key `gd_deck_declension` is present with a non-empty `items` map.

- [ ] **Step 6: Close the tab, reopen the page**

Open the same deck. Confirm the items you previously answered show their existing `box`/`due` state (mastery not reset).

If any of these steps fail, **stop and investigate**. Do not move to 8.3.

---

### Task 8.3: Manual browser smoke test (legacy migration path)

This step verifies the one-time migration only runs once and successfully copies from a localStorage payload to IDB.

**Setup (in DevTools console BEFORE reloading):**

- [ ] **Step 1: Clear IDB so migration is forced to re-run**

In DevTools → Application → IndexedDB → right-click `gd_storage` → Delete database.

- [ ] **Step 2: Seed localStorage with a legacy payload**

Run in Console:

```js
localStorage.setItem('gd_global', JSON.stringify({ version: 1, streak: { current: 99, lastDay: '2026-05-14' } }));
localStorage.setItem('gd_deck_declension', JSON.stringify({ items: { manual_test: { box: 5, ease: 2.5, interval: 30, due: null, lapses: 0, lastSeen: '2026-05-14T00:00:00Z', seenCount: 7 } } }));
```

- [ ] **Step 3: Reload the page**

In the Console, expect a log line like `[gd-storage] migrated 2 legacy key(s) from localStorage`.

- [ ] **Step 4: Verify post-migration state**

- Application → IndexedDB → `gd_storage` → `kv` should contain `gd_global`, `gd_deck_declension`, and `migrated_to_idb`.
- `localStorage.getItem('gd_global')` should now return `null`.
- `localStorage.getItem('gd_deck_declension')` should return `null`.

- [ ] **Step 5: Reload once more**

Expect **no** `migrated` log line on the second reload — the marker prevents re-migration.

If any step fails, file a follow-up bug and consider whether the rollback plan in the spec applies.

---

### Task 8.4: Manual browser smoke test (degraded fallback)

This verifies the banner appears and the app remains usable when IDB cannot open.

- [ ] **Step 1: Open the page in Firefox Private Browsing**

(Some private-browsing modes refuse IDB; if Firefox happens to allow it now, use Safari Private or simulate by injecting `window.indexedDB = undefined` before load via a userscript / DevTools override.)

- [ ] **Step 2: Confirm the amber banner appears above the deck list**

Text: "Your browser couldn't open persistent storage…"

- [ ] **Step 3: Confirm decks still open and progress is recorded for the session**

Answer 2–3 items. Confirm the deck-card progress label updates.

- [ ] **Step 4: Click the banner's × button**

Banner disappears. Reload the page. If IDB still can't open, banner reappears. If IDB can open (we switched to a normal window), banner is absent. Either is correct.

---

### Task 8.5: Final push

- [ ] **Step 1: Verify clean working tree**

Run: `git status`
Expected: nothing to commit, working tree clean (all phase commits already pushed locally).

- [ ] **Step 2: Push to origin/main**

Ask the user for explicit confirmation before pushing — the user has consistently gated pushes manually in this project. If the user confirms:

Run: `git push origin main`
Expected: GitHub accepts the push; Pages redeploys within ~30 seconds at https://georgegaytan.github.io/.

- [ ] **Step 3: Open the deployed URL and re-run Task 8.2 smoke test**

Confirm parity with the local file:// run.

---

## Risks tracked from the spec

These were captured in the spec and remain open after this plan executes:

- **Persistent storage denial cascade.** We call `persist()` once per session; never retry within a session. If denied today, we hope the browser flips it to granted later as engagement signals accumulate.
- **No backup nudges.** If `persist()` is denied AND localStorage gets evicted, data is gone. Export/Import is the only safety net. The follow-up "scope C" plan would add backup-due reminders.
- **Migration failure mid-stream.** Marker isn't written until every entry is attempted; if the process crashes partway, the next boot sees the absent marker and retries (idempotent put on backend).

## Rollback

If a regression ships, revert `src/storage.js` to its pre-plan blob and rebuild:

```bash
git checkout <pre-plan-sha> -- src/storage.js
node build/build.js
git add src/storage.js index.html
git commit -m "revert: storage redesign (rollback)"
git push
```

Users whose data was migrated into IDB will appear to lose progress until they Import their last backup; users who never migrated will be unaffected. The orphaned IDB data is not destructive — a future re-roll forward can reuse it.
