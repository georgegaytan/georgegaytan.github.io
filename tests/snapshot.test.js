const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { buildSnapshot } = require('../build/snapshot.js');

const DECKS_DIR = path.resolve(__dirname, '..', 'decks');
const SNAP_DIR = path.join(__dirname, 'snapshots');

test('snapshot: every committed snapshot matches the current build', () => {
  if (!fs.existsSync(DECKS_DIR)) return;
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
