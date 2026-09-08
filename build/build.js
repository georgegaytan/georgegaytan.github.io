#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateDecks } = require('./validator.js');

const REPO = path.resolve(__dirname, '..');
const SRC = path.join(REPO, 'src');
const DECKS_DIR = path.join(REPO, 'decks');
const OUT = path.join(REPO, 'index.html');
const SW_OUT = path.join(REPO, 'sw.js');

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
  const extraStyles = readIfExists(path.join(SRC, 'extra-vocab.css'));
  const extraVocab = readIfExists(path.join(SRC, 'extra-vocab.js'));
  const engineCore = readIfExists(path.join(SRC, 'engine-core.js'));
  const engineUi = readIfExists(path.join(SRC, 'engine-ui.js'));

  // The deck JSON is inlined inside a <script>; a literal "</" in any string
  // (e.g. an explanation quoting "</script>") would terminate the block and
  // blank the whole app. "<\/" is the same string to JS but inert to the HTML
  // parser. Nothing in the decks contains it today - this is a guard.
  const decksJs = `window.DECKS = ${JSON.stringify(decks).replace(/<\//g, '<\\/')};`;

  const html = template
    .replace('/*__STYLES__*/', () => styles)
    .replace('/*__DECKS__*/', () => decksJs)
    .replace('/*__EXTRA_STYLES__*/', () => extraStyles)
    .replace('/*__STORAGE__*/', () => storage)
    .replace('/*__EXTRA_VOCAB__*/', () => extraVocab)
    .replace('/*__ENGINE_CORE__*/', () => engineCore)
    .replace('/*__ENGINE_UI__*/', () => engineUi);

  fs.writeFileSync(OUT, html);
  console.log(`Built ${OUT} (${decks.length} deck${decks.length === 1 ? '' : 's'}, ${warns.length} warning(s))`);

  // Service worker. Its cache name is keyed to a hash of the HTML just built,
  // so a deploy always installs a fresh cache and evicts the previous one -
  // otherwise a cache-first worker would pin users to an old build.
  const swTemplate = readIfExists(path.join(SRC, 'sw.js'));
  if (swTemplate) {
    const buildHash = crypto.createHash('sha256').update(html).digest('hex').slice(0, 12);
    fs.writeFileSync(SW_OUT, swTemplate.replace(/__BUILD_HASH__/g, () => buildHash));
    console.log(`Built ${SW_OUT} (cache german-drills-${buildHash})`);
  }

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
