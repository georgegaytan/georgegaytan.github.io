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
