const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const cp = require('node:child_process');

const REPO = path.resolve(__dirname, '..');

test('build: produces index.html at the repo root', () => {
  const out = path.join(REPO, 'index.html');
  if (fs.existsSync(out)) fs.unlinkSync(out);
  cp.execFileSync(process.execPath, ['build/build.js'], { cwd: REPO });
  assert.ok(fs.existsSync(out), 'index.html should exist after build');
  const html = fs.readFileSync(out, 'utf8');
  assert.ok(html.includes('<title>German Drills</title>'));
  assert.ok(!html.includes('__STYLES__'), 'placeholder __STYLES__ should be replaced');
  assert.ok(!html.includes('__DECKS__'), 'placeholder __DECKS__ should be replaced');
  assert.ok(!html.includes('__EXTRA_STYLES__'), 'placeholder __EXTRA_STYLES__ should be replaced');
  assert.ok(!html.includes('__EXTRA_VOCAB__'), 'placeholder __EXTRA_VOCAB__ should be replaced');
});

test('build: index.html inlines the standalone extr@ section', () => {
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
  assert.ok(html.includes('extr@ Vocab'), 'menu entry should be present');
  assert.ok(html.includes('#extraView'), 'scoped styles should be present');
  assert.ok(html.includes('Vokabelkarten zur Serie'), 'section shell should be present');
  assert.ok(html.includes('Sams Ankunft'), 'episode list should be inlined');
  // The section must not have been folded into the deck engine.
  assert.ok(!html.includes('"id":"extra-vocab"'), 'extr@ must not be a drill deck');
});

test('build: fails non-zero on validator error', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gd-build-'));
  fs.mkdirSync(path.join(dir, 'decks'));
  fs.writeFileSync(path.join(dir, 'decks/bad.json'), JSON.stringify({
    id: 'bad', name: 'B', icon: '!', color: '#fff', description: 'd',
    items: [{ id: 'x', kind: 'text', prompt: 'p', answer: '', topic: 't' }],
  }));
  fs.cpSync(path.join(REPO, 'src'), path.join(dir, 'src'), { recursive: true });
  fs.cpSync(path.join(REPO, 'build'), path.join(dir, 'build'), { recursive: true });
  const res = cp.spawnSync(process.execPath, ['build/build.js'], { cwd: dir });
  assert.notStrictEqual(res.status, 0, 'build should exit non-zero on validator error');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('build: emits a service worker keyed to the built HTML', () => {
  const sw = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8');
  assert.ok(!sw.includes('__BUILD_HASH__'), 'the build hash placeholder must be stamped');
  const m = sw.match(/const BUILD = '([0-9a-f]{12})'/);
  assert.ok(m, 'sw.js should declare a hash-keyed build constant');
  assert.ok(sw.includes("const CACHE = 'german-drills-' + BUILD"), 'cache name derives from the build hash');

  // The hash must track index.html, or a deploy would leave users pinned to a
  // stale cached shell.
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
  const expected = require('node:crypto').createHash('sha256').update(html).digest('hex').slice(0, 12);
  assert.strictEqual(m[1], expected, 'cache name must match a hash of the built index.html');
});

test('build: the page registers the worker but never on file://', () => {
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
  assert.ok(html.includes("navigator.serviceWorker.register('sw.js')"));
  assert.ok(html.includes("location.protocol.indexOf('http') === 0"),
    'registration must be skipped on file:// so the standalone copy still works');
});

test('build: no render-blocking font import, and zoom is not disabled', () => {
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
  assert.ok(!html.includes('@import'), 'the font @import blocked first paint; it should be a non-blocking link');
  assert.ok(html.includes("media=\"print\" onload=\"this.media='all'\""), 'font stylesheet should load non-blocking');
  // Match the meta tag itself - the phrase also appears in a CSS comment
  // explaining why it was removed.
  const viewport = html.match(/<meta name="viewport" content="([^"]*)"/);
  assert.ok(viewport, 'viewport meta should exist');
  assert.ok(!/user-scalable\s*=\s*no/.test(viewport[1]),
    `pinch-zoom must not be disabled, got: ${viewport[1]}`);
  assert.ok(!/maximum-scale\s*=\s*1/.test(viewport[1]), 'and must not be capped at 1x');
});

test('coverage ratchet: session logic stays out of engine-ui.js', () => {
  // engine-ui.js has no DOM-free test path (no jsdom, no npm). Every bug found
  // in the 2026-09 audit lived in decision logic that had drifted into it. This
  // pins the extracted functions to EngineCore so they cannot quietly grow back
  // an untested twin in the UI file.
  const ui = fs.readFileSync(path.join(REPO, 'src', 'engine-ui.js'), 'utf8');
  const mustNotDefine = [
    'function actionableCount', 'function addDays', 'function topicsOf',
    'function hydratedStateView', 'function uniformFirstCase', 'function hashCode',
    'function shuffleDeterministic', 'function buildDailyReviewQueue',
  ];
  for (const sig of mustNotDefine) {
    assert.ok(!ui.includes(sig), `${sig} must live in engine-core.js, not engine-ui.js`);
  }
  assert.ok(!ui.includes('toISOString().slice(0, 10)'),
    'the learning day must come from EngineCore.localDay, not UTC');
  assert.ok(ui.includes('EngineCore.buildDailyReviewQueue('), 'daily review delegates to EngineCore');
  assert.ok(ui.includes('EngineCore.isIntroduction('), 'new-card tally uses the shared rule');
});

test('build: a "</" inside deck content cannot terminate the inline script', () => {
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
  const start = html.indexOf('window.DECKS = ');
  const end = html.indexOf('</script>', start);
  const decksBlock = html.slice(start, end);
  assert.ok(!decksBlock.includes('</'), 'inlined deck JSON must have "</" escaped');
  // The escaped text must still evaluate to exactly the deck content on disk.
  const evaluated = new Function(decksBlock.replace(/^window\.DECKS = /, 'return '))();
  const fromDisk = fs.readdirSync(path.join(REPO, 'decks'))
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(REPO, 'decks', f), 'utf8')));
  assert.deepStrictEqual(evaluated, fromDisk, 'escaping must not alter deck content');
});
