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
