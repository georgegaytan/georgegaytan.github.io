const test = require('node:test');
const assert = require('node:assert');
const EngineCore = require('../src/engine-core.js');

test('engine-core: module exports an object', () => {
  assert.strictEqual(typeof EngineCore, 'object');
  assert.notStrictEqual(EngineCore, null);
});
