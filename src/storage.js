(function (global) {
  const DECK_KEY_PREFIX = 'gd_deck_';
  const GLOBAL_KEY = 'gd_global';
  const MIGRATED_MARKER = 'migrated_to_idb';

  let storageMap = new Map();
  let backend = null;
  let initPromise = null;
  let degraded = false;

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

  function init() {
    if (initPromise) return initPromise;
    initPromise = Promise.resolve();
    return initPromise;
  }

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
