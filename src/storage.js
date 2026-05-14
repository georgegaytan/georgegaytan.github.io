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

  function loadGlobal() {
    const raw = ls().getItem(GLOBAL_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function saveGlobal(state) {
    ls().setItem(GLOBAL_KEY, JSON.stringify(state));
  }

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

  const Storage = { loadDeck, saveDeck, loadGlobal, saveGlobal, listDeckIds, exportAll, importAll };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
  } else {
    global.Storage = Storage;
  }
})(typeof window !== 'undefined' ? window : globalThis);
