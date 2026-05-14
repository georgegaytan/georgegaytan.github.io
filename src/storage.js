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
          console.warn('[gd-storage] fallback hydrate failed too - starting empty:', err2);
          storageMap = new Map();
        }
      }
      if (!storageMap.has(MIGRATED_MARKER)) {
        await migrateLegacyIntoBackend();
      }
    })();
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
