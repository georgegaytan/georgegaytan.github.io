#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { validateDecks } = require('./validator.js');

const REPO = path.resolve(__dirname, '..');
const SRC = path.join(REPO, 'src');
const DECKS_DIR = path.join(REPO, 'decks');
const OUT = path.join(REPO, 'index.html');

function read(p) { return fs.readFileSync(p, 'utf8'); }

function loadDecks() {
  if (!fs.existsSync(DECKS_DIR)) return [];
  return fs.readdirSync(DECKS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(read(path.join(DECKS_DIR, f))));
}

function readIfExists(p) {
  return fs.existsSync(p) ? read(p) : '';
}

function build() {
  const decks = loadDecks();
  const errors = validateDecks(decks);
  const fatal = errors.filter(e => e.severity === 'error');
  const warns = errors.filter(e => e.severity === 'warning');

  for (const w of warns) {
    console.warn(`[warn ${w.code}] ${w.location}: ${w.message}`);
  }
  if (fatal.length > 0) {
    for (const e of fatal) {
      console.error(`[error ${e.code}] ${e.location}: ${e.message}`);
    }
    console.error(`\nBuild failed: ${fatal.length} error(s).`);
    process.exit(1);
  }

  const template = read(path.join(SRC, 'index.html.template'));
  const styles = readIfExists(path.join(SRC, 'styles.css'));
  const storage = readIfExists(path.join(SRC, 'storage.js'));
  const engineCore = readIfExists(path.join(SRC, 'engine-core.js'));
  const engineUi = readIfExists(path.join(SRC, 'engine-ui.js'));

  const decksJs = `window.DECKS = ${JSON.stringify(decks)};`;

  const html = template
    .replace('/*__STYLES__*/', () => styles)
    .replace('/*__DECKS__*/', () => decksJs)
    .replace('/*__STORAGE__*/', () => storage)
    .replace('/*__ENGINE_CORE__*/', () => engineCore)
    .replace('/*__ENGINE_UI__*/', () => engineUi);

  fs.writeFileSync(OUT, html);
  console.log(`Built ${OUT} (${decks.length} deck${decks.length === 1 ? '' : 's'}, ${warns.length} warning(s))`);

  // Snapshot drift check — informational; doesn't fail the build.
  const snapDir = path.join(REPO, 'tests', 'snapshots');
  let driftCount = 0;
  if (fs.existsSync(snapDir)) {
    try {
      const { buildSnapshot } = require('./snapshot.js');
      for (const deck of decks) {
        const snapPath = path.join(snapDir, deck.id + '.txt');
        if (!fs.existsSync(snapPath)) { driftCount++; continue; }
        const current = buildSnapshot(deck);
        if (current !== fs.readFileSync(snapPath, 'utf8')) driftCount++;
      }
    } catch (e) {
      // snapshot.js may not exist yet during early phases
    }
  }
  if (driftCount > 0) {
    console.warn(`\nSnapshot drift detected for ${driftCount} deck(s). Run \`node build/snapshot.js\` and review the diffs before committing.`);
  }
}

build();
