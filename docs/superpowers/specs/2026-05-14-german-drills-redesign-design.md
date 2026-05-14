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

Two authoring modes, both supported:

**Mode A — explicit `options` list (small fixed sets):**

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

**Mode B — `pool` reference (typed distractor pool; the engine draws distractors at render time):**

```json
{
  "id": "modal_können_3pl_001",
  "kind": "choice",
  "prompt": "Sie ___ Deutsch sprechen.",
  "answer": "können",
  "pool": "können_conjugation",
  "topic": "modal_können_konj"
}
```

The deck declares the pool once at the top level:

```json
"pools": {
  "können_conjugation": {
    "category": "modal_verb_form",
    "items": ["kann", "kannst", "können", "könnt", "konnte", "konnten", "könnte", "könnten"]
  }
}
```

**Why two modes:** Mode A is right when options are intrinsically fixed (gender is always `der/die/das`; particle-meaning ID has a hand-picked semantic distractor set). Mode B is right whenever the distractors share a morphological category — conjugations of one verb, articles in one case, partizip-II forms. Mode B is the load-bearing one for grammar drills because **it makes "dead distractor" mistakes structurally impossible**: distractors come from the same category as the answer, by construction. The historical failure mode (a `können` question with `kann/können/darf/muss` where `darf` and `muss` are *different lemmas in base form*) cannot occur — `darf` and `muss` live in a different pool with a different `category`.

**Distractor strength varies by box** (see Scaffolding). The engine ranks pool entries by similarity to the answer (e.g., shared prefix, shared inflection class) and picks easy-to-hard accordingly. Implementation: the engine sorts pool entries by Levenshtein distance to the answer, picks farther-out distractors at low box, closer-in (adversarial) ones at high box.

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
  "pools": {
    "definite_articles_all_cases": {
      "category": "definite_article",
      "items": ["der", "die", "das", "den", "dem", "des"]
    },
    "adjective_endings": {
      "category": "adj_ending",
      "items": ["", "e", "en", "es", "er", "em"]
    }
  },
  "items": [
    /* array of cloze / text / choice items as shown above */
  ]
}
```

**`pools` is optional** (only needed if any `choice` item uses Mode B). Pools are deck-local; if cross-deck pools become useful later, a `pools/shared.json` file can be added — out of scope for v1.

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

## Content Validation & Testing

This redesign treats **content correctness** as a first-class concern — historically the most painful regressions were not engine bugs but language bugs: dead distractors, wrong genders, missing accepted alternates, options that didn't share a morphological category. The testing plan has three layers, in priority order.

### Layer 1 — Build-time content validators (the load-bearing layer)

`build.js` runs every deck JSON through a validator before producing `index.html`. **The build fails — non-zero exit — on any violation.** No way to ship a deck that fails validation. This is the layer that prevents the "kann / können / darf / muss" class of mistake.

**Per-item structural lints:**

- **C1.** Every item has a unique `id` across all decks (catches accidental duplicates from copy-paste authoring).
- **C2.** Every `cloze` item's `prompt` placeholder count matches `blanks.length` exactly. `{0}`, `{1}`, ... must be present and contiguous.
- **C3.** No item's `prompt` text contains the literal `answer` string (sanity check — catches typos where the answer leaks into the prompt).
- **C4.** `topic` is a non-empty snake_case string.

**`choice` validators (the regression-prevention core):**

- **C5.** Every `choice` item has either `options` (Mode A) **xor** `pool` (Mode B). Not both, not neither.
- **C6.** Mode A: `options` ≥ 2, all unique, `answer` is in `options`.
- **C7.** Mode B: `pool` exists in the deck's `pools` map.
- **C8.** Mode B: `answer` is in `pool.items`.
- **C9.** Mode B: `pool.items.length` ≥ 4 (so the engine can draw 3 distractors after excluding the answer).
- **C10.** Mode B: all entries in a pool are unique.
- **C11.** Mode B: every pool has a non-empty `category` string. Categories are linted against an allowlist in `src/categories.json` (a small enum: `definite_article`, `indefinite_article`, `modal_verb_form`, `modal_lemma`, `partizip_2`, `aux_verb`, `pronoun_*`, `adj_ending`, `noun_gender`, `particle_meaning`, etc.). Adding a new category requires editing that file — forces deliberateness.
- **C12.** Mode B: **categorical purity** — for every pool, every entry passes a category-specific shape check. Examples:
  - `definite_article`: must be one of `{der, die, das, den, dem, des}`.
  - `modal_verb_form`: must be a conjugated form (not infinitive) of one of `{können, müssen, dürfen, sollen, wollen, mögen, möchten}` — checked against a small morphology table shipped at `src/morphology/modals.json`.
  - `noun_gender`: must be `der` / `die` / `das`.
  - `adj_ending`: must be one of `{"", e, en, es, er, em}`.
  - Categories without a morphology check (e.g., `particle_meaning`) just enforce non-empty strings; semantic correctness falls to Layer 3.

**`cloze` and `text` validators:**

- **C13.** For each blank, the `answer` is non-empty.
- **C14.** Auto-derived `alts` are added if missing — case-flipped variant, ae/oe/ue ↔ ä/ö/ü variant. Validator warns if author-provided `alts` are missing variants that would otherwise be unfair to typo-prone users.
- **C15.** `cloze` items with `translation` field: translation is a non-empty string; warn if no overlap of content words with the German `prompt` (loose heuristic against copy-paste mismatches).

**Cross-deck consistency lints:**

- **C16.** Gender consistency: any noun whose gender is asserted across multiple decks (vocabulary gender deck, declension noun phrases, etc.) must agree. Build collects all `(lemma, gender)` claims and fails on disagreement.
- **C17.** Translation consistency (warning only): if `Apfel ↔ apple` appears in DE→EN context, flag if `apple ↔ Apfel` is missing or different in EN→DE. Translations aren't always bijective, so this is a warning, not an error.

### Layer 2 — Engine unit tests (`tests/engine.test.js`)

Headless Node tests using built-in `node:test`. No npm install.

- **E1.** SRS state transitions match the spec table exactly (correct / correct-with-scaffold / wrong; ease floor 1.3; box reset to 1 on lapse; interval rounding).
- **E2.** Input validators behave per spec: case-insensitive except for nouns and sentence-start, umlaut tolerance both directions, whitespace handling.
- **E3.** Distractor selection from a `pool` always excludes the answer, produces N unique entries, and respects the box → adversarial-strength mapping (low box → high Levenshtein distance from answer; high box → low distance).
- **E4.** Distractor selection is deterministic given a seed (so tests are reproducible and we can snapshot what users would see).
- **E5.** Session selection respects priority order (overdue → low-box-not-seen-today → new), respects caps (20 per session, 5 new), and never repeats a topic back-to-back.
- **E6.** Storage round-trip (`exportAll` → wipe → `importAll`) reconstructs state byte-for-byte.
- **E7.** Scaffolding ladder produces the expected affordances at each box.

### Layer 3 — Content snapshots & sampling tests

Catches the failures Layer 1 can't reach — semantic / pedagogical wrongness that requires human review of generated output.

- **S1.** **Question snapshot.** After build, dump every rendered question (prompt + correct answer + sample distractors at box 0, 2, and 4) into `tests/snapshots/<deck>.txt`. The snapshot file is committed. **Any change to a snapshot in CI / pre-commit forces the author to acknowledge it** — accidental content drift becomes a visible diff. This is how we catch "I changed the answer key but forgot to update the alts."
- **S2.** **Sampled distractor render.** For each `choice` item using a `pool`, the test harness asks the engine to produce distractors at each scaffolding level and verifies: distractors ≠ answer, no duplicates, all in the declared pool, all pass the category check. Run across all items, not a sample, since this is cheap.
- **S3.** **Hand-curated regression suite.** A small `tests/known-issues.test.js` file holds explicit assertions for past failure modes (e.g., "the `können` 3pl question must never offer `darf` or `muss` as a distractor — they're different lemmas, not other forms of `können`"). Every time we discover a content bug in the wild, we add a test here. The list grows over time; this is how the codebase remembers its specific scars.

### What this gives us

- **Build fails on whole categories of content bug** before they ever ship (Layer 1).
- **Engine behavior is tested headlessly and deterministically** (Layer 2).
- **Generated content is visible in version control** so reviews can catch what tests can't (Layer 3).
- **Snapshot diffs force conscious acknowledgement** of every content change.

### Manual verification (still required, smaller scope than today)

Manual browser testing remains for things automated tests can't reach: visual layout, animation, mobile touch behavior, real input-method quirks. The manual checklist gets smaller because Layers 1–3 cover what's automatable.

Per-deck manual smoke test after migration:
1. Open `index.html`, start the deck, run 5 items.
2. Get one right unaided, one wrong, one with scaffolding — verify SRS updates as expected on the dashboard.
3. Verify the wrong-answer-correction protocol fires.
4. Export progress, clear `localStorage`, import — verify state restored.

## What This Replaces / Cleans Up Today

- Per-deck `getProgress()` switch (7 branches → 1 function).
- Per-deck `storeKey` strings → uniform `gd_deck_<id>`.
- `KNOWN_KEYS` allowlist (drift-prone) → enumeration from `listDeckIds()`.
- Base64 encode/decode/splice workflow → plain JSON + `node build.js`.
- Inconsistent hint mechanics across decks → one scaffolding ladder.
- Inconsistent SRS schemes → one SM-2 hybrid.
- Per-deck "hard mode" toggles → built into the scaffolding ladder (box 3+ = "hard mode" effectively).
- **Hand-rolled distractors per item** → typed pools with build-time category validation. Eliminates the "dead distractor" failure class.

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
