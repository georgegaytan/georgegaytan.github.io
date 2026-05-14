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
