# Storage Redesign Design (Option D)

**Date:** 2026-05-14
**Status:** Approved (pending spec review)
**Scope:** Swap `localStorage` for IndexedDB inside `src/storage.js`; request persistent-storage permission so the browser doesn't evict the data.

## Goal

Eliminate the "opened the browser, progress was gone" failure mode that the user reported with the legacy app. localStorage on iOS Safari is evicted after ~7 days of site inactivity unless the origin has been granted persistent storage. The fix is two-part:

1. Move state to IndexedDB, which has much larger quota and (more importantly) can be marked persistent.
2. Call `navigator.storage.persist()` once we have data worth keeping, asking the browser to exempt the origin from eviction.

## Non-goals

- **No cloud sync, no multi-device sync.** The app stays single-file, GitHub-Pages-deployable, fully offline after first load.
- **No new backup automation** (out of scope; covered by the existing Export/Import).
- **No new UI features.** This is plumbing.
- **No public API change.** The 7 functions exposed by `src/storage.js` keep their names and synchronous shape so `engine-ui.js` is essentially untouched.

## Architecture

Three internal pieces inside `src/storage.js`:

1. **In-memory map** — a `Map<string, any>` holding all `gd_global` + `gd_deck_<id>` values. This is the runtime source of truth. Every read returns from here; every write updates this map first.

2. **IDB backend** — a small internal interface:
   ```js
   { hydrate(): Promise<Map>, put(key, value): Promise<void>, del(key): Promise<void> }
   ```
   `hydrate()` opens the DB, ensures the object store exists, and reads every key into a Map. `put`/`del` are fire-and-forget from the façade's perspective (return Promises for tests, but call sites don't await).

3. **`Storage.init()`** — async one-shot run at boot. Steps:
   1. Attempt to open IDB.
   2. If IDB has keys, hydrate the map from IDB.
   3. If IDB is empty but `localStorage` has legacy keys, copy them into IDB, hydrate the map, then clear those localStorage keys. Set a `migrated_to_idb` marker so this step never re-runs.
   4. If IDB fails to open, fall back to a `localStorage` backend for this session and set a `degraded` flag the UI can check.
   5. Once init resolves with a non-empty map, call `navigator.storage.persist()` (fire-and-forget).
   6. Resolve.

The 7 public sync functions (`loadDeck`, `saveDeck`, `loadGlobal`, `saveGlobal`, `listDeckIds`, `exportAll`, `importAll`) read from / write to the in-memory map, then fire `backend.put` or `backend.del` without awaiting.

## Migration (one-time, aggressive)

Triggered inside `Storage.init()` when IDB is freshly empty and the `migrated_to_idb` marker is absent:

1. Read every legacy key from localStorage matching `gd_global` or `gd_deck_*`.
2. For each, `JSON.parse` it (catch + log + skip on parse failure — one bad key shouldn't block migration of the rest).
3. Write each to IDB and add it to the in-memory map.
4. Write `migrated_to_idb: { at: ISO_TIMESTAMP, count: N }` to IDB.
5. Remove the legacy keys from localStorage.
6. Continue boot.

If migration fails mid-way (rare), the marker isn't written; on next boot, IDB may contain a partial copy plus localStorage still has the originals — the migration logic just resumes / re-attempts.

The Export/Import JSON format (`{ version, exported, data: { gd_global, gd_deck_<id> } }`) is unchanged, so existing backup files round-trip.

## Persistent storage permission

After `Storage.init()` resolves with at least one populated key:

```js
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(granted => {
    console.log('Storage persisted:', granted);
  }).catch(() => {});
}
```

No UI prompt. The browser decides based on its own heuristics (bookmarked, PWA-installed, notification permission, etc.). If denied today, the next time the user keeps coming back to the site, the browser may re-grant. We don't show a banner — out of scope per the chosen tier of D.

If the browser doesn't expose `navigator.storage.persist` at all (very old / niche), the call is skipped silently.

## Error handling

| Failure | Behavior |
|---|---|
| IDB fails to open at boot | Fall back to `localStorage` backend for this session. Show a dismissible banner on the menu: "Your progress may not be saved across sessions in this browser." Dismissal is session-only (clicking × hides it for this tab; reopening the site re-shows if IDB still fails). |
| IDB `put` fails after open (quota, transaction abort) | Retry once after 500ms. If still failing, `console.warn` and continue. In-memory still holds the value; reload may lose it. Don't surface mid-drill. |
| IDB read returns malformed JSON for one key | Catch, log, treat that key as missing. Don't abort hydrate. |
| Migration: one legacy key is malformed | Catch, log, skip. Continue migrating other keys. Migration marker still gets written. |
| `navigator.storage.persist()` unavailable | Feature-detect; no-op. |

All log lines use a consistent prefix (`[gd-storage]`) so a developer inspecting the console can filter for them.

## Testing

No npm dependencies — sticking to Node's built-in `node:test` and a hand-rolled mock.

- **Unit tests** (`tests/storage.test.js` — updated): test the façade against a Map-based mock backend. The IDB driver itself is not exercised in Node; only the in-memory + migration + persist logic.
  - Update the 8 existing tests to:
    - Call a new `Storage._reset()` between tests (clears the in-memory map and any internal markers) instead of `delete require.cache[...]`.
    - Inject a mock backend via a new `Storage._setBackend(mock)` test hook.
  - Add new tests:
    - `init()` hydrates the map from a non-empty backend.
    - `init()` migrates from localStorage when IDB-backed but empty.
    - Migration clears localStorage after copying.
    - Migration is idempotent (second `init()` doesn't re-migrate).
    - `saveDeck` fires `backend.put`.
    - `importAll` writes through every restored key.
    - Malformed legacy localStorage value is skipped, not fatal.
- **Layer 3 (existing)**: snapshot + sampling + known-issues tests are content-only and unaffected.
- **Manual browser smoke test**: build → open `index.html` → start a session → close tab → reopen → confirm progress survives. Then: clear IDB in DevTools, refresh, confirm a clean-slate menu (no crash).

## Call-site impact

Exactly one call site changes (`src/engine-ui.js` boot):

```js
window.addEventListener('DOMContentLoaded', () => {
  Storage.init()
    .catch(err => console.warn('[gd-storage] init degraded:', err))
    .finally(renderMenu);
});
```

`Storage.init()` is idempotent: a module-level `initPromise` is set on first call and returned thereafter, so concurrent or repeated calls share one boot. The `popstate` listener and the rest of engine-ui keep their existing sync code paths.

## File changes

- `src/storage.js` — rewritten to the new architecture. UMD export shape unchanged.
- `src/engine-ui.js` — boot block wraps `renderMenu` in `Storage.init().then(...)`.
- `tests/storage.test.js` — updated for `_reset` / `_setBackend` hooks. New tests for init / migration.
- `index.html` (built artifact) — rebuilt automatically by `node build/build.js`.

No changes to:
- `src/engine-core.js`
- `build/validator.js`, `build/build.js`, `build/snapshot.js`, `build/lint.js`
- Any `decks/*.json`
- Layer 3 tests

## Risks / open questions

- **Persistent storage permission denial cascade**: if the browser denies `persist()` today, we don't retry on subsequent sessions. Calling it every session is harmless and may eventually be granted as the user's engagement signals grow. **Decision: call once per session after init.**
- **IDB-not-supported fallback**: localStorage backend is the same fragility we have today. Acceptable per the chosen scope tier (B, not C).
- **No automatic backup nudges in this scope.** If `persist()` is denied AND localStorage gets evicted, data is gone. The Export/Import button is the user's only safety net. If this turns out to be insufficient in practice, scope C ("backup nudges") becomes the natural follow-up.

## Rollback

If the new storage module ships and breaks something subtle, reverting `src/storage.js` to its previous git blob and rebuilding is a clean, low-blast-radius rollback. Migrated data stays in IDB (orphaned but not destructive); users with new-only data lose progress in that scenario, which is the standard price of a backend revert.
