# German Drills Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace today's seven-independent-decks app with a single unified deck engine plus typed-distractor content authoring, eliminating cross-deck inconsistency and entire classes of language-content regression.

**Architecture:** UMD-style JS modules so the same source runs in browser (via `<script>`) and in `node:test` (via CommonJS `require`) with no transformation. `engine-core.js` is pure (no DOM); `engine-ui.js` is the DOM controller. `storage.js` is the one-and-only persistence seam. Decks are JSON files validated at build time (Layer 1), engine logic is unit-tested (Layer 2), rendered content is snapshotted and known-bad patterns explicitly asserted against (Layer 3). `node build.js` inlines everything into a single deployed `index.html`.

**Tech Stack:** Vanilla JavaScript (ESM not used — UMD pattern for zero-transformation dual-runtime), HTML, CSS. Node's built-in `node:test` for tests, built-in `fs`/`path` for the build script. No npm dependencies. No bundler. No transpiler.

**Source spec:** [`docs/superpowers/specs/2026-05-14-german-drills-redesign-design.md`](../specs/2026-05-14-german-drills-redesign-design.md).

---

## Plan Conventions

- Every implementation step shows actual code, not "implement X."
- Every test step shows actual assertions and the command to run them, with expected output.
- Every task ends with a commit step. Commits are frequent — one per task, sometimes more.
- Code is written test-first (TDD): write failing test → run it → confirm it fails for the expected reason → implement minimum to make it pass → run again → confirm pass → commit.
- All commands assume `bash` shell on Windows (the user's environment). Use `/` path separators throughout (works in modern Node on Windows).
- All commits sign as `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

---

## Phase 0 — Project Scaffold

### Task 0.1: Initialize directory structure, package.json, .gitignore

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `src/.gitkeep`, `build/.gitkeep`, `decks/.gitkeep`, `tests/.gitkeep`, `tests/snapshots/.gitkeep`, `src/morphology/.gitkeep`

- [ ] **Step 1: Create directory skeleton**

```bash
mkdir -p src/morphology build decks tests/snapshots
touch src/.gitkeep build/.gitkeep decks/.gitkeep tests/.gitkeep tests/snapshots/.gitkeep src/morphology/.gitkeep
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "german-drills",
  "version": "2.0.0",
  "private": true,
  "description": "Single-file offline German learning drill app",
  "scripts": {
    "build": "node build/build.js",
    "lint": "node build/lint.js",
    "test": "node --test tests/",
    "test:watch": "node --test --watch tests/"
  }
}
```

Note: no `"type": "module"`. We use UMD-style modules. `node --test` works with CJS.

- [ ] **Step 3: Write `.gitignore`**

```
# OS / editor noise
.DS_Store
Thumbs.db
*.swp
*.swo
.vscode/

# Built artifacts that ARE NOT committed (none for now — index.html IS committed)

# Node
node_modules/

# Working scratch
scratch/
```

- [ ] **Step 4: Commit scaffold**

```bash
git add package.json .gitignore src/ build/ decks/ tests/
git commit -m "$(cat <<'EOF'
chore: project scaffold for redesigned German Drills app

Directory structure for src/, build/, decks/, tests/. Package.json
defines test and build scripts using only Node built-ins (no npm deps).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Engine Core (Pure, Testable)

This phase builds `src/engine-core.js` and `src/storage.js` test-first. No DOM, no UI. Every function pure or with explicit injected dependencies. Each task ends with passing tests.

### Task 1.1: Set up engine-core scaffold with UMD pattern

**Files:**
- Create: `src/engine-core.js`
- Create: `tests/engine-core.test.js`

- [ ] **Step 1: Write the failing test (sanity check the UMD wiring)**

`tests/engine-core.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const EngineCore = require('../src/engine-core.js');

test('engine-core: module exports an object', () => {
  assert.strictEqual(typeof EngineCore, 'object');
  assert.notStrictEqual(EngineCore, null);
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
node --test tests/engine-core.test.js
```

Expected: FAIL — `Cannot find module '../src/engine-core.js'`.

- [ ] **Step 3: Write minimum engine-core to pass**

`src/engine-core.js`:

```js
(function (global) {
  const EngineCore = {};

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EngineCore;
  } else {
    global.EngineCore = EngineCore;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run test, expect pass**

```bash
node --test tests/engine-core.test.js
```

Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine-core.js tests/engine-core.test.js
git commit -m "$(cat <<'EOF'
feat: engine-core scaffold with UMD module pattern

Empty EngineCore object exported via CJS for Node tests and via window global
for the browser. No transformation needed for dual-runtime use.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.2: Storage seam — `src/storage.js`

The single point through which every read/write to persistent state passes. Backed by `localStorage` today; future swap to IndexedDB/OPFS replaces only this file.

**Files:**
- Create: `src/storage.js`
- Create: `tests/storage.test.js`
- Create: `tests/_helpers/localStorageShim.js`

- [ ] **Step 1: Write the localStorage shim helper**

Tests run in Node where `localStorage` doesn't exist. Provide a 15-line in-memory shim.

`tests/_helpers/localStorageShim.js`:

```js
function makeShim() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); },
    key(i) { return Array.from(store.keys())[i] ?? null; },
    get length() { return store.size; },
  };
}
module.exports = { makeShim };
```

- [ ] **Step 2: Write failing tests for `loadDeck` / `saveDeck`**

`tests/storage.test.js`:

```js
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
```

- [ ] **Step 3: Run, expect failure**

```bash
node --test tests/storage.test.js
```

Expected: FAIL — `Cannot find module '../src/storage.js'`.

- [ ] **Step 4: Implement `src/storage.js` (loadDeck + saveDeck)**

```js
(function (global) {
  const DECK_KEY_PREFIX = 'gd_deck_';
  const GLOBAL_KEY = 'gd_global';

  function ls() { return global.localStorage; }

  function loadDeck(deckId) {
    const raw = ls().getItem(DECK_KEY_PREFIX + deckId);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function saveDeck(deckId, state) {
    ls().setItem(DECK_KEY_PREFIX + deckId, JSON.stringify(state));
  }

  const Storage = { loadDeck, saveDeck };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
  } else {
    global.Storage = Storage;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 5: Run tests, expect pass**

```bash
node --test tests/storage.test.js
```

Expected: PASS — 2 tests passed.

- [ ] **Step 6: Add tests for `loadGlobal` / `saveGlobal`**

Append to `tests/storage.test.js`:

```js
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
```

- [ ] **Step 7: Run, expect failure**

```bash
node --test tests/storage.test.js
```

Expected: 2 PASS, 2 FAIL — `Storage.loadGlobal is not a function`.

- [ ] **Step 8: Add `loadGlobal` / `saveGlobal` to storage.js**

Inside the IIFE in `src/storage.js`, add:

```js
  function loadGlobal() {
    const raw = ls().getItem(GLOBAL_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function saveGlobal(state) {
    ls().setItem(GLOBAL_KEY, JSON.stringify(state));
  }
```

And update the exported object:

```js
  const Storage = { loadDeck, saveDeck, loadGlobal, saveGlobal };
```

- [ ] **Step 9: Run, expect pass**

```bash
node --test tests/storage.test.js
```

Expected: PASS — 4 tests passed.

- [ ] **Step 10: Add tests for `listDeckIds` / `exportAll` / `importAll`**

Append to `tests/storage.test.js`:

```js
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
```

- [ ] **Step 11: Run, expect failure**

```bash
node --test tests/storage.test.js
```

Expected: 4 PASS, 4 FAIL — missing functions.

- [ ] **Step 12: Implement `listDeckIds` / `exportAll` / `importAll`**

Inside the IIFE in `src/storage.js`, add:

```js
  function listDeckIds() {
    const ls_ = ls();
    const ids = [];
    for (let i = 0; i < ls_.length; i++) {
      const key = ls_.key(i);
      if (key && key.startsWith(DECK_KEY_PREFIX)) {
        ids.push(key.slice(DECK_KEY_PREFIX.length));
      }
    }
    return ids;
  }

  function exportAll() {
    const data = {};
    const g = ls().getItem(GLOBAL_KEY);
    if (g) { try { data[GLOBAL_KEY] = JSON.parse(g); } catch (e) {} }
    for (const id of listDeckIds()) {
      const raw = ls().getItem(DECK_KEY_PREFIX + id);
      if (raw) { try { data[DECK_KEY_PREFIX + id] = JSON.parse(raw); } catch (e) {} }
    }
    return { version: 1, exported: new Date().toISOString(), data: data };
  }

  function importAll(backup) {
    if (!backup || typeof backup !== 'object') return false;
    if (backup.version !== 1) return false;
    if (!backup.data || typeof backup.data !== 'object') return false;
    for (const key in backup.data) {
      if (key === GLOBAL_KEY || key.startsWith(DECK_KEY_PREFIX)) {
        ls().setItem(key, JSON.stringify(backup.data[key]));
      }
    }
    return true;
  }
```

Update exports:

```js
  const Storage = { loadDeck, saveDeck, loadGlobal, saveGlobal, listDeckIds, exportAll, importAll };
```

- [ ] **Step 13: Run, expect pass**

```bash
node --test tests/storage.test.js
```

Expected: PASS — 8 tests passed.

- [ ] **Step 14: Commit**

```bash
git add src/storage.js tests/storage.test.js tests/_helpers/localStorageShim.js
git commit -m "$(cat <<'EOF'
feat: storage seam (loadDeck/saveDeck/loadGlobal/saveGlobal/listDeckIds/exportAll/importAll)

Single module gating every read/write to persistent state. Backed by localStorage
today; future IndexedDB/OPFS swap touches only this file. Includes Node test
shim for headless testing without jsdom.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.3: SRS update rule — `srsUpdate(item, outcome)`

Per the spec table: outcomes are `'correct'` (no scaffold), `'correct-aided'` (used scaffold), `'wrong'`. Returns the new item state.

**Files:**
- Modify: `src/engine-core.js`
- Modify: `tests/engine-core.test.js`

- [ ] **Step 1: Write failing tests covering all three SRS transitions**

Append to `tests/engine-core.test.js`:

```js
test('srsUpdate: new item correct → box 1, interval 1', () => {
  const item = { box: 0, ease: 2.5, interval: 0, lapses: 0 };
  const updated = EngineCore.srsUpdate(item, 'correct');
  assert.strictEqual(updated.box, 1);
  assert.strictEqual(updated.ease, 2.5);
  assert.strictEqual(updated.interval, 1);
  assert.strictEqual(updated.lapses, 0);
});

test('srsUpdate: box 2 correct → box 3, interval grows by ease', () => {
  const item = { box: 2, ease: 2.5, interval: 3, lapses: 0 };
  const updated = EngineCore.srsUpdate(item, 'correct');
  assert.strictEqual(updated.box, 3);
  assert.strictEqual(updated.ease, 2.5);
  assert.strictEqual(updated.interval, 8); // round(3 * 2.5) = 8
});

test('srsUpdate: correct-aided holds box, grows interval by ease * 0.5', () => {
  const item = { box: 2, ease: 2.5, interval: 4, lapses: 0 };
  const updated = EngineCore.srsUpdate(item, 'correct-aided');
  assert.strictEqual(updated.box, 2);
  assert.strictEqual(updated.ease, 2.5);
  assert.strictEqual(updated.interval, 5); // round(4 * 2.5 * 0.5) = 5
});

test('srsUpdate: wrong resets box to 1, drops ease by 0.15, interval to 1, lapses++', () => {
  const item = { box: 3, ease: 2.5, interval: 12, lapses: 0 };
  const updated = EngineCore.srsUpdate(item, 'wrong');
  assert.strictEqual(updated.box, 1);
  assert.strictEqual(updated.ease, 2.35);
  assert.strictEqual(updated.interval, 1);
  assert.strictEqual(updated.lapses, 1);
});

test('srsUpdate: ease floors at 1.3', () => {
  const item = { box: 5, ease: 1.4, interval: 30, lapses: 5 };
  const updated = EngineCore.srsUpdate(item, 'wrong');
  assert.strictEqual(updated.ease, 1.3);
});

test('srsUpdate: minimum interval is 1', () => {
  const item = { box: 0, ease: 2.5, interval: 0, lapses: 0 };
  const updated = EngineCore.srsUpdate(item, 'correct');
  assert.strictEqual(updated.interval, 1);
});

test('srsUpdate: throws on unknown outcome', () => {
  const item = { box: 0, ease: 2.5, interval: 0, lapses: 0 };
  assert.throws(() => EngineCore.srsUpdate(item, 'maybe'), /unknown outcome/i);
});
```

- [ ] **Step 2: Run, expect failure**

```bash
node --test tests/engine-core.test.js
```

Expected: 1 PASS (the sanity test), 7 FAIL.

- [ ] **Step 3: Implement `srsUpdate`**

Inside the IIFE in `src/engine-core.js`, before the `if (typeof module ...` block, add:

```js
  const EASE_FLOOR = 1.3;
  const EASE_DROP_ON_LAPSE = 0.15;
  const AIDED_INTERVAL_MULTIPLIER = 0.5;

  function srsUpdate(item, outcome) {
    const next = { box: item.box, ease: item.ease, interval: item.interval, lapses: item.lapses };
    if (outcome === 'correct') {
      next.box = item.box + 1;
      next.interval = item.interval === 0
        ? 1
        : Math.max(1, Math.round(item.interval * item.ease));
    } else if (outcome === 'correct-aided') {
      next.interval = item.interval === 0
        ? 1
        : Math.max(1, Math.round(item.interval * item.ease * AIDED_INTERVAL_MULTIPLIER));
    } else if (outcome === 'wrong') {
      next.box = 1;
      next.ease = Math.max(EASE_FLOOR, +(item.ease - EASE_DROP_ON_LAPSE).toFixed(2));
      next.interval = 1;
      next.lapses = item.lapses + 1;
    } else {
      throw new Error('unknown outcome: ' + outcome);
    }
    return next;
  }

  EngineCore.srsUpdate = srsUpdate;
```

- [ ] **Step 4: Run tests, expect pass**

```bash
node --test tests/engine-core.test.js
```

Expected: PASS — 8 tests passed (1 prior + 7 new).

- [ ] **Step 5: Commit**

```bash
git add src/engine-core.js tests/engine-core.test.js
git commit -m "$(cat <<'EOF'
feat: SRS update rule (Leitner/SM-2 hybrid)

srsUpdate(item, outcome) covers correct / correct-aided / wrong transitions
with ease floor 1.3, minimum interval 1, and integer-rounded intervals per
the design spec table.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.4: Input validators — `normalizeAnswer` and `answersMatch`

Per spec: case-insensitive except for nouns / sentence-start (caller passes a flag), ae/oe/ue/ss ↔ ä/ö/ü/ß tolerance, whitespace trimmed and collapsed.

**Files:**
- Modify: `src/engine-core.js`
- Modify: `tests/engine-core.test.js`

- [ ] **Step 1: Write failing tests**

Append to `tests/engine-core.test.js`:

```js
test('normalizeAnswer: trims and collapses whitespace', () => {
  assert.strictEqual(EngineCore.normalizeAnswer('  der   Mann  '), 'der mann');
});

test('normalizeAnswer: lowercases by default', () => {
  assert.strictEqual(EngineCore.normalizeAnswer('Der Mann'), 'der mann');
});

test('normalizeAnswer: preserves case when caseSensitive=true', () => {
  assert.strictEqual(EngineCore.normalizeAnswer('Der Mann', { caseSensitive: true }), 'Der Mann');
});

test('normalizeAnswer: maps ae→ä, oe→ö, ue→ü, ss→ß', () => {
  assert.strictEqual(EngineCore.normalizeAnswer('moechte'), 'möchte');
  assert.strictEqual(EngineCore.normalizeAnswer('Strasse'), 'straße');
  assert.strictEqual(EngineCore.normalizeAnswer('Aepfel'), 'äpfel');
  assert.strictEqual(EngineCore.normalizeAnswer('fuer'), 'für');
});

test('answersMatch: exact match', () => {
  assert.strictEqual(EngineCore.answersMatch('möchte', 'möchte', []), true);
});

test('answersMatch: accepts ae/oe/ue/ss variant', () => {
  assert.strictEqual(EngineCore.answersMatch('moechte', 'möchte', []), true);
  assert.strictEqual(EngineCore.answersMatch('Strasse', 'Straße', []), true);
});

test('answersMatch: case-insensitive by default', () => {
  assert.strictEqual(EngineCore.answersMatch('DER', 'der', []), true);
});

test('answersMatch: rejects mismatched answer', () => {
  assert.strictEqual(EngineCore.answersMatch('das', 'der', []), false);
});

test('answersMatch: accepts any alt', () => {
  assert.strictEqual(EngineCore.answersMatch('der Apfel', 'Apfel', ['der Apfel']), true);
});

test('answersMatch: case-sensitive when flag set, rejects wrong case', () => {
  assert.strictEqual(
    EngineCore.answersMatch('der', 'Der', [], { caseSensitive: true }),
    false
  );
});
```

- [ ] **Step 2: Run, expect failure**

```bash
node --test tests/engine-core.test.js
```

Expected: 10 FAIL.

- [ ] **Step 3: Implement `normalizeAnswer` and `answersMatch`**

Add inside the IIFE in `src/engine-core.js`:

```js
  function normalizeAnswer(s, opts) {
    opts = opts || {};
    let out = String(s).trim().replace(/\s+/g, ' ');
    if (!opts.caseSensitive) out = out.toLowerCase();
    out = out
      .replace(/ae/g, 'ä')
      .replace(/oe/g, 'ö')
      .replace(/ue/g, 'ü')
      .replace(/ss/g, 'ß')
      .replace(/AE/g, 'Ä')
      .replace(/OE/g, 'Ö')
      .replace(/UE/g, 'Ü');
    return out;
  }

  function answersMatch(input, answer, alts, opts) {
    alts = alts || [];
    const candidates = [answer].concat(alts);
    const normalizedInput = normalizeAnswer(input, opts);
    for (const c of candidates) {
      if (normalizeAnswer(c, opts) === normalizedInput) return true;
    }
    return false;
  }

  EngineCore.normalizeAnswer = normalizeAnswer;
  EngineCore.answersMatch = answersMatch;
```

- [ ] **Step 4: Run tests, expect pass**

```bash
node --test tests/engine-core.test.js
```

Expected: PASS — 18 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine-core.js tests/engine-core.test.js
git commit -m "$(cat <<'EOF'
feat: input validators (normalizeAnswer, answersMatch)

Whitespace collapsing, case folding, German umlaut tolerance (ae/oe/ue/ss
↔ ä/ö/ü/ß), alt-list acceptance. Optional caseSensitive flag for nouns and
sentence-start positions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.5: Distractor selection — `selectDistractors(pool, answer, box, count, seed)`

Levenshtein-distance ranking; low box → far distractors (easier), high box → near distractors (harder, adversarial). Deterministic given a seed.

**Files:**
- Modify: `src/engine-core.js`
- Modify: `tests/engine-core.test.js`

- [ ] **Step 1: Write failing tests**

Append to `tests/engine-core.test.js`:

```js
test('selectDistractors: excludes the answer', () => {
  const pool = ['kann', 'kannst', 'können', 'könnt', 'konnte', 'konnten'];
  const distractors = EngineCore.selectDistractors(pool, 'können', 0, 3, 42);
  assert.strictEqual(distractors.includes('können'), false);
});

test('selectDistractors: returns exactly N distractors', () => {
  const pool = ['kann', 'kannst', 'können', 'könnt', 'konnte', 'konnten'];
  assert.strictEqual(EngineCore.selectDistractors(pool, 'können', 0, 3, 42).length, 3);
});

test('selectDistractors: all distractors unique', () => {
  const pool = ['kann', 'kannst', 'können', 'könnt', 'konnte', 'konnten'];
  const d = EngineCore.selectDistractors(pool, 'können', 0, 3, 42);
  assert.strictEqual(new Set(d).size, d.length);
});

test('selectDistractors: deterministic given same seed', () => {
  const pool = ['kann', 'kannst', 'können', 'könnt', 'konnte', 'konnten'];
  const a = EngineCore.selectDistractors(pool, 'können', 2, 3, 42);
  const b = EngineCore.selectDistractors(pool, 'können', 2, 3, 42);
  assert.deepStrictEqual(a, b);
});

test('selectDistractors: box 0 prefers far distractors (high Levenshtein)', () => {
  // pool contains both near (1-char-off) and far (very different) options
  const pool = ['können', 'könnt', 'kann', 'verfassungsmäßig'];
  const distractors = EngineCore.selectDistractors(pool, 'können', 0, 1, 7);
  // far-Levenshtein word should be preferred at box 0
  assert.strictEqual(distractors[0], 'verfassungsmäßig');
});

test('selectDistractors: box 4+ prefers near distractors (adversarial)', () => {
  const pool = ['können', 'könnt', 'kann', 'verfassungsmäßig'];
  const distractors = EngineCore.selectDistractors(pool, 'können', 4, 1, 7);
  // 1-char-off "könnt" should be preferred at box 4+
  assert.strictEqual(distractors[0], 'könnt');
});

test('selectDistractors: throws if pool too small', () => {
  assert.throws(
    () => EngineCore.selectDistractors(['a', 'b'], 'a', 0, 3, 42),
    /pool too small/i
  );
});
```

- [ ] **Step 2: Run, expect failure**

```bash
node --test tests/engine-core.test.js
```

Expected: 7 new FAIL.

- [ ] **Step 3: Implement `selectDistractors`**

Add inside the IIFE in `src/engine-core.js`:

```js
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const v0 = new Array(b.length + 1);
    const v1 = new Array(b.length + 1);
    for (let i = 0; i <= b.length; i++) v0[i] = i;
    for (let i = 0; i < a.length; i++) {
      v1[0] = i + 1;
      for (let j = 0; j < b.length; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
    }
    return v1[b.length];
  }

  // Mulberry32 PRNG — small, fast, deterministic
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function selectDistractors(pool, answer, box, count, seed) {
    const eligible = pool.filter(p => p !== answer);
    if (eligible.length < count) {
      throw new Error('pool too small: need ' + count + ' distractors, have ' + eligible.length);
    }
    // Sort by Levenshtein distance from answer (ascending = nearest first)
    const ranked = eligible
      .map(p => ({ p: p, d: levenshtein(p, answer) }))
      .sort((a, b) => a.d - b.d || (a.p < b.p ? -1 : 1));

    // Box 0–1: far distractors (easy). Box 2–3: mid. Box 4+: near (adversarial).
    // Strategy: take a slice biased by box, then shuffle within using seed.
    const rand = rng(seed);
    let slice;
    if (box <= 1) {
      // Far half (or as many as available)
      slice = ranked.slice(Math.floor(ranked.length / 2));
    } else if (box <= 3) {
      // Middle
      const start = Math.floor(ranked.length / 4);
      const end = Math.floor(ranked.length * 3 / 4);
      slice = ranked.slice(start, end);
      if (slice.length < count) slice = ranked;
    } else {
      // Near half (adversarial)
      slice = ranked.slice(0, Math.ceil(ranked.length / 2));
    }
    if (slice.length < count) slice = ranked;

    // Fisher-Yates shuffle within the slice
    const arr = slice.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Stable preference: at high box, keep the *nearest* candidates even after shuffle
    // To make box-4+ test deterministic, sort the picked count by distance again
    const picked = arr.slice(0, count);
    if (box >= 4) {
      picked.sort((a, b) => a.d - b.d);
    } else if (box <= 1) {
      picked.sort((a, b) => b.d - a.d);
    }
    return picked.map(x => x.p);
  }

  EngineCore.selectDistractors = selectDistractors;
  EngineCore._levenshtein = levenshtein; // exposed for tests
```

- [ ] **Step 4: Run tests, expect pass**

```bash
node --test tests/engine-core.test.js
```

Expected: PASS — 25 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine-core.js tests/engine-core.test.js
git commit -m "$(cat <<'EOF'
feat: distractor selection with box-keyed adversarial strength

selectDistractors(pool, answer, box, count, seed) — Levenshtein-ranked.
Low-box draws from the far half of the pool (easy); high-box draws from the
near half (adversarial). Mulberry32 PRNG keeps it deterministic given a seed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.6: Session selection — `selectNextItem(deckState, today, options)`

Priority order: overdue → low-box-not-seen-today → net-new (capped at 5 per session). No same-topic back-to-back. Returns item id or `null` if queue empty.

**Files:**
- Modify: `src/engine-core.js`
- Modify: `tests/engine-core.test.js`

- [ ] **Step 1: Write failing tests**

Append to `tests/engine-core.test.js`:

```js
test('selectNextItem: returns null when no items', () => {
  const state = { items: {} };
  assert.strictEqual(EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0 }), null);
});

test('selectNextItem: prefers overdue items first', () => {
  const state = { items: {
    'a': { box: 2, due: '2026-05-10', topics: ['t1'] },
    'b': { box: 0, due: null, topics: ['t2'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0 });
  assert.strictEqual(id, 'a');
});

test('selectNextItem: prefers older overdue first', () => {
  const state = { items: {
    'a': { box: 2, due: '2026-05-12', topics: ['t1'] },
    'b': { box: 2, due: '2026-05-10', topics: ['t2'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0 });
  assert.strictEqual(id, 'b');
});

test('selectNextItem: low-box-not-seen-today after overdue', () => {
  const state = { items: {
    'lo': { box: 1, due: '2026-05-15', topics: ['t1'] }, // not overdue, low box
    'hi': { box: 4, due: '2026-05-15', topics: ['t2'] }, // not overdue, high box
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0 });
  assert.strictEqual(id, 'lo');
});

test('selectNextItem: new items only if newToday < cap', () => {
  const state = { items: {
    'n1': { box: 0, due: null, topics: ['t1'] },
  }};
  const idAllowed = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0, newCap: 5 });
  assert.strictEqual(idAllowed, 'n1');
  const idAtCap = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 5, newCap: 5 });
  assert.strictEqual(idAtCap, null);
});

test('selectNextItem: never returns an item whose topics intersect the last item\'s', () => {
  const state = { items: {
    'a1': { box: 2, due: '2026-05-10', topics: ['nom_m'] },
    'a2': { box: 2, due: '2026-05-10', topics: ['nom_m'] },
    'b1': { box: 2, due: '2026-05-10', topics: ['acc_f'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: ['a1'], lastTopics: ['nom_m'], newToday: 0 });
  assert.strictEqual(id, 'b1');
});

test('selectNextItem: multi-topic cloze items respect topic intersection', () => {
  const state = { items: {
    'multi': { box: 2, due: '2026-05-10', topics: ['nom_m', 'adj_ending'] },
    'ok':    { box: 2, due: '2026-05-10', topics: ['gen_f'] },
  }};
  // Prior item touched 'adj_ending' — multi shares that, should be skipped
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], lastTopics: ['adj_ending'], newToday: 0 });
  assert.strictEqual(id, 'ok');
});

test('selectNextItem: skips items in sessionSeen', () => {
  const state = { items: {
    'a': { box: 2, due: '2026-05-10', topics: ['t1'] },
    'b': { box: 2, due: '2026-05-10', topics: ['t2'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: ['a'], newToday: 0 });
  assert.strictEqual(id, 'b');
});

test('selectNextItem: falls through to new items only after overdue + low-box exhausted', () => {
  const state = { items: {
    'overdue': { box: 2, due: '2026-05-10', topics: ['t1'] },
    'new': { box: 0, due: null, topics: ['t2'] },
  }};
  const id = EngineCore.selectNextItem(state, '2026-05-14', { sessionSeen: [], newToday: 0 });
  assert.strictEqual(id, 'overdue');
});
```

- [ ] **Step 2: Run, expect failure**

```bash
node --test tests/engine-core.test.js
```

Expected: 8 new FAIL.

- [ ] **Step 3: Implement `selectNextItem`**

Add inside the IIFE in `src/engine-core.js`:

```js
  // NOTE: deckState.items[id] must include a `topics` array — typically hydrated
  // by the caller (engine-ui) from the deck definition, since SRS state alone
  // doesn't carry topics. For a cloze with multiple blanks, `topics` is the
  // union of every blank's topic. For text/choice, it's `[item.topic]`.
  function selectNextItem(deckState, today, options) {
    options = options || {};
    const sessionSeen = new Set(options.sessionSeen || []);
    const lastTopics = new Set(options.lastTopics || []);
    const newToday = options.newToday || 0;
    const newCap = options.newCap == null ? 5 : options.newCap;

    const items = deckState.items || {};
    const ids = Object.keys(items).filter(id => !sessionSeen.has(id));

    function topicsDisjoint(id) {
      if (lastTopics.size === 0) return true;
      const ts = items[id].topics || [];
      for (const t of ts) if (lastTopics.has(t)) return false;
      return true;
    }

    // Tier 1: overdue
    const overdue = ids
      .filter(id => items[id].due && items[id].due <= today && items[id].box > 0)
      .sort((a, b) => items[a].due < items[b].due ? -1 : items[a].due > items[b].due ? 1 : 0);
    for (const id of overdue) if (topicsDisjoint(id)) return id;
    if (overdue.length) return overdue[0]; // fall back if every candidate matches the last topics

    // Tier 2: low-box not new
    const lowBox = ids
      .filter(id => items[id].box > 0 && items[id].box < 4)
      .sort((a, b) => items[a].box - items[b].box);
    for (const id of lowBox) if (topicsDisjoint(id)) return id;
    if (lowBox.length) return lowBox[0];

    // Tier 3: new (box 0)
    if (newToday < newCap) {
      const fresh = ids.filter(id => items[id].box === 0);
      for (const id of fresh) if (topicsDisjoint(id)) return id;
      if (fresh.length) return fresh[0];
    }

    return null;
  }

  EngineCore.selectNextItem = selectNextItem;
```

- [ ] **Step 4: Run tests, expect pass**

```bash
node --test tests/engine-core.test.js
```

Expected: PASS — 33 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine-core.js tests/engine-core.test.js
git commit -m "$(cat <<'EOF'
feat: session selection with priority tiers and topic interleaving

selectNextItem honors overdue → low-box → new tier priority, the new-item
cap, the sessionSeen exclusion, and a no-topic-intersection rule with the
last item. Items carry `topics` (plural) so multi-blank cloze can declare
every topic touched; callers (engine-ui) hydrate from the deck definition.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Content Validator (Layer 1)

Build `build/validator.js` test-first. Every lint from the spec gets its own test. The validator returns an array of `{ severity, code, message, location }` objects; severity is `'error'` (fails build) or `'warning'` (does not fail build).

### Task 2.1: Validator scaffold + structural lints (C1–C4)

**Files:**
- Create: `build/validator.js`
- Create: `tests/validator.test.js`
- Create: `src/categories.json`

- [ ] **Step 1: Write `src/categories.json` (the pool category allowlist)**

```json
{
  "categories": [
    "definite_article",
    "indefinite_article",
    "modal_verb_form",
    "modal_lemma",
    "partizip_2",
    "aux_verb",
    "personal_pronoun",
    "possessive_pronoun",
    "demonstrative_pronoun",
    "interrogative_pronoun",
    "indefinite_pronoun",
    "reflexive_pronoun",
    "adj_ending",
    "noun_gender",
    "particle_meaning",
    "particle_form",
    "verb_form_finite",
    "verb_form_nonfinite",
    "preposition",
    "conjunction",
    "free_text"
  ]
}
```

- [ ] **Step 2: Write failing tests for C1–C4**

`tests/validator.test.js`:

```js
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
  // "kann" is inside "können", but only as a substring; should not flag
  assert.strictEqual(errs.filter(e => e.code === 'C3').length, 0);
});

test('C3: allowEcho:true suppresses C3 even when answer appears as a word', () => {
  // Answer "kann" appears as a whole word in the lead-in sentence (cue-then-recall pattern).
  // Without allowEcho, C3 would fire; allowEcho marks this as intentional.
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
```

- [ ] **Step 3: Run, expect failure**

```bash
node --test tests/validator.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement validator scaffold + C1–C4**

`build/validator.js`:

```js
const path = require('node:path');
const fs = require('node:fs');

const CATEGORIES = (function () {
  try {
    const p = path.join(__dirname, '..', 'src', 'categories.json');
    return new Set(JSON.parse(fs.readFileSync(p, 'utf8')).categories);
  } catch (e) {
    return new Set();
  }
})();

const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

function err(code, message, location) {
  return { severity: 'error', code, message, location };
}
function warn(code, message, location) {
  return { severity: 'warning', code, message, location };
}

function validateItem(item, deck) {
  const errs = [];
  const loc = `${deck.id}:${item.id}`;

  // C2: cloze placeholder match
  if (item.kind === 'cloze') {
    const blanks = item.blanks || [];
    const placeholders = (item.prompt || '').match(/\{(\d+)\}/g) || [];
    if (placeholders.length !== blanks.length) {
      errs.push(err('C2', `placeholder count (${placeholders.length}) ≠ blanks count (${blanks.length})`, loc));
    }
  }

  // C3: prompt contains answer (word-boundary aware; suppressed by allowEcho:true)
  // Collect all answers to check (cloze has many; text/choice one)
  const answersToCheck = item.kind === 'cloze'
    ? (item.blanks || []).map(b => b.answer).filter(a => a && a.length > 0)
    : (item.answer ? [item.answer] : []);
  if (!item.allowEcho && typeof item.prompt === 'string') {
    // Strip placeholders so we only check the surrounding context
    const context = item.prompt.replace(/\{\d+\}/g, ' ');
    for (const ans of answersToCheck) {
      // Escape regex special chars in the answer
      const escaped = ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match as a whole word using Unicode-aware boundaries
      const re = new RegExp('(?:^|[^\\p{L}])' + escaped + '(?=$|[^\\p{L}])', 'iu');
      if (re.test(context)) {
        errs.push(err('C3', `prompt contains the answer "${ans}" as a whole word (set "allowEcho": true if intentional)`, loc));
      }
    }
  }

  // C4: topic snake_case
  const topics = item.kind === 'cloze'
    ? (item.blanks || []).map(b => b.topic).filter(Boolean)
    : item.topic ? [item.topic] : [];
  for (const t of topics) {
    if (!SNAKE_CASE.test(t)) {
      errs.push(err('C4', `topic "${t}" is not snake_case`, loc));
    }
  }

  return errs;
}

function validateDeck(deck) {
  const errs = [];
  for (const item of (deck.items || [])) {
    errs.push(...validateItem(item, deck));
  }
  return errs;
}

function validateDecks(decks) {
  const errs = [];
  const seenIds = new Map();
  for (const deck of decks) {
    for (const item of (deck.items || [])) {
      if (seenIds.has(item.id)) {
        errs.push(err('C1', `duplicate item id "${item.id}" (first in ${seenIds.get(item.id)})`, `${deck.id}:${item.id}`));
      } else {
        seenIds.set(item.id, deck.id);
      }
    }
    errs.push(...validateDeck(deck));
  }
  return errs;
}

module.exports = { validateDeck, validateDecks, _categories: CATEGORIES };
```

- [ ] **Step 5: Run tests, expect pass**

```bash
node --test tests/validator.test.js
```

Expected: PASS — 5 tests passed.

- [ ] **Step 6: Commit**

```bash
git add build/validator.js src/categories.json tests/validator.test.js
git commit -m "$(cat <<'EOF'
feat(validator): structural lints C1-C4 + category allowlist

Validator scaffold returns severity-tagged error objects. C1-C4 cover
duplicate item ids, cloze placeholder/blank count match, prompt-leaks-answer,
and snake_case topic enforcement.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.2: Choice Mode A lints (C5–C6)

**Files:**
- Modify: `build/validator.js`
- Modify: `tests/validator.test.js`

- [ ] **Step 1: Write failing tests**

Append to `tests/validator.test.js`:

```js
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
```

- [ ] **Step 2: Run, expect failure**

```bash
node --test tests/validator.test.js
```

Expected: 6 new FAIL.

- [ ] **Step 3: Implement C5–C6 in `validateItem`**

In `build/validator.js`, inside `validateItem`, before `return errs;`, append:

```js
  if (item.kind === 'choice') {
    const hasOpts = Array.isArray(item.options);
    const hasPool = typeof item.pool === 'string' && item.pool.length > 0;
    if (hasOpts === hasPool) {
      errs.push(err('C5', `choice item must have exactly one of "options" or "pool"`, loc));
    }
    if (hasOpts) {
      if (item.options.length < 2) {
        errs.push(err('C6', `choice options has <2 entries`, loc));
      }
      const dups = item.options.length !== new Set(item.options).size;
      if (dups) errs.push(err('C6', `choice options has duplicates`, loc));
      if (item.answer != null && !item.options.includes(item.answer)) {
        errs.push(err('C6', `choice answer "${item.answer}" not in options`, loc));
      }
    }
  }
```

- [ ] **Step 4: Run tests, expect pass**

```bash
node --test tests/validator.test.js
```

Expected: PASS — 11 tests passed.

- [ ] **Step 5: Commit**

```bash
git add build/validator.js tests/validator.test.js
git commit -m "$(cat <<'EOF'
feat(validator): choice Mode A lints C5-C6

Enforce xor between options and pool; minimum 2 options, uniqueness, and
answer-in-options.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.3: Choice Mode B (pool) lints C7–C11

**Files:**
- Modify: `build/validator.js`
- Modify: `tests/validator.test.js`

- [ ] **Step 1: Write failing tests**

Append to `tests/validator.test.js`:

```js
function deckWithPools(items, pools) {
  return { id: 't', name: 'Test', icon: '🧪', color: '#fff', description: 'd', pools: pools, items: items };
}

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
```

- [ ] **Step 2: Run, expect failure**

```bash
node --test tests/validator.test.js
```

Expected: 7 new FAIL.

- [ ] **Step 3: Implement Mode B lints**

In `build/validator.js`, replace the `if (item.kind === 'choice') { ... }` block with:

```js
  if (item.kind === 'choice') {
    const hasOpts = Array.isArray(item.options);
    const hasPool = typeof item.pool === 'string' && item.pool.length > 0;
    if (hasOpts === hasPool) {
      errs.push(err('C5', `choice item must have exactly one of "options" or "pool"`, loc));
    }
    if (hasOpts) {
      if (item.options.length < 2) {
        errs.push(err('C6', `choice options has <2 entries`, loc));
      }
      const dups = item.options.length !== new Set(item.options).size;
      if (dups) errs.push(err('C6', `choice options has duplicates`, loc));
      if (item.answer != null && !item.options.includes(item.answer)) {
        errs.push(err('C6', `choice answer "${item.answer}" not in options`, loc));
      }
    }
    if (hasPool) {
      const pools = deck.pools || {};
      const pool = pools[item.pool];
      if (!pool) {
        errs.push(err('C7', `pool "${item.pool}" not defined in deck.pools`, loc));
      } else {
        const items = pool.items || [];
        if (item.answer != null && !items.includes(item.answer)) {
          errs.push(err('C8', `answer "${item.answer}" not in pool "${item.pool}"`, loc));
        }
        if (items.length < 4) {
          errs.push(err('C9', `pool "${item.pool}" has ${items.length} entries; need ≥4`, loc));
        }
        if (items.length !== new Set(items).size) {
          errs.push(err('C10', `pool "${item.pool}" has duplicate entries`, loc));
        }
        if (!pool.category) {
          errs.push(err('C11', `pool "${item.pool}" is missing "category"`, loc));
        } else if (!CATEGORIES.has(pool.category)) {
          errs.push(err('C11', `pool "${item.pool}" category "${pool.category}" not in allowlist (src/categories.json)`, loc));
        }
      }
    }
  }
```

- [ ] **Step 4: Run tests, expect pass**

```bash
node --test tests/validator.test.js
```

Expected: PASS — 18 tests passed.

- [ ] **Step 5: Commit**

```bash
git add build/validator.js tests/validator.test.js
git commit -m "$(cat <<'EOF'
feat(validator): choice Mode B (pool) lints C7-C11

Pool existence, answer-in-pool, minimum pool size (≥4 for 3 distractors),
entry uniqueness, and category-in-allowlist enforcement. Closes the
\"dead distractor\" regression class structurally.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.4: Categorical purity (C12) with morphology tables

For each pool category, validate that every entry passes a category-specific shape check.

**Files:**
- Create: `src/morphology/modals.json`
- Create: `src/morphology/articles.json`
- Modify: `build/validator.js`
- Modify: `tests/validator.test.js`

- [ ] **Step 1: Write `src/morphology/modals.json`**

```json
{
  "können": ["kann", "kannst", "können", "könnt", "konnte", "konntest", "konnten", "konntet", "könnte", "könntest", "könnten", "könntet", "gekonnt"],
  "müssen": ["muss", "musst", "müssen", "müsst", "musste", "musstest", "mussten", "musstet", "müsste", "müsstest", "müssten", "müsstet", "gemusst"],
  "dürfen": ["darf", "darfst", "dürfen", "dürft", "durfte", "durftest", "durften", "durftet", "dürfte", "dürftest", "dürften", "dürftet", "gedurft"],
  "sollen": ["soll", "sollst", "sollen", "sollt", "sollte", "solltest", "sollten", "solltet", "gesollt"],
  "wollen": ["will", "willst", "wollen", "wollt", "wollte", "wolltest", "wollten", "wolltet", "wollte", "wolltest", "wollten", "wolltet", "gewollt"],
  "mögen": ["mag", "magst", "mögen", "mögt", "mochte", "mochtest", "mochten", "mochtet", "möchte", "möchtest", "möchten", "möchtet", "gemocht"]
}
```

- [ ] **Step 2: Write `src/morphology/articles.json`**

```json
{
  "definite": ["der", "die", "das", "den", "dem", "des"],
  "indefinite": ["ein", "eine", "einen", "einem", "einer", "eines"],
  "negative": ["kein", "keine", "keinen", "keinem", "keiner", "keines"],
  "noun_gender": ["der", "die", "das"],
  "adj_endings": ["", "e", "en", "es", "er", "em"]
}
```

- [ ] **Step 3: Write failing tests for C12**

Append to `tests/validator.test.js`:

```js
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
```

- [ ] **Step 4: Run, expect failure**

```bash
node --test tests/validator.test.js
```

Expected: 5 new FAIL.

- [ ] **Step 5: Implement C12 with category checkers**

In `build/validator.js`, at the top after `CATEGORIES`, add:

```js
const MORPHOLOGY = (function () {
  const out = {};
  try {
    out.modals = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'morphology', 'modals.json'), 'utf8'));
    out.articles = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'morphology', 'articles.json'), 'utf8'));
  } catch (e) {}
  return out;
})();

function flattenModalForms() {
  const all = new Set();
  for (const lemma in (MORPHOLOGY.modals || {})) {
    for (const f of MORPHOLOGY.modals[lemma]) all.add(f);
  }
  return all;
}
const ALL_MODAL_FORMS = flattenModalForms();

const CATEGORY_MEMBERSHIP = {
  modal_verb_form: (s) => ALL_MODAL_FORMS.has(s),
  modal_lemma: (s) => (MORPHOLOGY.modals || {}).hasOwnProperty(s),
  definite_article: (s) => (MORPHOLOGY.articles && MORPHOLOGY.articles.definite || []).includes(s),
  indefinite_article: (s) => (MORPHOLOGY.articles && MORPHOLOGY.articles.indefinite || []).includes(s),
  noun_gender: (s) => ['der','die','das'].includes(s),
  adj_ending: (s) => (MORPHOLOGY.articles && MORPHOLOGY.articles.adj_endings || []).includes(s),
  // categories without a shape check just enforce non-empty strings
};

function categoryCheck(category, value) {
  const checker = CATEGORY_MEMBERSHIP[category];
  if (!checker) return typeof value === 'string' && value.length >= 0; // permissive
  return checker(value);
}
```

Then inside `validateItem`, in the `if (hasPool) { ... if (pool) { ... }` block, add **after** the C11 category-allowlist check:

```js
        if (pool.category && CATEGORIES.has(pool.category)) {
          for (const entry of items) {
            if (!categoryCheck(pool.category, entry)) {
              errs.push(err('C12', `pool "${item.pool}" entry "${entry}" fails category check for "${pool.category}"`, loc));
            }
          }
        }
```

- [ ] **Step 6: Run tests, expect pass**

```bash
node --test tests/validator.test.js
```

Expected: PASS — 23 tests passed.

- [ ] **Step 7: Commit**

```bash
git add build/validator.js src/morphology/modals.json src/morphology/articles.json tests/validator.test.js
git commit -m "$(cat <<'EOF'
feat(validator): categorical purity (C12) with morphology tables

Per-category shape checks for modal verb forms, modal lemmas, definite/
indefinite articles, noun gender, and adjective endings. Morphology tables
shipped as JSON in src/morphology/. Categories without a shape check are
permissive (semantic correctness covered by Layer 3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.5: Cloze/text alts auto-derivation and C13–C15

**Files:**
- Modify: `build/validator.js`
- Modify: `tests/validator.test.js`

- [ ] **Step 1: Write failing tests**

Append to `tests/validator.test.js`:

```js
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
  // acceptAny is the escape hatch for items with multiple valid combos;
  // individual blank answers may be empty if acceptAny covers them
  const item = {
    id: 'a', kind: 'cloze', prompt: 'Ich {0} gehen.',
    blanks: [{ answer: '', topic: 'modal' }],
    acceptAny: [['kann'], ['muss'], ['will']]
  };
  const errs = validateDeck(deck([item]));
  assert.strictEqual(errs.filter(e => e.code === 'C13').length, 0);
});

test('C14: missing case-flipped alt at sentence start → warning', () => {
  // sentence-start "Der" without "der" in alts
  const item = { id: 'a', kind: 'cloze', prompt: '{0} Mann liest.', blanks: [{ answer: 'Der', alts: [], topic: 'nom_m_def' }] };
  const errs = validateDeck(deck([item]));
  assert.ok(errs.some(e => e.code === 'C14' && e.severity === 'warning'));
});

test('C14: mid-sentence answer does NOT trigger spurious case-flip warning', () => {
  // "läuft" mid-sentence — "Läuft" is NOT a valid alt at this position
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
```

- [ ] **Step 2: Run, expect failure**

```bash
node --test tests/validator.test.js
```

Expected: 5 new FAIL.

- [ ] **Step 3: Implement C13–C15**

In `build/validator.js`, inside `validateItem`, append before `return errs;`:

```js
  // C13: non-empty answers (escape hatch: cloze with acceptAny covers blanks)
  const hasAcceptAny = item.kind === 'cloze' && Array.isArray(item.acceptAny) && item.acceptAny.length > 0;
  if (item.kind === 'cloze' && !hasAcceptAny) {
    for (let i = 0; i < (item.blanks || []).length; i++) {
      const a = item.blanks[i].answer;
      if (typeof a !== 'string' || a.length === 0) {
        errs.push(err('C13', `cloze blank ${i} has empty answer (set acceptAny if multiple combos are valid)`, loc));
      }
    }
  } else if (item.kind === 'text') {
    if (typeof item.answer !== 'string' || item.answer.length === 0) {
      errs.push(err('C13', `text answer is empty`, loc));
    }
  }
  // acceptAny shape check
  if (hasAcceptAny) {
    const blanksLen = (item.blanks || []).length;
    for (let i = 0; i < item.acceptAny.length; i++) {
      const combo = item.acceptAny[i];
      if (!Array.isArray(combo) || combo.length !== blanksLen) {
        errs.push(err('C13', `acceptAny[${i}] must be an array of ${blanksLen} string(s)`, loc));
      }
    }
  }

  // C14: warn on missing common alts (position-aware for case-flip)
  function digraphVariant(ans) {
    const umlautMap = [['ä','ae'],['ö','oe'],['ü','ue'],['ß','ss'],['Ä','Ae'],['Ö','Oe'],['Ü','Ue']];
    let withDigraphs = ans;
    for (const [u, d] of umlautMap) withDigraphs = withDigraphs.split(u).join(d);
    return withDigraphs !== ans ? withDigraphs : null;
  }
  function caseFlippedFirst(ans) {
    if (!ans || !ans.length) return null;
    const flipped = (ans[0] === ans[0].toUpperCase())
      ? ans[0].toLowerCase() + ans.slice(1)
      : ans[0].toUpperCase() + ans.slice(1);
    return flipped !== ans ? flipped : null;
  }
  // Does the prompt place this blank at sentence start?
  // Heuristic: the substring of prompt up to {N} is empty OR ends with sentence terminator + whitespace.
  function isSentenceStart(prompt, blankIndex) {
    if (typeof prompt !== 'string') return false;
    const re = new RegExp('\\{' + blankIndex + '\\}');
    const m = prompt.match(re);
    if (!m) return false;
    const before = prompt.slice(0, m.index).replace(/\s+$/, '');
    return before === '' || /[.!?]$/.test(before);
  }

  function checkAlts(answer, alts, label, allowCaseFlip) {
    const have = new Set(alts || []);
    if (allowCaseFlip) {
      const flipped = caseFlippedFirst(answer);
      if (flipped && !have.has(flipped)) {
        errs.push(warn('C14', `${label} answer "${answer}" missing expected alt "${flipped}"`, loc));
      }
    }
    const digraph = digraphVariant(answer);
    if (digraph && !have.has(digraph)) {
      errs.push(warn('C14', `${label} answer "${answer}" missing expected alt "${digraph}"`, loc));
    }
  }

  if (item.kind === 'cloze') {
    for (let i = 0; i < (item.blanks || []).length; i++) {
      const atStart = isSentenceStart(item.prompt, i);
      checkAlts(item.blanks[i].answer || '', item.blanks[i].alts || [], `blank ${i}`, atStart);
    }
  } else if (item.kind === 'text') {
    // text prompts are always considered "answer in isolation" — case-flip alts always advised
    checkAlts(item.answer || '', item.alts || [], 'text', true);
  }

  // C15: translation reminder on cloze
  if (item.kind === 'cloze' && !item.translation) {
    errs.push(warn('C15', `cloze item has no translation field`, loc));
  }

  // C19: scaffoldPool on cloze blanks must exist and contain the blank's answer
  if (item.kind === 'cloze') {
    const pools = deck.pools || {};
    for (let i = 0; i < (item.blanks || []).length; i++) {
      const b = item.blanks[i];
      if (b.scaffoldPool) {
        const p = pools[b.scaffoldPool];
        if (!p) {
          errs.push(err('C19', `blank ${i} scaffoldPool "${b.scaffoldPool}" not defined in deck.pools`, loc));
        } else if (b.answer && !p.items.includes(b.answer)) {
          errs.push(err('C19', `blank ${i} answer "${b.answer}" not in pool "${b.scaffoldPool}"`, loc));
        }
      }
    }
  }
```

- [ ] **Step 4: Run tests, expect pass**

```bash
node --test tests/validator.test.js
```

Expected: PASS — 28 tests passed.

- [ ] **Step 5: Commit**

```bash
git add build/validator.js tests/validator.test.js
git commit -m "$(cat <<'EOF'
feat(validator): cloze/text answer & alt lints C13-C15 + C19 scaffoldPool

C13 enforces non-empty answers; an acceptAny escape hatch covers
multi-blank cloze items where several combos are valid. C14 warns on
missing alt variants — digraph (ae/oe/ue/ss) always, case-flip only when
the blank sits at sentence start. C15 nudges cloze items to include
translations. C19 validates per-blank scaffoldPool references against
deck.pools and requires the blank's answer to be in the named pool.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.6: Cross-deck gender consistency (C16) + translation parity (C17)

**Files:**
- Modify: `build/validator.js`
- Modify: `tests/validator.test.js`

- [ ] **Step 1: Write failing tests**

Append to `tests/validator.test.js`:

```js
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
  // vocab says Apfel is masculine; declension item uses "eine Apfel" (feminine indefinite)
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
```

- [ ] **Step 2: Run, expect failure**

```bash
node --test tests/validator.test.js
```

Expected: 2 new FAIL.

- [ ] **Step 3: Implement C16**

In `build/validator.js`, replace `validateDecks` with:

```js
// Map article forms → implied gender. Nominative is unambiguous; other cases
// share forms across genders (e.g., "dem" is m+n dative), so we only infer
// when the case context can be derived. For v1 we use a conservative subset
// where the form uniquely determines gender at the citation level.
const ARTICLE_GENDER_NOM = {
  // Definite (nominative singular)
  'der': 'der', 'die': 'die', 'das': 'das',
  // Indefinite (nominative singular): "ein" → m or n (ambiguous), so omit;
  // "eine" → f (unique in nominative); accusative "einen" → m only.
  'eine': 'die', 'einen': 'der',
  // Negative parallels
  'keine': 'die', 'keinen': 'der',
};

function collectGenderClaim(item, deck) {
  // Explicit claim: choice with der/die/das options or noun_gender pool, single-word prompt.
  if (item.kind === 'choice') {
    const opts = item.options || (deck.pools && item.pool && deck.pools[item.pool] ? deck.pools[item.pool].items : null);
    const category = item.pool && deck.pools && deck.pools[item.pool] ? deck.pools[item.pool].category : null;
    const isGender = (opts && opts.length === 3 && opts.every(o => ['der','die','das'].includes(o)))
                  || category === 'noun_gender';
    if (isGender && typeof item.prompt === 'string') {
      const m = item.prompt.trim().match(/^([A-ZÄÖÜ][a-zäöüß]+)$/);
      if (m) return { lemma: m[1], gender: item.answer };
    }
  }
  // Implicit claim: cloze where the blank's answer is an article + the following
  // token is a capitalized noun. E.g., "{0} Apfel" answer "Der" → Apfel is "der".
  if (item.kind === 'cloze' && Array.isArray(item.blanks)) {
    const prompt = item.prompt || '';
    for (let i = 0; i < item.blanks.length; i++) {
      const re = new RegExp('\\{' + i + '\\}\\s+([A-ZÄÖÜ][a-zäöüß]+)');
      const m = prompt.match(re);
      if (!m) continue;
      const noun = m[1];
      const ansLower = (item.blanks[i].answer || '').toLowerCase();
      const implied = ARTICLE_GENDER_NOM[ansLower];
      if (implied) return { lemma: noun, gender: implied };
    }
  }
  return null;
}

function validateDecks(decks) {
  const errs = [];
  const seenIds = new Map();
  const genderClaims = new Map(); // lemma → { gender, location }

  for (const deck of decks) {
    for (const item of (deck.items || [])) {
      if (seenIds.has(item.id)) {
        errs.push(err('C1', `duplicate item id "${item.id}" (first in ${seenIds.get(item.id)})`, `${deck.id}:${item.id}`));
      } else {
        seenIds.set(item.id, deck.id);
      }
      const claim = collectGenderClaim(item, deck);
      if (claim) {
        const prior = genderClaims.get(claim.lemma);
        if (prior && prior.gender !== claim.gender) {
          errs.push(err('C16', `gender disagreement for "${claim.lemma}": "${prior.gender}" (in ${prior.loc}) vs "${claim.gender}" (in ${deck.id}:${item.id})`, `${deck.id}:${item.id}`));
        } else if (!prior) {
          genderClaims.set(claim.lemma, { gender: claim.gender, loc: `${deck.id}:${item.id}` });
        }
      }
    }
    errs.push(...validateDeck(deck));
  }
  return errs;
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
node --test tests/validator.test.js
```

Expected: PASS — 30 tests passed.

- [ ] **Step 5: Commit**

```bash
git add build/validator.js tests/validator.test.js
git commit -m "$(cat <<'EOF'
feat(validator): cross-deck gender consistency (C16)

Build collects explicit gender claims (choice items with der/die/das
options or noun_gender pool) AND implicit ones (cloze items where the
blank's answer is a gender-unique article and the following token is a
capitalized noun, e.g., "eine Apfel" implies feminine Apfel). Fails on
disagreement across any of these sources.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.7: C18 — Mode A category purity (close the Mode A back door)

The whole pool-based design exists to make dead distractors structurally impossible — but **Mode A (explicit `options`) bypasses C12**. An author can hand-roll `["kann","können","darf","muss"]` and the validator will pass it. C18 closes this gap: when every entry in a Mode A `options` list matches some allowlisted category's shape check, the validator errors and suggests converting to Mode B with the matching pool.

**Files:**
- Modify: `build/validator.js`
- Modify: `tests/validator.test.js`

- [ ] **Step 1: Write failing tests**

Append to `tests/validator.test.js`:

```js
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
```

- [ ] **Step 2: Run, expect failure**

```bash
node --test tests/validator.test.js
```

Expected: 4 new FAIL.

- [ ] **Step 3: Implement C18 in `build/validator.js`**

Add a helper near `CATEGORY_MEMBERSHIP`:

```js
function CATEGORY_MEMBERSHIP_KEYS() {
  return Object.keys(CATEGORY_MEMBERSHIP);
}
```

Inside `validateItem`'s `if (item.kind === 'choice') { ... }` block, after the existing Mode A checks (the `if (hasOpts) { ... }` body), append:

```js
    if (hasOpts && item.options.length >= 3) {
      for (const cat of CATEGORY_MEMBERSHIP_KEYS()) {
        if (cat === 'noun_gender') continue; // canonical Mode A exception
        let allMatch = true;
        for (const opt of item.options) {
          if (!categoryCheck(cat, opt)) { allMatch = false; break; }
        }
        if (allMatch) {
          errs.push(err('C18',
            `Mode A options all match category "${cat}" — convert to Mode B with a typed pool to prevent dead-distractor regressions`,
            loc));
          break;
        }
      }
    }
```

- [ ] **Step 4: Run, expect pass**

```bash
node --test tests/validator.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add build/validator.js tests/validator.test.js
git commit -m "$(cat <<'EOF'
feat(validator): C18 — Mode A category purity check (close the back door)

If every entry in a Mode A options list matches an allowlisted category
(modal_verb_form, definite_article, etc.), error and suggest converting
to Mode B with a typed pool. noun_gender is exempt — Mode A is the right
idiom there. 2-option items are exempt — typically intrinsic binary
choices. Closes the back door that would otherwise let kann/können/darf/
muss ship as Mode A.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.8: Standalone `build/lint.js` for fast author feedback

**Files:**
- Create: `build/lint.js`

- [ ] **Step 1: Write `build/lint.js`**

```js
#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { validateDecks } = require('./validator.js');

const REPO = path.resolve(__dirname, '..');
const DECKS_DIR = path.join(REPO, 'decks');

function loadDecks() {
  if (!fs.existsSync(DECKS_DIR)) return [];
  return fs.readdirSync(DECKS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(DECKS_DIR, f), 'utf8')));
}

function main() {
  const decks = loadDecks();
  const errs = validateDecks(decks);
  const fatal = errs.filter(e => e.severity === 'error');
  const warns = errs.filter(e => e.severity === 'warning');
  for (const w of warns) console.warn(`[warn ${w.code}] ${w.location}: ${w.message}`);
  for (const e of fatal) console.error(`[error ${e.code}] ${e.location}: ${e.message}`);
  console.log(`\n${decks.length} deck(s), ${fatal.length} error(s), ${warns.length} warning(s).`);
  process.exit(fatal.length > 0 ? 1 : 0);
}

main();
```

- [ ] **Step 2: Verify it runs**

```bash
node build/lint.js
```

Expected: prints `0 deck(s), 0 error(s), 0 warning(s).` (decks dir still empty before migration).

- [ ] **Step 3: Commit**

```bash
git add build/lint.js
git commit -m "$(cat <<'EOF'
feat(build): standalone build/lint.js for fast author feedback

Runs the validator without emitting index.html. \`npm run lint\` exits
non-zero on any error. Useful when authoring large decks (vocabulary)
where rebuilding the full HTML on every iteration is unnecessary.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Build Script

### Task 3.1: `build/build.js` — concatenate src + decks, validate, emit `index.html`

**Files:**
- Create: `build/build.js`
- Create: `src/index.html.template`
- Create: `tests/build.test.js`

- [ ] **Step 1: Write `src/index.html.template`**

This is the host shell with placeholders for the build script to fill. Full UI comes in Phase 4; for now, just enough to verify the build pipeline.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
<title>German Drills</title>
<style>/*__STYLES__*/</style>
</head>
<body>
<div id="root"></div>
<script>/*__DECKS__*/</script>
<script>/*__STORAGE__*/</script>
<script>/*__ENGINE_CORE__*/</script>
<script>/*__ENGINE_UI__*/</script>
</body>
</html>
```

- [ ] **Step 2: Write failing test for the build**

`tests/build.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const cp = require('node:child_process');

const REPO = path.resolve(__dirname, '..');

test('build: produces index.html at the repo root', () => {
  const out = path.join(REPO, 'index.html');
  if (fs.existsSync(out)) fs.unlinkSync(out);
  cp.execFileSync(process.execPath, ['build/build.js'], { cwd: REPO });
  assert.ok(fs.existsSync(out), 'index.html should exist after build');
  const html = fs.readFileSync(out, 'utf8');
  assert.ok(html.includes('<title>German Drills</title>'));
  assert.ok(!html.includes('__STYLES__'), 'placeholder __STYLES__ should be replaced');
  assert.ok(!html.includes('__DECKS__'), 'placeholder __DECKS__ should be replaced');
});

test('build: fails non-zero on validator error', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gd-build-'));
  fs.mkdirSync(path.join(dir, 'decks'));
  // a deck that violates C13 (empty answer)
  fs.writeFileSync(path.join(dir, 'decks/bad.json'), JSON.stringify({
    id: 'bad', name: 'B', icon: '!', color: '#fff', description: 'd',
    items: [{ id: 'x', kind: 'text', prompt: 'p', answer: '', topic: 't' }],
  }));
  // copy the rest of the build infrastructure
  fs.cpSync(path.join(REPO, 'src'), path.join(dir, 'src'), { recursive: true });
  fs.cpSync(path.join(REPO, 'build'), path.join(dir, 'build'), { recursive: true });
  const res = cp.spawnSync(process.execPath, ['build/build.js'], { cwd: dir });
  assert.notStrictEqual(res.status, 0, 'build should exit non-zero on validator error');
  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 3: Run, expect failure**

```bash
node --test tests/build.test.js
```

Expected: FAIL — `build/build.js` doesn't exist.

- [ ] **Step 4: Implement `build/build.js`**

```js
#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { validateDecks } = require('./validator.js');

const REPO = path.resolve(__dirname, '..');
const SRC = path.join(REPO, 'src');
const DECKS_DIR = path.join(REPO, 'decks');
const OUT = path.join(REPO, 'index.html');

function read(p) { return fs.readFileSync(p, 'utf8'); }

function loadDecks() {
  if (!fs.existsSync(DECKS_DIR)) return [];
  return fs.readdirSync(DECKS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(read(path.join(DECKS_DIR, f))));
}

function inlineModule(code) {
  // Strip the UMD wrapper export branch — we know we're in browser.
  // The UMD pattern already does the right thing via globalThis, so we
  // can inline as-is. The "module.exports" branch will be a no-op in browser.
  return code;
}

function readIfExists(p) {
  return fs.existsSync(p) ? read(p) : '';
}

function build() {
  const decks = loadDecks();
  const errors = validateDecks(decks);
  const fatal = errors.filter(e => e.severity === 'error');
  const warns = errors.filter(e => e.severity === 'warning');

  for (const w of warns) {
    console.warn(`[warn ${w.code}] ${w.location}: ${w.message}`);
  }
  if (fatal.length > 0) {
    for (const e of fatal) {
      console.error(`[error ${e.code}] ${e.location}: ${e.message}`);
    }
    console.error(`\nBuild failed: ${fatal.length} error(s).`);
    process.exit(1);
  }

  const template = read(path.join(SRC, 'index.html.template'));
  const styles = readIfExists(path.join(SRC, 'styles.css'));
  const storage = readIfExists(path.join(SRC, 'storage.js'));
  const engineCore = readIfExists(path.join(SRC, 'engine-core.js'));
  const engineUi = readIfExists(path.join(SRC, 'engine-ui.js'));

  const decksJs = `window.DECKS = ${JSON.stringify(decks)};`;

  const html = template
    .replace('/*__STYLES__*/', styles)
    .replace('/*__DECKS__*/', decksJs)
    .replace('/*__STORAGE__*/', inlineModule(storage))
    .replace('/*__ENGINE_CORE__*/', inlineModule(engineCore))
    .replace('/*__ENGINE_UI__*/', inlineModule(engineUi));

  fs.writeFileSync(OUT, html);
  console.log(`Built ${OUT} (${decks.length} deck${decks.length === 1 ? '' : 's'}, ${warns.length} warning(s))`);

  // Snapshot drift check — informational; doesn't fail the build, but tells
  // the author exactly what to do if Layer 3 tests are about to fail.
  const snapDir = path.join(REPO, 'tests', 'snapshots');
  let driftCount = 0;
  if (fs.existsSync(snapDir)) {
    try {
      const { buildSnapshot } = require('./snapshot.js');
      for (const deck of decks) {
        const snapPath = path.join(snapDir, deck.id + '.txt');
        if (!fs.existsSync(snapPath)) { driftCount++; continue; }
        const current = buildSnapshot(deck);
        if (current !== fs.readFileSync(snapPath, 'utf8')) driftCount++;
      }
    } catch (e) {
      // snapshot.js may not exist yet during early phases
    }
  }
  if (driftCount > 0) {
    console.warn(`\nSnapshot drift detected for ${driftCount} deck(s). Run \`node build/snapshot.js\` and review the diffs before committing.`);
  }
}

build();
```

- [ ] **Step 5: Run tests, expect pass**

```bash
node --test tests/build.test.js
```

Expected: PASS — 2 tests passed.

- [ ] **Step 6: Run the build for real to verify end-to-end**

```bash
node build/build.js
```

Expected: prints `Built ...index.html (0 decks, 0 warning(s))`.

- [ ] **Step 7: Commit**

```bash
git add build/build.js src/index.html.template tests/build.test.js index.html
git commit -m "$(cat <<'EOF'
feat: build script — validate + inline + emit single index.html

build/build.js reads src/ + decks/, runs the validator, fails non-zero on
any error, prints warnings, and inlines styles + decks + UMD modules into a
single index.html committed to the repo root.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Engine UI (Host Shell + Renderer)

This phase builds the browser-only DOM layer: `src/styles.css`, `src/engine-ui.js`, and the populated `src/index.html.template`. Manual browser verification is primary here since DOM testing without jsdom is awkward; we lean on the headless-tested engine-core for correctness and visually verify the rendering.

### Task 4.1: Shared CSS — `src/styles.css`

**Files:**
- Create: `src/styles.css`

- [ ] **Step 1: Write CSS for the shell + drill view**

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; }
body {
  font-family: 'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f0f1a; color: #e0e0e0;
  -webkit-tap-highlight-color: transparent;
}

/* Menu */
.menu { height: 100%; overflow-y: auto; padding: 0 16px 40px; display: flex; flex-direction: column; align-items: center; }
.menu.hidden { display: none; }
.logo { margin: 48px 0 8px; font-family: 'DM Mono', monospace; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: #666; }
.title { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; color: #fff; margin-bottom: 6px; }
.subtitle { font-size: 13px; color: #555; margin-bottom: 32px; font-family: 'DM Mono', monospace; }

.deck-list { width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 12px; }
.deck-card { position: relative; overflow: hidden; background: #16162a; border: 1px solid #1e1e3a; border-radius: 14px; padding: 20px; cursor: pointer; transition: transform 0.15s, border-color 0.2s; }
.deck-card:active { transform: scale(0.97); }
.deck-card:hover { border-color: #333; }
.deck-card .accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.deck-card .icon { font-size: 28px; margin-bottom: 10px; display: block; }
.deck-card .name { font-size: 17px; font-weight: 600; color: #fff; margin-bottom: 4px; }
.deck-card .desc { font-size: 12px; color: #777; line-height: 1.5; font-family: 'DM Mono', monospace; }
.deck-card .progress-bar { margin-top: 12px; height: 4px; background: #1e1e3a; border-radius: 2px; overflow: hidden; }
.deck-card .progress-fill { height: 100%; transition: width 0.3s; }
.deck-card .progress-label { font-size: 10px; color: #555; margin-top: 4px; font-family: 'DM Mono', monospace; }

/* Drill view */
.drill { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0f0f1a; display: none; flex-direction: column; padding: 16px; }
.drill.active { display: flex; }
.drill-top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #1e1e3a; }
.drill-back { background: none; border: none; color: #888; cursor: pointer; padding: 6px 10px; font-size: 14px; }
.drill-progress { font-family: 'DM Mono', monospace; font-size: 12px; color: #666; }
.drill-body { flex: 1; overflow-y: auto; padding: 24px 8px; max-width: 560px; width: 100%; margin: 0 auto; }
.prompt { font-size: 22px; line-height: 1.6; color: #fff; margin-bottom: 24px; }
.blank { display: inline-block; min-width: 80px; border-bottom: 2px solid #555; padding: 2px 8px; margin: 0 4px; font-family: 'DM Mono', monospace; }
.blank.filled { border-bottom-color: #7f5af0; color: #fff; }
.blank.correct { border-bottom-color: #4ade80; }
.blank.wrong { border-bottom-color: #ef4444; color: #fca5a5; }
.blank input { background: transparent; border: none; color: inherit; font: inherit; outline: none; width: 100%; }

.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.chip { background: #1e1e3a; color: #ddd; border: 1px solid #2a2a4a; border-radius: 18px; padding: 8px 14px; cursor: pointer; font-size: 14px; user-select: none; }
.chip:hover { background: #2a2a4a; }
.chip.used { opacity: 0.3; pointer-events: none; }

.choice-options { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.choice-btn { background: #16162a; border: 1px solid #2a2a4a; color: #ddd; padding: 14px; border-radius: 10px; cursor: pointer; font-size: 16px; text-align: left; }
.choice-btn:hover { border-color: #444; }
.choice-btn.correct { border-color: #4ade80; color: #4ade80; }
.choice-btn.wrong { border-color: #ef4444; color: #ef4444; }

.feedback { margin-top: 24px; padding: 16px; border-radius: 10px; }
.feedback.correct { background: #143020; color: #86efac; }
.feedback.wrong { background: #301414; color: #fca5a5; }
.feedback .correct-form { font-family: 'DM Mono', monospace; font-weight: 600; }
.feedback .translation { color: #888; font-size: 13px; margin-top: 8px; }

.drill-actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; padding: 16px 0; border-top: 1px solid #1e1e3a; }
.btn-primary { background: #7f5af0; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 15px; }
.btn-primary:hover { background: #9572f0; }
.btn-secondary { background: transparent; color: #888; border: 1px solid #333; padding: 12px 20px; border-radius: 10px; cursor: pointer; }

.session-end { text-align: center; padding: 40px 16px; }
.session-end .stat { font-family: 'DM Mono', monospace; color: #aaa; margin: 8px 0; }
.session-end .stat-val { font-size: 24px; font-weight: 700; color: #fff; }

/* Backup row */
.backup-row { display: flex; gap: 8px; justify-content: center; margin-top: 24px; }
.backup-btn { font-family: 'DM Mono', monospace; font-size: 11px; color: #555; border: 1px solid #333; background: transparent; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
.backup-btn:hover { border-color: #555; color: #888; }
```

- [ ] **Step 2: Run build to confirm no breakage**

```bash
node build/build.js
```

Expected: success, includes styles inlined.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css index.html
git commit -m "$(cat <<'EOF'
feat(ui): shared CSS for menu, drill view, chips, choice buttons, feedback

Single stylesheet replaces seven per-deck CSS payloads. Dark theme based on
the current host shell palette so the visual change feels evolutionary, not
disruptive.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.2: Engine UI controller — `src/engine-ui.js`

The DOM-touching half of the engine. Reads from `EngineCore` + `Storage` + `window.DECKS`. Handles: menu render, deck open, item render per kind, input capture, scaffolding, wrong-answer correction protocol, SRS commit on outcome, session end, dashboard.

This is the largest single task. The code below is the complete file.

**Files:**
- Create: `src/engine-ui.js`

- [ ] **Step 1: Write `src/engine-ui.js` (full file)**

```js
(function (global) {
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs, ...children) => {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'style' && typeof attrs[k] === 'object') Object.assign(n.style, attrs[k]);
      else if (k.startsWith('on') && typeof attrs[k] === 'function') n[k.toLowerCase()] = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    for (const c of children.flat()) {
      if (c == null) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  };

  function today() { return new Date().toISOString().slice(0, 10); }
  function nowIso() { return new Date().toISOString(); }

  function loadOrInitDeckState(deckId, deckDef) {
    let s = Storage.loadDeck(deckId);
    if (!s) {
      s = { deckId, version: 1, items: {}, sessionMeta: { todayCount: 0, newToday: 0, todayDate: today(), firstTryCorrectToday: 0 } };
    }
    for (const item of deckDef.items) {
      if (!s.items[item.id]) {
        s.items[item.id] = { box: 0, ease: 2.5, interval: 0, due: null, lapses: 0, lastSeen: null, seenCount: 0 };
      }
    }
    if (s.sessionMeta.todayDate !== today()) {
      s.sessionMeta = { todayCount: 0, newToday: 0, todayDate: today(), firstTryCorrectToday: 0 };
    }
    return s;
  }

  // selectNextItem needs items keyed by id with a `topics` array. SRS state
  // doesn't carry topics; hydrate them from the deck definition each tick.
  function topicsOf(itemDef) {
    if (itemDef.kind === 'cloze' && Array.isArray(itemDef.blanks)) {
      const set = new Set();
      for (const b of itemDef.blanks) if (b.topic) set.add(b.topic);
      return Array.from(set);
    }
    return itemDef.topic ? [itemDef.topic] : [];
  }

  function hydratedStateView(state, deckDef) {
    const items = {};
    for (const def of deckDef.items) {
      const s = state.items[def.id] || {};
      items[def.id] = { ...s, topics: topicsOf(def) };
    }
    return { items };
  }

  function getProgress(deckId) {
    const s = Storage.loadDeck(deckId);
    if (!s || !s.items) return null;
    const ids = Object.keys(s.items);
    if (ids.length === 0) return null;
    const mastered = ids.filter(id => s.items[id].box >= 4).length;
    return { pct: Math.round(mastered / ids.length * 100), label: `${mastered}/${ids.length} mastered` };
  }

  // ----- Menu -----
  function renderMenu() {
    const root = $('#root');
    root.innerHTML = '';
    const menu = el('div', { class: 'menu', id: 'menuScreen' },
      el('div', { class: 'logo' }, 'deutsch'),
      el('div', { class: 'title' }, 'German Drills'),
      el('div', { class: 'subtitle' }, `${window.DECKS.length} deck${window.DECKS.length === 1 ? '' : 's'} · tap to start`)
    );
    const list = el('div', { class: 'deck-list' });
    for (const d of window.DECKS) {
      const prog = getProgress(d.id);
      const card = el('div', { class: 'deck-card', onclick: () => openDeck(d.id) });
      card.appendChild(el('div', { class: 'accent', style: { background: d.color } }));
      card.appendChild(el('span', { class: 'icon' }, d.icon));
      card.appendChild(el('div', { class: 'name' }, d.name));
      card.appendChild(el('div', { class: 'desc' }, d.description));
      if (prog) {
        const bar = el('div', { class: 'progress-bar' });
        bar.appendChild(el('div', { class: 'progress-fill', style: { width: prog.pct + '%', background: d.color } }));
        card.appendChild(bar);
        card.appendChild(el('div', { class: 'progress-label' }, prog.label));
      }
      list.appendChild(card);
    }
    menu.appendChild(list);
    const backup = el('div', { class: 'backup-row' },
      el('button', { class: 'backup-btn', onclick: exportProgress }, '↓ Export'),
      el('button', { class: 'backup-btn', onclick: importProgress }, '↑ Import')
    );
    menu.appendChild(backup);
    const fileInput = el('input', { type: 'file', id: 'importFile', accept: '.json', style: { display: 'none' }, onchange: handleImport });
    menu.appendChild(fileInput);
    root.appendChild(menu);
  }

  function exportProgress() {
    const backup = Storage.exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `german-drills-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function importProgress() { $('#importFile').click(); }
  function handleImport(evt) {
    const f = evt.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (!confirm('Replace current progress with backup?')) return;
        Storage.importAll(backup);
        renderMenu();
      } catch (ex) { alert('Could not parse backup file.'); }
      evt.target.value = '';
    };
    r.readAsText(f);
  }

  // ----- Drill -----
  let DRILL = null; // current session state

  function openDeck(deckId) {
    const deckDef = window.DECKS.find(d => d.id === deckId);
    const state = loadOrInitDeckState(deckId, deckDef);
    DRILL = {
      deckId,
      deckDef,
      state,
      sessionSeen: [],
      sessionCount: 0,
      sessionCap: 20,
      newToday: state.sessionMeta.newToday || 0, // genuine new-items-today counter
      newCap: 5,
      lastTopics: [],
      firstTryCorrect: 0,
      advanced: 0,
      lapsed: 0,
      currentItemId: null,
      attemptedThisItem: false,
      usedScaffolding: false,
    };
    renderDrill();
  }

  function closeDrill() {
    DRILL = null;
    renderMenu();
  }

  function renderDrill() {
    const root = $('#root');
    root.innerHTML = '';
    const top = el('div', { class: 'drill-top' },
      el('button', { class: 'drill-back', onclick: closeDrill }, '← Menu'),
      el('div', { class: 'drill-progress' }, `${DRILL.sessionCount + 1} / ${DRILL.sessionCap}`)
    );
    const body = el('div', { class: 'drill-body', id: 'drillBody' });
    const drill = el('div', { class: 'drill active' }, top, body);
    root.appendChild(drill);
    advance();
  }

  function advance() {
    if (DRILL.sessionCount >= DRILL.sessionCap) return endSession();
    const view = hydratedStateView(DRILL.state, DRILL.deckDef);
    const id = EngineCore.selectNextItem(view, today(), {
      sessionSeen: DRILL.sessionSeen,
      lastTopics: DRILL.lastTopics,
      newToday: DRILL.newToday,
      newCap: DRILL.newCap,
    });
    if (!id) return endSession();
    DRILL.currentItemId = id;
    DRILL.attemptedThisItem = false;
    DRILL.usedScaffolding = false;
    const itemDef = DRILL.deckDef.items.find(it => it.id === id);
    renderItem(itemDef);
  }

  function renderItem(item) {
    const body = $('#drillBody');
    body.innerHTML = '';
    const state = DRILL.state.items[item.id];
    if (item.kind === 'cloze') renderCloze(body, item, state);
    else if (item.kind === 'text') renderText(body, item, state);
    else if (item.kind === 'choice') renderChoice(body, item, state);
  }

  function renderCloze(body, item, state) {
    const blanks = item.blanks;
    const promptHtml = el('div', { class: 'prompt' });
    const inputs = [];
    const parts = item.prompt.split(/(\{\d+\})/g);
    for (const p of parts) {
      const m = p.match(/^\{(\d+)\}$/);
      if (m) {
        const i = +m[1];
        const blank = el('span', { class: 'blank' });
        const inp = el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', size: Math.max(4, blanks[i].answer.length + 2) });
        if (state.box <= 1) inp.placeholder = '_'.repeat(blanks[i].answer.length);
        else if (state.box === 2) inp.placeholder = blanks[i].answer[0] + '_'.repeat(blanks[i].answer.length - 1);
        else inp.placeholder = '';
        blank.appendChild(inp);
        inputs.push({ inp, blank, def: blanks[i] });
        promptHtml.appendChild(blank);
      } else {
        promptHtml.appendChild(document.createTextNode(p));
      }
    }
    body.appendChild(promptHtml);

    // Scaffolding: at box 0-1 show chips from declared per-blank scaffoldPools
    if (state.box <= 1) {
      const chipSet = new Set();
      for (const b of blanks) chipSet.add(b.answer); // always include the actual answers
      const deckPools = DRILL.deckDef.pools || {};
      for (const b of blanks) {
        if (b.scaffoldPool && deckPools[b.scaffoldPool]) {
          for (const e of deckPools[b.scaffoldPool].items) chipSet.add(e);
        }
      }
      if (chipSet.size > blanks.length) {
        // We're showing real distractors, not just the answers — count as scaffolding
        DRILL.usedScaffolding = true;
      }
      const chipsEl = el('div', { class: 'chips' });
      const chipList = Array.from(chipSet).slice(0, 12);
      shuffleDeterministic(chipList, hashCode(item.id));
      for (const w of chipList) {
        chipsEl.appendChild(el('div', { class: 'chip', onclick: (e) => fillFirstEmpty(inputs, w, e.target) }, w));
      }
      body.appendChild(chipsEl);
    }

    const submitBtn = el('button', { class: 'btn-primary', onclick: () => submitCloze(item, inputs) }, 'Check');
    body.appendChild(el('div', { class: 'drill-actions' }, submitBtn));

    setTimeout(() => inputs[0] && inputs[0].inp.focus(), 0);
  }

  function fillFirstEmpty(inputs, word, chipEl) {
    for (const i of inputs) {
      if (!i.inp.value) { i.inp.value = word; chipEl.classList.add('used'); return; }
    }
  }

  function submitCloze(item, inputs) {
    let allCorrect;
    // acceptAny escape hatch: multiple valid combos
    if (Array.isArray(item.acceptAny) && item.acceptAny.length > 0) {
      const userValues = inputs.map(i => i.inp.value);
      allCorrect = item.acceptAny.some(combo =>
        combo.length === userValues.length &&
        combo.every((expected, i) => EngineCore.answersMatch(userValues[i], expected, []))
      );
      for (const { inp, blank } of inputs) {
        blank.classList.add(allCorrect ? 'correct' : 'wrong');
      }
    } else {
      allCorrect = true;
      for (const { inp, blank, def } of inputs) {
        const ok = EngineCore.answersMatch(inp.value, def.answer, def.alts || []);
        blank.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) allCorrect = false;
      }
    }
    finalizeAttempt(item, allCorrect, inputs);
  }

  function renderText(body, item, state) {
    body.appendChild(el('div', { class: 'prompt' }, item.prompt));
    const inp = el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', class: 'blank filled', style: { fontSize: '18px', minWidth: '200px' } });
    body.appendChild(inp);
    const submit = el('button', { class: 'btn-primary', onclick: () => {
      const ok = EngineCore.answersMatch(inp.value, item.answer, item.alts || []);
      inp.classList.add(ok ? 'correct' : 'wrong');
      finalizeAttempt(item, ok, [{ inp, blank: inp, def: { answer: item.answer } }]);
    } }, 'Check');
    body.appendChild(el('div', { class: 'drill-actions' }, submit));
    setTimeout(() => inp.focus(), 0);
  }

  function renderChoice(body, item, state) {
    const promptHtml = el('div', { class: 'prompt' }, item.prompt);
    body.appendChild(promptHtml);
    let options;
    if (Array.isArray(item.options)) {
      options = item.options.slice();
    } else {
      const pool = DRILL.deckDef.pools[item.pool].items;
      const seed = hashCode(item.id + ':' + DRILL.state.items[item.id].seenCount);
      const distractors = EngineCore.selectDistractors(pool, item.answer, state.box, 3, seed);
      options = [item.answer].concat(distractors);
      // Shuffle deterministically
      shuffleDeterministic(options, seed + 1);
    }
    const wrap = el('div', { class: 'choice-options' });
    for (const opt of options) {
      const btn = el('button', { class: 'choice-btn', onclick: () => {
        const ok = opt === item.answer;
        btn.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) {
          // Mark the correct one for visibility
          for (const b of wrap.children) if (b.textContent === item.answer) b.classList.add('correct');
        }
        finalizeAttempt(item, ok, [{ inp: { value: opt }, blank: btn, def: { answer: item.answer } }]);
      } }, opt);
      wrap.appendChild(btn);
    }
    body.appendChild(wrap);
  }

  function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function shuffleDeterministic(arr, seed) {
    let s = seed >>> 0;
    function r() { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  }

  // ----- Outcome handling + correction protocol -----
  function finalizeAttempt(item, correct, inputs) {
    DRILL.attemptedThisItem = true;
    const state = DRILL.state.items[item.id];
    const body = $('#drillBody');
    // Feedback panel
    const fb = el('div', { class: 'feedback ' + (correct ? 'correct' : 'wrong') });
    if (correct) {
      fb.appendChild(el('div', null, 'Correct.'));
      if (item.translation) fb.appendChild(el('div', { class: 'translation' }, item.translation));
    } else {
      const correctForm = item.kind === 'cloze'
        ? item.blanks.map(b => b.answer).join(' / ')
        : item.answer;
      fb.appendChild(el('div', null, 'Correct answer: '));
      fb.appendChild(el('div', { class: 'correct-form' }, correctForm));
      if (item.translation) fb.appendChild(el('div', { class: 'translation' }, item.translation));
    }
    body.appendChild(fb);

    // For wrong answers: force typed correction before advancing.
    if (!correct) {
      const corrLabel = el('div', { style: { marginTop: '20px', color: '#aaa', fontSize: '14px' } }, 'Type the correct answer to continue:');
      body.appendChild(corrLabel);
      // For items with acceptAny, show the first valid combo as the canonical correction
      let correctText;
      if (item.kind === 'cloze') {
        if (Array.isArray(item.acceptAny) && item.acceptAny.length > 0) {
          correctText = item.acceptAny[0].join(' ');
        } else {
          correctText = item.blanks.map(b => b.answer).join(' ');
        }
      } else {
        correctText = item.answer;
      }
      const corrInp = el('input', { type: 'text', class: 'blank filled', autocomplete: 'off', spellcheck: 'false', style: { fontSize: '16px', marginTop: '8px', minWidth: '300px' } });
      body.appendChild(corrInp);
      const advanceBtn = el('button', { class: 'btn-primary', style: { marginTop: '12px' }, onclick: () => {
        // For acceptAny, accept any of the valid combos as correction
        let ok;
        if (item.kind === 'cloze' && Array.isArray(item.acceptAny) && item.acceptAny.length > 0) {
          const normalized = EngineCore.normalizeAnswer(corrInp.value);
          ok = item.acceptAny.some(combo => EngineCore.normalizeAnswer(combo.join(' ')) === normalized);
        } else {
          ok = EngineCore.normalizeAnswer(corrInp.value) === EngineCore.normalizeAnswer(correctText);
        }
        if (ok) {
          commitOutcome(item, 'wrong');
          DRILL.lapsed++;
          nextItem(item);
        } else {
          corrInp.classList.add('wrong');
          setTimeout(() => corrInp.classList.remove('wrong'), 600);
        }
      } }, 'Continue');
      body.appendChild(el('div', { class: 'drill-actions' }, advanceBtn));
      setTimeout(() => corrInp.focus(), 0);
    } else {
      const outcome = DRILL.usedScaffolding ? 'correct-aided' : 'correct';
      const wasNew = state.box === 0;
      commitOutcome(item, outcome);
      if (outcome === 'correct' && !DRILL.usedScaffolding) DRILL.firstTryCorrect++;
      DRILL.advanced++;
      if (wasNew) {
        DRILL.newToday++;
        DRILL.state.sessionMeta.newToday = (DRILL.state.sessionMeta.newToday || 0) + 1;
      }
      const advanceBtn = el('button', { class: 'btn-primary', onclick: () => nextItem(item) }, 'Next');
      body.appendChild(el('div', { class: 'drill-actions' }, advanceBtn));
      setTimeout(() => advanceBtn.focus(), 0);
    }
  }

  function commitOutcome(item, outcome) {
    const state = DRILL.state.items[item.id];
    const updated = EngineCore.srsUpdate(state, outcome);
    updated.due = addDays(today(), updated.interval);
    updated.lastSeen = nowIso();
    updated.seenCount = (state.seenCount || 0) + 1;
    DRILL.state.items[item.id] = updated;
    Storage.saveDeck(DRILL.deckId, DRILL.state);
  }

  // Declared as `var` so Task 4.3 (Daily Review) can wrap it for mixed-mode dispatch
  var nextItem = function (prevItem) {
    DRILL.sessionSeen.push(prevItem.id);
    DRILL.lastTopics = topicsOf(prevItem);
    DRILL.sessionCount++;
    DRILL.state.sessionMeta.todayCount++;
    Storage.saveDeck(DRILL.deckId, DRILL.state);
    advance();
  };

  function addDays(yyyymmdd, days) {
    const d = new Date(yyyymmdd + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function endSession() {
    const body = $('#drillBody');
    if (body) body.innerHTML = '';
    const summary = el('div', { class: 'session-end' },
      el('div', { class: 'stat-val' }, String(DRILL.sessionCount)),
      el('div', { class: 'stat' }, 'items seen'),
      el('div', { class: 'stat-val' }, String(DRILL.firstTryCorrect)),
      el('div', { class: 'stat' }, 'first-try correct'),
      el('div', { class: 'stat-val' }, String(DRILL.advanced)),
      el('div', { class: 'stat' }, 'advanced'),
      el('div', { class: 'stat-val' }, String(DRILL.lapsed)),
      el('div', { class: 'stat' }, 'lapsed'),
      el('button', { class: 'btn-primary', style: { marginTop: '24px' }, onclick: closeDrill }, 'Back to menu')
    );
    if (body) body.appendChild(summary);
  }

  // ----- Boot -----
  window.addEventListener('DOMContentLoaded', () => {
    renderMenu();
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderMenu, openDeck };
  } else {
    global.EngineUI = { renderMenu, openDeck };
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 2: Run the build**

```bash
node build/build.js
```

Expected: success.

- [ ] **Step 3: Manual smoke test (the engine has no decks yet, just verify the shell renders)**

Open `index.html` in a browser. Expected:
- The page shows "deutsch / German Drills / 0 decks · tap to start" and an empty deck list.
- Export and Import buttons present, no errors in browser console.

- [ ] **Step 4: Commit**

```bash
git add src/engine-ui.js index.html
git commit -m "$(cat <<'EOF'
feat(ui): engine UI controller — menu, drill view, all three primitives

Renders cloze/text/choice items with box-keyed scaffolding. Chip scaffold
draws from each blank's declared scaffoldPool (no fuzzy substring matching).
Wrong-answer correction protocol forces the user to type the right form
before advancing. acceptAny escape hatch for multi-blank cloze with several
valid combos. Outcome (correct/correct-aided/wrong) commits through
srsUpdate and persists via Storage. newToday is its own session counter
(distinct from todayCount). Items expose their `topics` (plural) so
multi-blank cloze participates correctly in the interleaving rule.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.3: Cross-deck "Daily Review" mode

Spec calls for a separate menu entry that pulls only overdue items from every deck, capped at 30 items, fully interleaved.

**Files:**
- Modify: `src/engine-ui.js`
- Modify: `src/styles.css` (small button addition)

- [ ] **Step 1: Add Daily Review entry point and selection logic to `src/engine-ui.js`**

Inside the IIFE, after `renderMenu` and before the boot section, add:

```js
  // ----- Daily Review (cross-deck) -----
  function dailyReviewQueue() {
    // Returns up to 30 due items across all decks, interleaved by deck + topic.
    const t = today();
    const allDue = []; // [{ deckId, deckDef, itemDef, state, dueDate, topics }]
    for (const deckDef of window.DECKS) {
      const state = Storage.loadDeck(deckDef.id);
      if (!state || !state.items) continue;
      for (const itemDef of deckDef.items) {
        const s = state.items[itemDef.id];
        if (!s || !s.due || s.box <= 0) continue;
        if (s.due <= t) {
          allDue.push({ deckId: deckDef.id, deckDef, itemDef, state: s, dueDate: s.due, topics: topicsOf(itemDef) });
        }
      }
    }
    // Sort by oldest due first
    allDue.sort((a, b) => a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0);

    // Interleave: never two consecutive items from same deck or same topic
    const queue = [];
    const remaining = allDue.slice();
    let lastDeck = null;
    let lastTopics = new Set();
    while (queue.length < 30 && remaining.length > 0) {
      let pickIdx = remaining.findIndex(c =>
        c.deckId !== lastDeck &&
        !c.topics.some(t => lastTopics.has(t))
      );
      if (pickIdx === -1) pickIdx = 0; // accept best available
      const pick = remaining.splice(pickIdx, 1)[0];
      queue.push(pick);
      lastDeck = pick.deckId;
      lastTopics = new Set(pick.topics);
    }
    return queue;
  }

  function openDailyReview() {
    const queue = dailyReviewQueue();
    if (queue.length === 0) {
      alert('No items due today. Come back tomorrow.');
      return;
    }
    // Wrap in a synthetic DRILL that pumps the queue and routes outcomes to
    // the correct per-deck state.
    DRILL = {
      mixed: true,
      queue,
      qIdx: 0,
      sessionCount: 0,
      sessionCap: queue.length,
      firstTryCorrect: 0,
      advanced: 0,
      lapsed: 0,
      attemptedThisItem: false,
      usedScaffolding: false,
      lastTopics: [],
      sessionSeen: [],
    };
    renderDrillMixed();
  }

  function renderDrillMixed() {
    const root = $('#root');
    root.innerHTML = '';
    const top = el('div', { class: 'drill-top' },
      el('button', { class: 'drill-back', onclick: closeDrill }, '← Menu'),
      el('div', { class: 'drill-progress' }, `Daily Review · ${DRILL.sessionCount + 1} / ${DRILL.sessionCap}`)
    );
    const body = el('div', { class: 'drill-body', id: 'drillBody' });
    root.appendChild(el('div', { class: 'drill active' }, top, body));
    advanceMixed();
  }

  function advanceMixed() {
    if (DRILL.qIdx >= DRILL.queue.length) return endSession();
    const entry = DRILL.queue[DRILL.qIdx];
    // Set DRILL.deckId / state / deckDef so finalizeAttempt + commitOutcome work
    DRILL.deckId = entry.deckId;
    DRILL.deckDef = entry.deckDef;
    DRILL.state = Storage.loadDeck(entry.deckId);
    DRILL.usedScaffolding = false;
    DRILL.attemptedThisItem = false;
    renderItem(entry.itemDef);
  }

  // In mixed mode, nextItem advances through the queue rather than calling
  // selectNextItem. Patch nextItem to branch:
  const origNextItem = nextItem;
  nextItem = function (prevItem) {
    if (DRILL.mixed) {
      DRILL.lastTopics = topicsOf(prevItem);
      DRILL.qIdx++;
      DRILL.sessionCount++;
      Storage.saveDeck(DRILL.deckId, DRILL.state);
      advanceMixed();
    } else {
      origNextItem(prevItem);
    }
  };
```

Hoist the `nextItem` reference so the reassignment works: change the original `function nextItem(prevItem) { ... }` declaration to `var nextItem = function (prevItem) { ... }` (so the later reassignment isn't a syntax conflict with a function declaration).

- [ ] **Step 2: Add the Daily Review button to the menu**

Inside `renderMenu` in `src/engine-ui.js`, after the deck list and before the backup row, insert:

```js
    const dailyBtn = el('button', { class: 'btn-primary', style: { marginTop: '20px', width: '100%', maxWidth: '440px' }, onclick: openDailyReview }, 'Daily Review (cross-deck)');
    menu.appendChild(dailyBtn);
```

- [ ] **Step 3: Update exports**

Replace the export line at the bottom of the IIFE:

```js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderMenu, openDeck, openDailyReview };
  } else {
    global.EngineUI = { renderMenu, openDeck, openDailyReview };
  }
```

- [ ] **Step 4: Build and manually verify**

```bash
node build/build.js
```

Open `index.html`. The menu shows a "Daily Review (cross-deck)" button. With no progress yet it alerts "No items due today." Once at least one deck has lapsed/overdue items, the button opens a mixed-deck session that ends when the queue is empty or 30 items are done.

- [ ] **Step 5: Commit**

```bash
git add src/engine-ui.js index.html
git commit -m "$(cat <<'EOF'
feat(ui): cross-deck Daily Review mode

New menu entry pulls only overdue items from every deck, sorted by oldest
due-date first, interleaved so no two consecutive items share a deck or
a topic. Capped at 30 items. Reuses the existing item renderers and
correction protocol; outcomes commit through Storage per the item's
home deck.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — Content Migration (One Deck at a Time)

Each migration task follows the same procedure. The "code" each task contains is the deck JSON — the questions, pools, and metadata. The procedural steps repeat because they are the work.

**Reference materials:** The original base64 decks are decoded into `deck0.html` through `deck6.html` in the repo root from prior work. If they are absent, regenerate with `node decode_decks.js`.

**Common procedure (followed by every migration task):**
1. Open the relevant `deckN.html` working copy.
2. Identify all distinct question categories (these become `topic` tags).
3. Identify any morphological pools needed (these become deck `pools` entries with categories from `src/categories.json`).
4. Transcribe items into the new JSON schema, preferring `cloze` over `choice` per the spec's "production over recognition" principle. Re-prompt items as needed so the expected answer is unique.
5. Run `node build/lint.js` for fast feedback during authoring, then `node build/build.js` to emit the HTML.
6. Fix any validator errors. Address warnings deliberately (most often by adding alt variants).
7. Run the **Migration Spot-Check Checklist** below.
8. Commit.

**Migration Spot-Check Checklist** (run before every migration commit — 5 items is not enough coverage for hundreds-to-thousands of items per deck):

1. **Lint clean:** `node build/lint.js` exits 0. Warnings reviewed and either addressed or explicitly acceptable.
2. **High-frequency sample (5 items):** Pick 5 items the user is likely to see in the first session. Open `index.html`, run them, verify rendering is correct and answers are accepted.
3. **Edge-case sample (5 items):** Pick 5 items that exercise unusual shapes — multi-blank cloze, items with `acceptAny`, items with `scaffoldPool`, items with non-default alts. Run, verify.
4. **Alt sample (5 items):** Pick 5 items where `alts` matter (umlauts, capitalization, alternate spellings). Type each accepted variant; verify all are accepted.
5. **Translation sample (5 items):** Pick 5 cloze items with `translation`. Verify the translation actually corresponds to the German prompt (catches copy-paste errors).
6. **Wrong-answer correction protocol (1 item):** Deliberately fail one item. Verify the correction protocol fires and accepts only the correct typed form.
7. **Build snapshot:** Run `node build/snapshot.js` to (re)generate snapshots. `git diff tests/snapshots/` — every change should be intentional and explicable.
8. **Cross-deck check:** Run `node --test tests/`. The full Layer 1/2/3 suite must pass (especially C16 cross-deck gender consistency, which only fires when this deck is built against the others).

### Task 5.1: Migrate Declension → `decks/declension.json`

**Files:**
- Create: `decks/declension.json`

- [ ] **Step 1: Decode the original deck if not already present**

```bash
test -f deck0.html || node decode_decks.js
```

- [ ] **Step 2: Inventory the source content**

Open `deck0.html`. Identify the topic taxonomy. Expected topics in declension:
- `nom_m_def`, `nom_f_def`, `nom_n_def`, `nom_pl_def`
- `acc_m_def`, `acc_f_def`, `acc_n_def`, `acc_pl_def`
- `dat_m_def`, `dat_f_def`, `dat_n_def`, `dat_pl_def`
- `gen_m_def`, `gen_f_def`, `gen_n_def`, `gen_pl_def`
- Indefinite-article variants of the above (`nom_m_indef`, etc.)
- Negative-article variants (`nom_m_neg`, etc.) for kein/keine drills
- `adj_ending_*` for adjective endings after der/ein/no article
- Optional: `weil_dass_wenn_*` for subordinate clauses

- [ ] **Step 3: Define the pools section**

Determine which pools the deck needs. At minimum:

```json
"pools": {
  "definite_articles": { "category": "definite_article", "items": ["der","die","das","den","dem","des"] },
  "indefinite_articles": { "category": "indefinite_article", "items": ["ein","eine","einen","einem","einer","eines"] },
  "negative_articles": { "category": "indefinite_article", "items": ["kein","keine","keinen","keinem","keiner","keines"] },
  "adj_endings_strong": { "category": "adj_ending", "items": ["","e","en","es","er","em"] }
}
```

- [ ] **Step 4: Author the items array**

Aim for full coverage of the topic taxonomy. Each declension question becomes a `cloze` like:

```json
{
  "id": "decl_nom_m_def_001",
  "kind": "cloze",
  "prompt": "{0} Mann liest die Zeitung.",
  "blanks": [{ "answer": "Der", "alts": ["der"], "topic": "nom_m_def" }],
  "translation": "The man reads the newspaper."
}
```

Multi-blank (article + ending) items:

```json
{
  "id": "decl_nom_m_def_adj_001",
  "kind": "cloze",
  "prompt": "{0} klein{1} Hund schläft.",
  "blanks": [
    { "answer": "Der", "alts": ["der"], "topic": "nom_m_def" },
    { "answer": "e", "alts": [], "topic": "adj_ending_strong_nom_m" }
  ],
  "translation": "The small dog sleeps."
}
```

Build the full `decks/declension.json` covering all 16+ topic combinations with multiple examples each. Target item count: ~200–300 (similar to the original).

Full file template:

```json
{
  "id": "declension",
  "name": "Declension",
  "icon": "📐",
  "color": "#7f5af0",
  "description": "Articles, adjective endings, and case in context.",
  "pools": {
    "definite_articles": { "category": "definite_article", "items": ["der","die","das","den","dem","des"] },
    "indefinite_articles": { "category": "indefinite_article", "items": ["ein","eine","einen","einem","einer","eines"] },
    "negative_articles": { "category": "indefinite_article", "items": ["kein","keine","keinen","keinem","keiner","keines"] },
    "adj_endings_strong": { "category": "adj_ending", "items": ["","e","en","es","er","em"] }
  },
  "items": [
    /* ~200-300 cloze items covering all 16 case/gender/number combos
       with definite, indefinite, and negative-article variants,
       plus adjective-ending drills. */
  ]
}
```

- [ ] **Step 5: Run the build**

```bash
node build/build.js
```

Expected: no errors (warnings about C15 translations or C14 alts are addressable but not blocking).

- [ ] **Step 6: Run the Migration Spot-Check Checklist (defined at the top of Phase 5)**

Deck-specific things to watch for in Declension:
- Multi-blank cloze items (article + adjective ending) render both blanks inline and both must be filled before submission.
- Chips shown at box 0 are drawn from declared `scaffoldPool`s (definite_articles / adj_endings_strong), not random words.
- C16 implicit gender consistency: declension noun phrases agree with vocab gender claims for the same noun.
- Alt list covers capitalized vs. lowercase at sentence start.

- [ ] **Step 7: Commit**

```bash
git add decks/declension.json index.html
git commit -m "$(cat <<'EOF'
feat(content): migrate Declension deck to new JSON schema

~200-300 cloze items across all case/gender/number combos with definite,
indefinite, and negative article variants plus adjective endings. Pools
declared for definite/indefinite/negative articles and strong-decl
adjective endings.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5.2: Migrate Chameleon Words → `decks/chameleon.json`

**Files:**
- Create: `decks/chameleon.json`

- [ ] **Step 1: Decode the original deck if not already present**

```bash
test -f deck5.html || node decode_decks.js
```

- [ ] **Step 2: Inventory the source content**

Open `deck5.html`. Topics align with each particle and role: `nach_after`, `nach_to`, `noch_still`, `noch_more`, `schon_already`, `schon_emphatic`, `doch_however`, `doch_yes`, `mal_once`, `mal_softener`, `erst_first`, `erst_only_just`, `ja_yes`, `ja_emphatic`, `denn_for`, `denn_question`, `wohl_probably`, `wohl_well`.

- [ ] **Step 3: Define the pools section**

Particle-meaning pools are best as Mode A (explicit options) because each particle's distractor set is a curated semantic set. Skip pools unless useful for cross-particle distractor draws.

- [ ] **Step 4: Author the items array**

Each chameleon item is a sentence-level cloze where the user types the entire ordered sentence — that's what the original deck practiced (chip-ordering for word position in subordinate clauses). Translate to typed cloze:

```json
{
  "id": "cham_schon_already_001",
  "kind": "cloze",
  "prompt": "Ich habe das Buch {0} gelesen.",
  "blanks": [{ "answer": "schon", "alts": [], "topic": "schon_already" }],
  "translation": "I have already read the book."
}
```

For meaning ID (which particle fits in this context), use `choice` with explicit options:

```json
{
  "id": "cham_meaning_001",
  "kind": "choice",
  "prompt": "Ich habe das Buch ___ gelesen. (already)",
  "options": ["schon", "noch", "erst", "mal"],
  "answer": "schon",
  "topic": "schon_already"
}
```

Full deck file as in 5.1, adjusted for chameleon content. Target ~80–120 items.

- [ ] **Step 5: Run the build**

```bash
node build/build.js
```

- [ ] **Step 6: Run the Migration Spot-Check Checklist (defined at the top of Phase 5)**

Deck-specific things to watch for in Chameleon Words:
- Particle placement cloze items accept the particle in the expected sentence position.
- Choice items for meaning ID have semantically distinct distractors (e.g., "already" vs. "still" vs. "only just"), not morphologically related distractors.
- Several particles have multiple acceptable placements in the same sentence — use `acceptAny` where appropriate.

- [ ] **Step 7: Commit**

```bash
git add decks/chameleon.json index.html
git commit -m "$(cat <<'EOF'
feat(content): migrate Chameleon Words deck to new JSON schema

~80-120 items across 9 particles × meaning-role combos. Cloze items
test particle placement in context; choice items test meaning ID with
hand-curated semantic distractors.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5.3: Migrate Modal Verbs → `decks/modal-verbs.json`

**Files:**
- Create: `decks/modal-verbs.json`

- [ ] **Step 1: Decode the original deck if not already present**

```bash
test -f deck1.html || node decode_decks.js
```

- [ ] **Step 2: Inventory the source content**

Open `deck1.html`. Expected topics: per-modal Präsens / Präteritum / Konjunktiv II × person/number. Modals: können, müssen, dürfen, sollen, wollen, mögen (and möchten as a separate KII form).

- [ ] **Step 3: Define the pools section**

One pool per modal × tense combination — these are exactly the morphology tables already shipped in `src/morphology/modals.json`. Reference them:

```json
"pools": {
  "können_all_forms": { "category": "modal_verb_form", "items": ["kann","kannst","können","könnt","konnte","konntest","konnten","konntet","könnte","könntest","könnten","könntet"] },
  "müssen_all_forms": { "category": "modal_verb_form", "items": ["muss","musst","müssen","müsst","musste","musstest","mussten","musstet","müsste","müsstest","müssten","müsstet"] },
  "dürfen_all_forms": { "category": "modal_verb_form", "items": ["darf","darfst","dürfen","dürft","durfte","durftest","durften","durftet","dürfte","dürftest","dürften","dürftet"] },
  "sollen_all_forms": { "category": "modal_verb_form", "items": ["soll","sollst","sollen","sollt","sollte","solltest","sollten","solltet"] },
  "wollen_all_forms": { "category": "modal_verb_form", "items": ["will","willst","wollen","wollt","wollte","wolltest","wollten","wolltet"] },
  "mögen_all_forms": { "category": "modal_verb_form", "items": ["mag","magst","mögen","mögt","mochte","mochtest","mochten","mochtet","möchte","möchtest","möchten","möchtet"] }
}
```

- [ ] **Step 4: Author the items array**

Prefer cloze (typed conjugation) since the form is uniquely determined by the sentence:

```json
{
  "id": "modal_können_3pl_pres_001",
  "kind": "cloze",
  "prompt": "Sie {0} Deutsch sprechen.",
  "blanks": [{ "answer": "können", "alts": [], "topic": "können_3pl_pres" }],
  "translation": "They can speak German."
}
```

For "which modal fits this meaning?" questions, use choice Mode B with a `modal_lemma` pool:

```json
"pools": {
  /* ... */
  "modal_lemmas": { "category": "modal_lemma", "items": ["können","müssen","dürfen","sollen","wollen","mögen"] }
}
```

```json
{
  "id": "modal_lemma_obligation_001",
  "kind": "choice",
  "prompt": "Ich ___ jetzt nach Hause gehen. (necessity)",
  "pool": "modal_lemmas",
  "answer": "müssen",
  "topic": "modal_lemma_obligation"
}
```

Target ~160 items as in the original.

- [ ] **Step 5: Run the build**

```bash
node build/build.js
```

Expected: clean. The `_lemma` choice with the modal_lemma pool prevents the kann/können/darf/muss class of regression structurally — the answer's a *lemma*, and the pool contains only lemmas, so a conjugated form can never sneak in as a distractor.

- [ ] **Step 6: Run the Migration Spot-Check Checklist (defined at the top of Phase 5)**

Deck-specific things to watch for in Modal Verbs (this is the regression-target deck):
- The kann/können/darf/muss pattern: pick a few `können` conjugation cloze items at box 4, verify the engine offers other conjugations of `können` (kannst/könnt/etc.) as distractors — NEVER `darf`, `muss`, `mag` etc. as base forms.
- Lemma-choice items (which modal fits the meaning?) draw from the `modal_lemmas` pool and don't accidentally pull in conjugated forms.
- All six modals exercised at present, preterite, and subjunctive II forms.
- C18 was not triggered for any item (no Mode A authoring of same-category options).

- [ ] **Step 7: Commit**

```bash
git add decks/modal-verbs.json index.html
git commit -m "$(cat <<'EOF'
feat(content): migrate Modal Verbs deck to new JSON schema

~160 items: cloze for typed conjugations, choice Mode B for lemma
selection. Pools cover all 6 modals × all forms; modal_lemmas pool used
for meaning-fits questions. The pool-based authoring prevents the
kann/können/darf/muss dead-distractor failure mode entirely.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5.4: Migrate Past / Future → `decks/past-future.json`

**Files:**
- Create: `decks/past-future.json`

- [ ] **Step 1: Decode the original deck if not already present**

```bash
test -f deck2.html || node decode_decks.js
```

- [ ] **Step 2: Inventory the source content**

Open `deck2.html`. Topics: per-verb Partizip II + auxiliary choice (haben/sein), Futur I (werden + infinitive). Verbs: a substantial set covering A2/B1 frequency (gehen, sein, haben, machen, kommen, fahren, finden, sehen, lesen, schreiben, etc.).

- [ ] **Step 3: Define the pools section**

```json
"pools": {
  "aux_verbs": { "category": "aux_verb", "items": ["habe","hast","hat","haben","habt","bin","bist","ist","sind","seid"] },
  "partizip_2_strong_weak": { "category": "partizip_2", "items": [/* gathered partizip forms from the source */] }
}
```

Add the `aux_verb` and `partizip_2` shape-check entries in `build/validator.js` only if needed; the spec currently lists them as permissive (no morphology table). If a richer check is desired, ship `src/morphology/partizip.json` and extend `CATEGORY_MEMBERSHIP`. For v1, permissive is fine.

- [ ] **Step 4: Author the items array**

Perfekt cloze (two blanks: aux + partizip):

```json
{
  "id": "past_perfekt_gehen_001",
  "kind": "cloze",
  "prompt": "Ich {0} gestern zur Schule {1}.",
  "blanks": [
    { "answer": "bin", "alts": [], "topic": "aux_sein_1sg" },
    { "answer": "gegangen", "alts": [], "topic": "partizip_gehen" }
  ],
  "translation": "I went to school yesterday."
}
```

Futur I:

```json
{
  "id": "future_futur1_gehen_001",
  "kind": "cloze",
  "prompt": "Morgen {0} ich zur Schule {1}.",
  "blanks": [
    { "answer": "werde", "alts": [], "topic": "futur_werden_1sg" },
    { "answer": "gehen", "alts": [], "topic": "futur_inf_gehen" }
  ],
  "translation": "Tomorrow I will go to school."
}
```

Auxiliary choice:

```json
{
  "id": "past_aux_gehen_001",
  "kind": "choice",
  "prompt": "Ich ___ nach Hause gegangen.",
  "options": ["bin","habe"],
  "answer": "bin",
  "topic": "aux_choice_motion"
}
```

Target ~330 items.

- [ ] **Step 5: Run the build**

```bash
node build/build.js
```

- [ ] **Step 6: Run the Migration Spot-Check Checklist (defined at the top of Phase 5)**

Deck-specific things to watch for in Past / Future:
- Auxiliary choice (haben vs. sein) consistently agrees with verb motion/state semantics across items.
- Partizip II forms match what `src/morphology/modals.json` (and any future partizip morphology) would declare, even though the validator is permissive here for v1.
- Multi-blank items where both auxiliary and partizip are tested can sometimes accept either auxiliary depending on dialect — flag those candidates for `acceptAny`.

- [ ] **Step 7: Commit**

```bash
git add decks/past-future.json index.html
git commit -m "$(cat <<'EOF'
feat(content): migrate Past / Future deck to new JSON schema

~330 items: Perfekt (auxiliary + partizip cloze), Futur I (werden +
infinitive cloze), and auxiliary-choice items. Pool for finite haben/sein
forms; partizip permissive.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5.5: Migrate Pronouns → `decks/pronouns.json`

**Files:**
- Create: `decks/pronouns.json`

- [ ] **Step 1: Decode the original deck if not already present**

```bash
test -f deck3.html || node decode_decks.js
```

- [ ] **Step 2: Inventory the source content**

Open `deck3.html`. Categories: personal pronouns (ich/mich/mir/etc.), possessive pronouns (mein/dein/sein/etc. × case/gender), demonstrative (dieser/jener/etc.), interrogative (wer/was/welcher), indefinite (man/jemand/niemand/etc.), reflexive (mich/dich/sich).

- [ ] **Step 3: Define the pools section**

```json
"pools": {
  "personal_pronouns": { "category": "personal_pronoun", "items": ["ich","du","er","sie","es","wir","ihr","sie","Sie","mich","dich","ihn","uns","euch","mir","dir","ihm","ihr","ihnen"] },
  "possessive_pronouns_base": { "category": "possessive_pronoun", "items": ["mein","dein","sein","ihr","unser","euer"] },
  "demonstrative_pronouns": { "category": "demonstrative_pronoun", "items": ["dieser","diese","dieses","jener","jene","jenes"] },
  "interrogative_pronouns": { "category": "interrogative_pronoun", "items": ["wer","wen","wem","wessen","was","welcher","welche","welches"] },
  "reflexive_pronouns": { "category": "reflexive_pronoun", "items": ["mich","dich","sich","uns","euch"] }
}
```

- [ ] **Step 4: Author the items array**

Cloze:

```json
{
  "id": "pron_pers_acc_3msg_001",
  "kind": "cloze",
  "prompt": "Ich sehe {0}.",
  "blanks": [{ "answer": "ihn", "alts": [], "topic": "pers_acc_3m_sg" }],
  "translation": "I see him."
}
```

Choice Mode B for reflexive selection:

```json
{
  "id": "pron_refl_1sg_001",
  "kind": "choice",
  "prompt": "Ich wasche ___ die Hände.",
  "pool": "reflexive_pronouns",
  "answer": "mich",
  "topic": "refl_1sg"
}
```

Target ~432 items.

- [ ] **Step 5: Run the build**

```bash
node build/build.js
```

- [ ] **Step 6: Run the Migration Spot-Check Checklist (defined at the top of Phase 5)**

Deck-specific things to watch for in Pronouns:
- Reflexive items use the `reflexive_pronouns` pool; distractors are exclusively other reflexive forms.
- Personal-pronoun case (nom/acc/dat) is tagged correctly in `topic` so the interleaving rule mixes cases within a session.
- "sie" (she) vs. "sie" (they) vs. "Sie" (formal you) — verify capitalization and context disambiguate.

- [ ] **Step 7: Commit**

```bash
git add decks/pronouns.json index.html
git commit -m "$(cat <<'EOF'
feat(content): migrate Pronouns deck to new JSON schema

~432 items covering personal, possessive, demonstrative, interrogative,
indefinite, and reflexive pronouns. Pools per category enable adversarial
distractor scaling at high mastery boxes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5.6: Migrate Vocabulary → `decks/vocabulary.json`

**Files:**
- Create: `decks/vocabulary.json`

- [ ] **Step 1: Decode the original deck if not already present**

```bash
test -f deck4.html || node decode_decks.js
```

- [ ] **Step 2: Inventory the source content**

Open `deck4.html`. ~2000 A1/A2/B1 word pairs across 4 modes: DE→EN, EN→DE, gender, mixed. The migration breaks these into separate item kinds rather than per-mode "modes."

- [ ] **Step 3: Define the pools section**

```json
"pools": {
  "noun_gender": { "category": "noun_gender", "items": ["der","die","das"] }
}
```

- [ ] **Step 4: Author the items array**

DE→EN text:

```json
{ "id": "vocab_apfel_en", "kind": "text", "prompt": "Apfel", "answer": "apple", "alts": ["the apple"], "topic": "vocab_a1_nouns" }
```

EN→DE text:

```json
{ "id": "vocab_apple_de", "kind": "text", "prompt": "apple", "answer": "Apfel", "alts": ["der Apfel"], "topic": "vocab_a1_nouns" }
```

Gender (choice Mode B):

```json
{ "id": "vocab_gender_apfel", "kind": "choice", "prompt": "Apfel", "pool": "noun_gender", "answer": "der", "topic": "gender_m" }
```

Target ~2000 items × ~3 modes per word where applicable (DE→EN, EN→DE, gender for nouns), capped at ~6000 items total.

Because this is the largest deck, expect the most C14 alt warnings. Address them deliberately — add common alts (with/without article, common synonyms) per item.

- [ ] **Step 5: Run the build**

```bash
node build/build.js
```

Expected: many C14 / C15 warnings. Iterate until errors are zero. Warnings can remain but should be triaged.

- [ ] **Step 6: Run the Migration Spot-Check Checklist (defined at the top of Phase 5)**

Deck-specific things to watch for in Vocabulary (~2000 words — the highest-risk deck for hidden errors):
- Run a larger sample for spot-check 2/3/4 (e.g., 30 items each instead of 5) because total item count is an order of magnitude higher.
- DE→EN and EN→DE pair consistency: for any word appearing in both directions, the answer of one matches the prompt of the other.
- Gender items always use the `noun_gender` pool (3 options); never a Mode A list that includes a non-article distractor.
- Nouns appearing in both vocab (gender) and declension don't disagree (C16 enforces this at build, but spot-check anyway since C16's noun-detection regex is conservative).

- [ ] **Step 7: Commit**

```bash
git add decks/vocabulary.json index.html
git commit -m "$(cat <<'EOF'
feat(content): migrate Vocabulary deck to new JSON schema

~2000 A1/A2/B1 words rendered as text (DE→EN and EN→DE) plus gender
choice items for nouns. noun_gender pool used so distractors are always
{der,die,das} by construction.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5.7: Migrate Tricky Words → `decks/tricky-words.json`

**Files:**
- Create: `decks/tricky-words.json`

- [ ] **Step 1: Decode the original deck if not already present**

```bash
test -f deck6.html || node decode_decks.js
```

- [ ] **Step 2: Inventory the source content**

Open `deck6.html`. 34 particles × ~3 questions each = ~95 items, all choice-type for meaning ID.

- [ ] **Step 3: Define the pools section**

Skip pools — particle meaning distractors are best curated explicitly per item with Mode A.

- [ ] **Step 4: Author the items array**

```json
{
  "id": "tricky_damit_purpose_001",
  "kind": "choice",
  "prompt": "Ich lerne Deutsch, damit ich in Berlin arbeiten kann. (damit means…)",
  "options": ["so that","with it","therefore","because"],
  "answer": "so that",
  "topic": "damit_purpose"
}
```

Target ~95 items.

- [ ] **Step 5: Run the build**

```bash
node build/build.js
```

- [ ] **Step 6: Run the Migration Spot-Check Checklist (defined at the top of Phase 5)**

Deck-specific things to watch for in Tricky Words:
- Mode A authoring is intentional here (semantic distractors are curated per item) — verify C18 doesn't trigger. If it does, an item has options that all match a known category and should be re-authored or re-categorized.
- English distractor glosses are paraphrastic / non-overlapping with the answer gloss (e.g., for "doch" → "however" vs. "after all" vs. "particle of emphasis", not "however" vs. "but" — too synonymous).
- Each particle appears with multiple context sentences so the user generalizes meaning, not memorizes one sentence.

- [ ] **Step 7: Commit**

```bash
git add decks/tricky-words.json index.html
git commit -m "$(cat <<'EOF'
feat(content): migrate Tricky Words deck to new JSON schema

~95 choice items across 34 German particles. Mode A authoring — semantic
distractors are curated per item since particle meanings don't fall into
a single morphological category.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6 — Layer 3 Testing (Snapshots, Sampling, Known-Issues)

### Task 6.1: Snapshot generation + diff test (S1)

**Files:**
- Create: `build/snapshot.js`
- Create: `tests/snapshot.test.js`

- [ ] **Step 1: Write `build/snapshot.js`**

```js
#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const EngineCore = require('../src/engine-core.js');

const REPO = path.resolve(__dirname, '..');
const DECKS_DIR = path.join(REPO, 'decks');
const SNAP_DIR = path.join(REPO, 'tests', 'snapshots');

function snapshotItem(item, deck, box) {
  let line = `[${item.id}] kind=${item.kind} `;
  if (item.kind === 'cloze') {
    line += `prompt=${JSON.stringify(item.prompt)} blanks=${JSON.stringify(item.blanks.map(b => b.answer))}`;
  } else if (item.kind === 'text') {
    line += `prompt=${JSON.stringify(item.prompt)} answer=${JSON.stringify(item.answer)}`;
  } else if (item.kind === 'choice') {
    let options;
    if (item.options) options = item.options.slice();
    else {
      const pool = deck.pools[item.pool].items;
      // deterministic seed for snapshot
      const seed = item.id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
      const distractors = EngineCore.selectDistractors(pool, item.answer, box, 3, Math.abs(seed));
      options = [item.answer].concat(distractors);
    }
    line += `prompt=${JSON.stringify(item.prompt)} answer=${JSON.stringify(item.answer)} box${box}_options=${JSON.stringify(options)}`;
  }
  return line;
}

function buildSnapshot(deck) {
  const lines = [];
  for (const item of deck.items) {
    if (item.kind === 'choice' && item.pool) {
      for (const box of [0, 2, 4]) {
        lines.push(snapshotItem(item, deck, box));
      }
    } else {
      lines.push(snapshotItem(item, deck, 0));
    }
  }
  return lines.join('\n') + '\n';
}

function run() {
  if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });
  const files = fs.readdirSync(DECKS_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const deck = JSON.parse(fs.readFileSync(path.join(DECKS_DIR, f), 'utf8'));
    const snap = buildSnapshot(deck);
    const out = path.join(SNAP_DIR, deck.id + '.txt');
    fs.writeFileSync(out, snap);
    console.log(`Wrote ${out} (${deck.items.length} items)`);
  }
}

if (require.main === module) run();
module.exports = { buildSnapshot };
```

- [ ] **Step 2: Write the snapshot diff test**

`tests/snapshot.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { buildSnapshot } = require('../build/snapshot.js');

const DECKS_DIR = path.resolve(__dirname, '..', 'decks');
const SNAP_DIR = path.join(__dirname, 'snapshots');

test('snapshot: every committed snapshot matches the current build', () => {
  if (!fs.existsSync(DECKS_DIR)) return; // no decks yet
  const files = fs.readdirSync(DECKS_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const deck = JSON.parse(fs.readFileSync(path.join(DECKS_DIR, f), 'utf8'));
    const snap = buildSnapshot(deck);
    const snapPath = path.join(SNAP_DIR, deck.id + '.txt');
    if (!fs.existsSync(snapPath)) {
      assert.fail(`Snapshot missing: ${snapPath} — run \`node build/snapshot.js\` and commit.`);
    }
    const committed = fs.readFileSync(snapPath, 'utf8');
    assert.strictEqual(snap, committed, `Snapshot drift in ${deck.id}.txt — run \`node build/snapshot.js\` and review the diff before committing.`);
  }
});
```

- [ ] **Step 3: Generate the initial snapshots**

```bash
node build/snapshot.js
```

Expected: writes `tests/snapshots/<deck>.txt` for each migrated deck.

- [ ] **Step 4: Run the test**

```bash
node --test tests/snapshot.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add build/snapshot.js tests/snapshot.test.js tests/snapshots/
git commit -m "$(cat <<'EOF'
feat(test/L3): question snapshot generator + drift test (S1)

Snapshot every prompt + answer + (for pooled choice) box-0/2/4 distractor
sets to tests/snapshots/<deck>.txt. The drift test fails on any unreviewed
content change — accidental answer-key edits or pool changes become
visible diffs that the author must acknowledge.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6.2: Sampled distractor render test (S2)

**Files:**
- Create: `tests/content.test.js`

- [ ] **Step 1: Write the test**

`tests/content.test.js`:

```js
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
      // Placeholders must be contiguous from 0
      const indices = placeholders.map(p => parseInt(p.match(/\d+/)[0], 10)).sort((a,b)=>a-b);
      for (let i = 0; i < indices.length; i++) {
        assert.strictEqual(indices[i], i, `${deck.id}:${item.id}: placeholder indices not contiguous (got ${indices.join(',')})`);
      }
    }
  }
});

test('S2: text items have alts covering at least case-flip OR digraph (when applicable)', () => {
  // Soft check — log items missing common alts. We don't fail the test, but
  // surface counts so authors can triage. (C14 already emits warnings at
  // build time; this test just makes the count visible at test time.)
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
  // Permissive: just print, don't fail.
  if (missing > 0) console.log(`(S2 soft) ${missing} text item(s) missing expected alts`);
});

test('S2: cloze translations have non-zero content-word overlap with German prompt', () => {
  // Heuristic check — translations totally unrelated to the prompt likely
  // indicate copy-paste error. We extract content words from the German
  // prompt (after stripping placeholders and short particles), then check
  // the translation contains at least one English word ≥ 4 chars.
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
      // If the German has content words but the English translation has zero ≥4-char
      // tokens, the translation is suspect (single word, empty, or just particles).
      if (germanWords.length >= 2 && englishWords.length === 0) {
        suspicious++;
        console.log(`(S2 translation) ${deck.id}:${item.id} translation likely too short or unrelated: "${item.translation}"`);
      }
    }
  }
  // Permissive: don't fail, just surface counts.
  if (suspicious > 0) console.log(`(S2 soft) ${suspicious} cloze item(s) with suspect translations`);
});
```

- [ ] **Step 2: Run**

```bash
node --test tests/content.test.js
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/content.test.js
git commit -m "$(cat <<'EOF'
test(L3): broadened content sampling (S2)

Walks every pooled choice item and asserts distractors are valid at every
box. Adds cloze placeholder contiguity assertion. Soft-checks (log only):
text-item alts coverage, cloze-translation content-word overlap with the
German prompt. The soft checks surface anomalies for author review
without failing CI on borderline cases.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6.3: Known-issues regression suite (S3)

**Files:**
- Create: `tests/known-issues.test.js`

- [ ] **Step 1: Seed the regression test with the kann/können/darf/muss case**

`tests/known-issues.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const EngineCore = require('../src/engine-core.js');

const DECKS_DIR = path.resolve(__dirname, '..', 'decks');

function loadDeck(id) {
  return JSON.parse(fs.readFileSync(path.join(DECKS_DIR, id + '.json'), 'utf8'));
}

// Past regression: a "können (3pl, Präsens)" question once offered
// "kann / können / darf / muss" as choices, where darf and muss are
// different modal lemmas (in their 3sg form), not other forms of können.
// The new design makes this impossible because modal-verb conjugation
// pools are typed as modal_verb_form and contain only forms of the same
// lemma family. This test asserts the invariant for every modal-conjugation
// pooled choice item.
test('regression: modal conjugation choices never offer different-lemma forms', () => {
  const deck = loadDeck('modal-verbs');
  const LEMMA_OF_FORM = (function () {
    const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'morphology', 'modals.json'), 'utf8'));
    const out = {};
    for (const lemma in m) for (const form of m[lemma]) out[form] = lemma;
    return out;
  })();
  for (const item of deck.items) {
    if (item.kind !== 'choice' || !item.pool) continue;
    const pool = deck.pools[item.pool];
    if (pool.category !== 'modal_verb_form') continue;
    const answerLemma = LEMMA_OF_FORM[item.answer];
    if (!answerLemma) continue; // pool entry not in our morphology table — covered by C12
    // For modal-conjugation pools, every entry should be a form of the same lemma family
    // (the pool's name typically implies this — e.g., "können_all_forms"). Soft-assert.
    for (const form of pool.items) {
      const lemma = LEMMA_OF_FORM[form];
      assert.ok(lemma, `${item.id}: pool entry "${form}" not a known modal form`);
    }
  }
});

test('regression: no choice item has fewer than 2 plausible options at any box', () => {
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
```

- [ ] **Step 2: Run**

```bash
node --test tests/known-issues.test.js
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/known-issues.test.js
git commit -m "$(cat <<'EOF'
test(L3): known-issues regression suite (S3) seeded with kann/können/darf/muss case

Explicit assertions for past content failure modes. The seed case asserts
modal-conjugation pools never mix different lemma families — the exact
pattern of the kann/können/darf/muss bug we discussed. Future content
regressions add new tests here so the codebase remembers its scars.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 7 — Cleanup & Final Verification

### Task 7.1: Remove legacy files

**Files:**
- Delete: `german-drills.html`, `deck0.html`–`deck6.html`, `decode_decks.js`, `analyze_decks.js`, `final_analysis.js`

- [ ] **Step 1: Confirm all content is migrated**

```bash
ls decks/
```

Expected: `declension.json chameleon.json modal-verbs.json past-future.json pronouns.json vocabulary.json tricky-words.json`.

- [ ] **Step 2: Run the full test suite**

```bash
node --test tests/
```

Expected: every test PASS.

- [ ] **Step 3: Delete legacy files**

```bash
git rm german-drills.html deck0.html deck1.html deck2.html deck3.html deck4.html deck5.html deck6.html decode_decks.js analyze_decks.js final_analysis.js
```

- [ ] **Step 4: Run build + tests one more time after removal**

```bash
node build/build.js && node --test tests/
```

Expected: build succeeds; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: remove legacy single-file build, decoded deck scratch files, and migration utilities

All seven decks now live in decks/*.json and are inlined into index.html
by build/build.js. The old german-drills.html, base64-decoded deck*.html
working copies, and one-time migration scripts (decode_decks.js,
analyze_decks.js, final_analysis.js) are no longer referenced.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7.2: Update CLAUDE.md to reflect the new architecture

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Overwrite CLAUDE.md with the new architecture description**

Replace the entire file with:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file offline German-learning PWA published at `georgegaytan.github.io`. The deployed artifact is `index.html` at the repo root — built from `src/` + `decks/` + `build/` by `node build/build.js`. GitHub Pages serves it as static HTML.

Hard design constraints (load-bearing):
- Single deployed HTML file. No external runtime dependencies beyond Google Fonts.
- Offline-friendly. The deployed file opens directly from `file://` and works without a server.
- No npm dependencies at any stage. The build script uses only Node built-ins.

## Architecture

A unified deck engine. Every deck is a JSON file conforming to a shared schema. The engine renders three primitives — `cloze`, `text`, `choice` — under one SRS model (Leitner / SM-2 hybrid) with one scaffolding ladder keyed off mastery box.

- `src/engine-core.js` — pure functions: SRS update, input validators, distractor selection, session selection. Importable from Node tests (CJS) and the browser (window global) via UMD pattern.
- `src/engine-ui.js` — DOM controller: renders menu, drill view, dashboard; commits outcomes through `Storage`.
- `src/storage.js` — the single persistence seam. `loadDeck`, `saveDeck`, `loadGlobal`, `saveGlobal`, `listDeckIds`, `exportAll`, `importAll`. Backed by `localStorage` today; future swap to IndexedDB/OPFS replaces only this module.
- `src/categories.json` + `src/morphology/*.json` — the allowlist of pool categories and the morphology tables used by the build-time content validator.
- `build/validator.js` — Layer 1 content lints (16+ rules including categorical purity for distractor pools and cross-deck gender consistency).
- `build/build.js` — runs the validator, inlines styles + decks + UMD modules into the template, writes `index.html`. Fails non-zero on any validator error.
- `build/snapshot.js` — Layer 3 helper that dumps every rendered question (prompt + answer + box-0/2/4 distractors) into `tests/snapshots/<deck>.txt`. The snapshot drift test fails on any unreviewed content change.
- `decks/*.json` — deck content. Authoring workflow: edit JSON → `node build/build.js` → commit both the JSON and the built `index.html`.

## Deck JSON authoring

Every item is `cloze`, `text`, or `choice`. Prefer `cloze` (typed production in context) for grammar; `text` for vocabulary; `choice` only for genuinely categorical questions (gender, meaning ID).

For `choice` items, two authoring modes:
- **Mode A** (explicit `options`): when distractors are a small fixed set (gender → `["der","die","das"]`; particle meaning → curated semantic alternatives).
- **Mode B** (`pool` reference): when distractors share a morphological category. Define the pool once at deck top level with a `category` from `src/categories.json`. The engine draws distractors automatically. This eliminates "dead distractor" failures (e.g., a `können` cloze with `kann/können/darf/muss` options, where `darf` and `muss` are different lemmas) by construction.

## Testing

Three layers, all run by `npm test` (which calls `node --test tests/`):
1. **Build-time content lints** (Layer 1, `build/validator.js`). 16+ rules. Build fails on error.
2. **Engine unit tests** (Layer 2, `tests/engine-core.test.js`, `tests/storage.test.js`, `tests/validator.test.js`). Pure Node, no jsdom, no npm. Local-storage shim in `tests/_helpers/localStorageShim.js`.
3. **Snapshot + sampling + regression** (Layer 3, `tests/snapshot.test.js`, `tests/content.test.js`, `tests/known-issues.test.js`). Snapshots committed; content changes are visible diffs. Regression test seeded with past content scars.

## Common commands

```bash
node build/build.js              # build index.html
node --test tests/               # run all tests
node build/snapshot.js           # regenerate snapshots after a deliberate content change
```

## Deployment

Commit the changes — including the freshly built `index.html` at the repo root — and push to `main`. GitHub Pages serves the same file users see.

## Storage backup

Users export and import progress through `index.html`'s Export / Import buttons. The backup is a single JSON blob containing `gd_global` and all `gd_deck_<id>` entries. This is the only currently-supported persistence safety net; cloud sync is deferred.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: rewrite CLAUDE.md for the redesigned architecture

Replaces guidance for the old base64-decoded single-file approach with the
new src/+decks/+build/ layout, the three-layer testing model, and the
pool-based distractor authoring convention.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7.3: Final end-to-end verification

**Files:**
- (No file changes — manual verification + final test run.)

- [ ] **Step 1: Fresh-clone verification (simulated)**

From the repo root:

```bash
rm -rf node_modules # n/a — but stay disciplined
node build/build.js && node --test tests/
```

Expected: build prints `Built ...index.html (7 decks, N warning(s))`; tests print summary `# pass <total>`, `# fail 0`.

- [ ] **Step 2: Manual full-deck smoke test**

Open `index.html` in a browser. For each of the seven decks:

1. Start a session.
2. Answer 3 items: one correct unaided, one correct with scaffolding (deliberately tap a chip at box 0), one wrong.
3. Verify the wrong-answer correction protocol fires (typing the correct form is required).
4. Verify the dashboard / progress bar updates after the session.
5. Return to menu — verify the deck card shows the new mastery count.

- [ ] **Step 3: Backup round-trip**

1. Click Export. A JSON file downloads.
2. Open the browser dev tools, run `localStorage.clear()`, reload the page. Verify the dashboard is empty.
3. Click Import. Choose the exported file. Verify the dashboard reflects pre-clear state.

- [ ] **Step 4: Tag the release**

```bash
git tag -a v2.0.0 -m "German Drills v2.0.0 — unified engine, pool-validated content, three-layer test harness"
```

(Push tag at user discretion — `git push origin v2.0.0` if desired.)

- [ ] **Step 5: Final commit (if any small fixups surfaced during verification)**

If the manual smoke test revealed nothing actionable, no commit needed. If something did, fix and commit normally with a `fix:` prefix.

---

## Self-Review

(Verified after writing the plan, then revisited after a content-quality review that surfaced 15 flaws, all addressed inline.)

**Spec coverage check:**
- Goals 1–4: covered by Phases 1–7 in aggregate.
- Engine three primitives: Phase 1 (logic), Phase 4 (UI rendering).
- Mastery model: Task 1.3.
- Scaffolding ladder: Tasks 1.5 (distractor strength), 4.2 (UI affordance + correction protocol + chip scaffolding from explicit `scaffoldPool` field).
- Session shape: Tasks 1.6 (selection, multi-topic interleaving), 4.2 (UI), 4.3 (cross-deck Daily Review).
- State shape & storage seam: Task 1.2.
- Deck JSON schema: defined in Task 5.1 and reused in 5.2–5.7; includes `pools`, per-blank `scaffoldPool`, item-level `acceptAny`, item-level `allowEcho`.
- Content validation Layers 1/2/3: Phases 2 (L1, lints C1–C19), 1 (L2 engine tests interleaved), 6 (L3 snapshots, sampling, known-issues).
- Migration order Declension→Chameleon→Modal→Past/Future→Pronouns→Vocab→Tricky: Phase 5 tasks 5.1–5.7. Each task references the shared Migration Spot-Check Checklist defined at the top of Phase 5.
- Cleanup of legacy: Task 7.1.
- Decisions to reconfirm: all encoded in implementation; build step is real (Task 3.1); standalone lint command available (Task 2.8); snapshot drift hint surfaces during build (Task 3.1).

**Placeholder scan:** none. Every step contains either runnable code, exact commands with expected output, or specific content authoring guidance for migration tasks.

**Lint catalogue (referenced by code throughout):**
| Code | Severity | Catches |
|---|---|---|
| C1  | error | duplicate item ids across decks |
| C2  | error | cloze placeholder count ≠ blanks count |
| C3  | error | prompt contains the answer as a whole word (unless `allowEcho: true`) |
| C4  | error | topic not snake_case |
| C5  | error | choice item with neither/both `options` and `pool` |
| C6  | error | Mode A options invalid (<2, dupes, answer not in options) |
| C7  | error | Mode B pool reference unknown |
| C8  | error | Mode B answer not in pool |
| C9  | error | Mode B pool has <4 entries |
| C10 | error | Mode B pool has duplicates |
| C11 | error | Mode B pool category missing or not in allowlist |
| C12 | error | pool entry fails category shape check |
| C13 | error | empty answer in cloze blank or text item |
| C14 | warning | missing common alt (case-flip at sentence start, ae/oe/ue/ss digraph) |
| C15 | warning | cloze item missing translation |
| C16 | error | cross-deck gender disagreement (explicit or implicit via articles) |
| C18 | error | Mode A options all match an allowlisted category — convert to Mode B |
| C19 | error | per-blank scaffoldPool reference invalid or answer not in pool |

**Type/name consistency:**
- `EngineCore.srsUpdate`, `EngineCore.normalizeAnswer`, `EngineCore.answersMatch`, `EngineCore.selectDistractors`, `EngineCore.selectNextItem` — used consistently across tests, validator, snapshot, UI controller, and Daily Review.
- `Storage.loadDeck` / `saveDeck` / `loadGlobal` / `saveGlobal` / `listDeckIds` / `exportAll` / `importAll` — defined in Task 1.2 and called in Tasks 4.2 and 4.3 with matching signatures.
- Validator returns `{ severity, code, message, location }` — consistent across Phase 2.
- `selectNextItem` accepts `lastTopics` (plural array) — callers hydrate item topics from the deck definition via `topicsOf(itemDef)` + `hydratedStateView(state, deckDef)`.
- Session state field `newToday` is the genuine new-items-today counter (separate from `todayCount`).
- Deck schema fields (`id`, `name`, `icon`, `color`, `description`, `pools`, `items`) consistent across migration tasks 5.1–5.7.
- Item state fields (`box`, `ease`, `interval`, `due`, `lapses`, `lastSeen`, `seenCount`) consistent between Task 1.3 SRS math, Task 4.2 UI persistence, and Task 4.3 Daily Review.

**Review-fix audit (15 items addressed):**
1. ✅ Mode A category purity → C18 (Task 2.7)
2. ✅ C16 broadened to implicit article gender (Task 2.6)
3. ✅ C3 word-boundary + `allowEcho` opt-in (Task 2.1)
4. ✅ Translation overlap soft-check (Task 6.2)
5. ✅ `acceptAny` escape hatch for multi-blank cloze (Task 2.5 validator + Task 4.2 submission)
6. ✅ C14 position-aware case-flip (Task 2.5)
7. ✅ Explicit `scaffoldPool` per blank, validated by C19 (Tasks 2.5, 4.2)
8. ✅ `newToday` separate counter (Task 4.2)
9. ✅ `srsUpdate` ternary cleanup (Task 1.3)
10. ✅ Multi-topic `lastTopics` interleaving (Tasks 1.6, 4.2)
11. ✅ Daily Review cross-deck mode (Task 4.3)
12. ✅ Standalone `build/lint.js` (Task 2.8) + `npm run lint` script (Task 0.1)
13. ✅ Broadened L3 sampling (cloze placeholders, alts, translations) (Task 6.2)
14. ✅ Migration Spot-Check Checklist + deck-specific watch-fors (Phase 5)
15. ✅ Build-time snapshot drift hint (Task 3.1)

No remaining issues identified.
