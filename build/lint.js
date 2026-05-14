#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { validateDecks } = require('./validator.js');

const REPO = path.resolve(__dirname, '..');
const DECKS_DIR = path.join(REPO, 'decks');

function loadDecks() {
  if (!fs.existsSync(DECKS_DIR)) return [];
  return fs.readdirSync(DECKS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(DECKS_DIR, f), 'utf8')));
}

function main() {
  const decks = loadDecks();
  const errs = validateDecks(decks);
  const fatal = errs.filter(e => e.severity === 'error');
  const warns = errs.filter(e => e.severity === 'warning');
  for (const w of warns) console.warn(`[warn ${w.code}] ${w.location}: ${w.message}`);
  for (const e of fatal) console.error(`[error ${e.code}] ${e.location}: ${e.message}`);
  console.log(`\n${decks.length} deck(s), ${fatal.length} error(s), ${warns.length} warning(s).`);
  process.exit(fatal.length > 0 ? 1 : 0);
}

main();
