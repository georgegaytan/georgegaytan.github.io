# German Drills Redesign — Design Spec

**Date:** 2026-05-14
**Status:** Draft for review

## Goals

1. **Coordinate decks** — one consistent set of design and functional choices across every deck (today there are seven different mastery schemes, seven different localStorage shapes, and seven different sets of CSS / interaction patterns).
2. **Apply scientifically supported language-learning patterns** — production over recognition, contextualized cloze, expanding spaced intervals, interleaving, forced retrieval and typed correction after errors.
3. **Preserve hard constraints** — lightweight, offline-friendly, runs in a browser from a single deployed file, saves user progress locally, no runtime external dependencies beyond Google Fonts.
4. **Leave the door open for sturdier storage** (the deferred "D" work — swap localStorage for IndexedDB / OPFS / sync without touching the engine).

## Non-goals

- Cloud sync, accounts, or any server component.
- A new visual design system. Visuals are unified (shared CSS, one palette per deck for accent only) but no overhaul.
- Audio, pronunciation drills, or speech input.
- Expanding language content beyond what exists today. This redesign migrates existing content; new content is a follow-up.
- Preserving existing user progress. The user has confirmed the app is not in active use, so the redesign starts users from zero.

## Architecture Overview

**Deployed artifact:** a single `index.html` (offline-capable, file:// works, GitHub Pages hosts the same file).

**Source layout:**

```
src/
  index.html         host shell (menu, dashboard, drill view, export/import UI)
  engine.js          renderer + session controller + SRS math
  storage.js         single storage seam (localStorage today, swappable later)
  styles.css         shared CSS, used by every deck
decks/
  declension.json
  modal-verbs.json
  past-future.json
  pronouns.json
  vocabulary.json
  chameleon.json
  tricky-words.json
build.js             50-line Node script (no npm deps): inlines decks + JS + CSS into index.html
tests/
  engine.test.js     headless unit tests for SRS math, validators, session selection
index.html           built artifact (committed; what GitHub Pages serves)
```

**Build:** `node build.js` reads `src/` + `decks/`, inlines everything as JS/JSON literals (not base64) into a template, writes `index.html`. Runs in a fraction of a second on typical hardware. No npm, no bundler, no transpiler. The built `index.html` is committed to the repo — that's the file GitHub Pages serves and the file users can open directly from disk.

**Authoring workflow:** edit a JSON deck file → run `node build.js` → commit both the JSON and the built `index.html`. Replaces today's decode-base64 / edit / re-encode / splice dance.

## Engine: Three Interaction Primitives

Every question in every deck is one of three kinds. The engine renders all three.

### `cloze`

A sentence (or fragment) with one or more blanks. User types each blank.

```json
{
  "id": "decl_nom_m_def_001",
  "kind": "cloze",
  "prompt": "{0} Mann liest {1} Zeitung.",
  "blanks": [
    { "answer": "Der", "alts": ["der"], "topic": "nom_m_def" },
    { "answer": "die", "alts": ["Die"], "topic": "acc_f_def" }
  ],
  "translation": "The man reads the newspaper."
}
```

- `{N}` placeholders in `prompt` map positionally to `blanks[N]`.
- Each blank has its own `topic` tag for interleaving / weak-spot stats. SRS is still per-item (the whole question), not per-blank, for v1 simplicity.
- `translation` is optional, shown after answer reveal.

### `text`

A freestanding prompt. User types the answer.

```json
{
  "id": "vocab_apple_de",
  "kind": "text",
  "prompt": "apple",
  "answer": "Apfel",
  "alts": ["der Apfel"],
  "topic": "vocab_a1"
}
```

### `choice`

Used **only** where production is not well-defined: gender ID, meaning identification for ambiguous particles, comprehension checks. **Not the default** — authors must justify a `choice` over `cloze` / `text`.

```json
{
  "id": "vocab_gender_apfel",
  "kind": "choice",
  "prompt": "Apfel",
  "options": ["der", "die", "das"],
  "answer": "der",
  "topic": "gender_m"
}
```

Distractor strength varies by box (see Scaffolding).

### Input validation (shared across `cloze` and `text`)

- Case-insensitive **except** for nouns and sentence-start positions, where capitalization is required.
- Umlaut tolerance: `ae/oe/ue/ss` accepted as `ä/ö/ü/ß` and vice versa.
- Whitespace trimmed; internal whitespace collapsed.
- `alts` list explicitly broadens what's accepted (alternate forms, articles included/omitted, etc.).

## Mastery Model: Leitner / SM-2 Hybrid

One scheme, used by every deck. Per-item state:

```json
{
  "box": 2,
  "ease": 2.4,
  "interval": 3,
  "due": "2026-05-17",
  "lapses": 1,
  "lastSeen": "2026-05-14T10:23:00Z",
  "seenCount": 4
}
```

**Defaults for new items:** `box: 0, ease: 2.5, interval: 0, lapses: 0`. Intervals are rounded to whole days.

**Update rule on review:**

| Outcome | Box change | Ease change | New interval |
|---|---|---|---|
| Correct, no scaffolding used | +1 | unchanged | `max(1, interval * ease)` days |
| Correct, scaffolding used | unchanged | unchanged | `max(1, interval * ease * 0.5)` days |
| Wrong | reset to 1 | `−0.15` (floor 1.3) | 1 day |

**Mastered = `box ≥ 4`** (interval ≈ 21+ days). Dashboard counts this as the mastery threshold.

**Why this shape:** Production-rated SM-2 (Anki-style) is the strongest evidence-backed scheme available in <50 lines of JS; FSRS is better but needs per-user training data. Removing self-rating (no "again/hard/good/easy" UI) keeps the friction low — the engine infers difficulty from "correct?" and "needed scaffolding?".

## Scaffolding Ladder (Hint Behavior)

A single rule applied across all three primitives, keyed off the item's current `box`:

| Box | `cloze` / `text` | `choice` |
|---|---|---|
| 0–1 (new / freshly lapsed) | Chip pool visible under each blank; user can tap a chip OR type | Easy distractors (clearly wrong forms) |
| 2 | Chips hidden; first letter and total length of each blank shown | Medium distractors |
| 3+ | Bare typed production; no hints | Adversarial distractors (commonly confused forms — e.g., `den` vs `dem`, `möchte` vs `muss`) |

**Wrong-answer protocol (every box, every primitive):** show the correct answer, highlight the user's error, then **require the user to type the correct form** before advancing. (For `choice`, "type" means tap the correct option.) This is the single highest-leverage retention intervention in the SLA literature — forced production after error.

Scaffolding state ("did the user need scaffolding this attempt?") is what feeds the mastery model's "Correct, scaffolding used" row above.

## Session Shape

**Default session = per-deck.** A user taps a deck and starts a session for that deck. The session ends after **20 items** OR when the due queue is exhausted, whichever comes first.

**Selection priority** (engine picks next item):

1. Overdue review items (`due <= today`), oldest-first.
2. Low-box items (`box < 4`) not yet seen today.
3. Net-new items (`box === 0`), capped at **5 per session** to avoid overwhelming.

**Interleaving:** within a session, the engine never shows two items with the same `topic` tag back-to-back. (E.g., declension session won't drill five nominative-masculine items in a row.)

**Cross-deck "Daily Review" mode:** a separate menu entry that pulls *only* overdue items from every deck, capped at 30 items, fully interleaved. Part of v1 — small to build on top of the same selection logic and directly serves the consistency goal (one place to do your daily practice across decks).

**Session-complete screen** shows: items seen, % correct on first try, items advanced a box, items lapsed, current streak.

## State Shape & Storage Seam

### Per-deck state

Key: `gd_deck_<id>` (e.g., `gd_deck_declension`).

```json
{
  "deckId": "declension",
  "version": 1,
  "items": {
    "decl_nom_m_def_001": { "box": 2, "ease": 2.4, "interval": 3, "due": "2026-05-17", "lapses": 1, "lastSeen": "...", "seenCount": 4 }
  },
  "sessionMeta": { "todayCount": 12, "todayDate": "2026-05-14", "firstTryCorrectToday": 9 }
}
```

### Global state

Key: `gd_global`.

```json
{
  "version": 1,
  "streak": { "current": 3, "lastDay": "2026-05-14" },
  "totalSessions": 47,
  "settings": { "darkMode": true, "sound": false }
}
```

### Storage module API

`src/storage.js` exports exactly these functions. Everything else in the engine goes through this module — no direct `localStorage` calls anywhere else.

```js
loadDeck(deckId)           // → state object or null
saveDeck(deckId, state)    // → void
loadGlobal()               // → global object
saveGlobal(state)          // → void
exportAll()                // → backup JSON { version, exported, data: { gd_global, gd_deck_*: {...} } }
importAll(backup)          // → boolean (success)
listDeckIds()              // → string[] of decks that have any state
```

When the future "D" work happens, swap `storage.js`'s implementation (IndexedDB, OPFS, sync). No other file in the codebase needs to change.

### Dashboard `getProgress`

Today's per-deck switch collapses to one function:

```js
function getProgress(deckId) {
  const state = Storage.loadDeck(deckId);
  if (!state || !state.items) return null;
  const ids = Object.keys(state.items);
  const mastered = ids.filter(id => state.items[id].box >= 4).length;
  return { pct: Math.round(mastered / ids.length * 100), label: `${mastered}/${ids.length} mastered` };
}
```

## Deck JSON Schema (Authoritative)

```json
{
  "id": "declension",
  "name": "Declension",
  "icon": "📐",
  "color": "#7f5af0",
  "description": "Articles, adjective endings, and case in context.",
  "items": [
    /* array of cloze / text / choice items as shown above */
  ]
}
```

**Item ID convention:** `<deck>_<topic>_<seq>`, e.g., `decl_nom_m_def_001`. Stable across rebuilds — used as the localStorage key for per-item state.

**Topic tags:** free-form strings, used for interleaving and (future) weak-spot reporting. Convention: lowercase, snake_case, hierarchical (e.g., `nom_m_def`, `nom_f_def`, `acc_pl_indef`).

## Migration Plan

1. Decode every existing deck once with the current `decode_decks.js` (keep as a one-time tool; remove after migration).
2. For each deck, extract questions out of the decoded HTML/JS into the new JSON schema. This is mostly a manual / scripted text-extraction task; the question content already exists.
3. Re-author into JSON where the new model needs different prompts. Specifically: multiple-choice items that the new model wants as `cloze` need re-prompted so the expected answer is unique. (E.g., "ich ___ Deutsch lernen" with four modal options becomes "Translate: 'I want to learn German'" → typed answer "ich möchte Deutsch lernen" or just the cloze "ich {möchte} Deutsch lernen.") Author judgment call per item.
4. Migration order — hardest first, to validate the engine before momentum builds:
   1. **Declension** (multi-blank cloze across many topics, highest complexity)
   2. **Chameleon Words** (multi-blank cloze, sentence-level)
   3. **Modal Verbs**
   4. **Past / Future**
   5. **Pronouns**
   6. **Vocabulary** (largest item count, simplest shape)
   7. **Tricky Words** (`choice`-heavy)
5. Throughout migration, the old `german-drills.html` stays in the repo as a content reference. Delete it (and the `deck*.html` scratch files, `decode_decks.js`, `analyze_decks.js`, `final_analysis.js`) once migration is complete.
6. **No user-progress migration.** Users start at box 0 for every item on the new engine.

## Testing Strategy

There's no test framework today; we add a minimal one.

- **`tests/engine.test.js`** — headless Node tests (built-in `node:test`, no npm needed). Cover:
  - SRS update rule (correct / correct-with-scaffold / wrong transitions; ease floor; box-1 reset on lapse).
  - Input validators (case, umlaut tolerance, whitespace).
  - Session selection (priority order, new-item cap, no-back-to-back-topic rule).
  - Storage round-trip (export → wipe → import → state matches).
- **Manual browser verification** remains primary for the UI: open `index.html`, run a full session per deck, verify dashboard + export/import.
- Build script does a sanity pass: every deck JSON validates against the schema, every `cloze` has matching `{N}` placeholders and `blanks` entries, no duplicate item IDs.

## What This Replaces / Cleans Up Today

- Per-deck `getProgress()` switch (7 branches → 1 function).
- Per-deck `storeKey` strings → uniform `gd_deck_<id>`.
- `KNOWN_KEYS` allowlist (drift-prone) → enumeration from `listDeckIds()`.
- Base64 encode/decode/splice workflow → plain JSON + `node build.js`.
- Inconsistent hint mechanics across decks → one scaffolding ladder.
- Inconsistent SRS schemes → one SM-2 hybrid.
- Per-deck "hard mode" toggles → built into the scaffolding ladder (box 3+ = "hard mode" effectively).

## Decisions to Reconfirm

These were decided by recommendation during brainstorming (auto-mode). Flagging them so the user can revisit any that don't match intent:

1. **Build step accepted?** A 50-line `node build.js` is added as a dev-time tool. Deployed artifact is still one HTML file.
2. **No user-progress migration?** Confirmed during brainstorming — app is not in active use.
3. **Per-item SRS (not per-blank).** Multi-blank cloze items are scored as one unit for v1; per-blank SRS could be a v2 refinement.
4. **20 items / session cap, 5 new items / session cap.** Numbers chosen for mobile / spaced-practice fit; tunable.
5. **`choice` reserved for categorical questions only.** Gender, meaning ID, comprehension. The default for grammar drills is `cloze`.

## Out of Scope (Explicitly Deferred)

- Sturdier storage backend (the "D" work). Storage seam is built so this is a single-module swap later.
- Audio, pronunciation, speech-to-text.
- Cross-device sync.
- New question content beyond migrating what exists.
- A formal visual design system / theme overhaul.
- PWA install / service worker (the app is already offline-capable via single-file HTML).
