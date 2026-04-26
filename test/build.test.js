// Build script tests: ensure docs/index.html is produced correctly.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

test('build.js produces docs/index.html with inlined scripts and styles', () => {
  const docsPath = path.join(ROOT, 'docs/index.html');
  // Snapshot the current docs/index.html so the test does not dirty the
  // working tree (build.js writes the current git hash, which differs from
  // the committed artifact).
  const original = fs.existsSync(docsPath) ? fs.readFileSync(docsPath) : null;
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { cwd: ROOT });
    const out = fs.readFileSync(docsPath, 'utf8');

    // No external script src tags should remain
    assert.ok(!/<script\s+src=/i.test(out), 'docs/index.html should have no external script src tags');
    // No external stylesheet links should remain
    assert.ok(!/<link[^>]+rel=["']stylesheet["']/i.test(out), 'docs/index.html should have no external stylesheets');
    // The git hash placeholder should have been substituted
    assert.ok(!out.includes('__GIT_HASH__'), '__GIT_HASH__ placeholder should be replaced');
    // Each src file's globals should appear in the bundle
    for (const sentinel of [
      'const HIRAGANA',
      'const KATAKANA',
      'const KANJI',
      'const VOCABULARY',
      'const EMOJI',
      'const Storage',
      'const GistSync',
      'const GameEngine',
    ]) {
      assert.ok(out.includes(sentinel), 'bundle missing: ' + sentinel);
    }
    // CSS custom properties are inlined
    assert.ok(/<style>[\s\S]*--/m.test(out), 'inline CSS custom properties not found');
  } finally {
    if (original !== null) fs.writeFileSync(docsPath, original);
  }
});

test('build.js script list mirrors index.html load order', () => {
  const buildSrc = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8');
  const indexSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // Extract paths from build.js scripts array
  const buildPaths = [];
  const arrMatch = buildSrc.match(/const scripts = \[([\s\S]*?)\]/);
  assert.ok(arrMatch, 'build.js scripts array not found');
  for (const m of arrMatch[1].matchAll(/'([^']+\.js)'/g)) buildPaths.push(m[1]);

  // Extract <script src="..."> from index.html (strip query strings)
  const indexPaths = [];
  for (const m of indexSrc.matchAll(/<script\s+src="([^"]+)"\s*>\s*<\/script\s*>/g)) {
    indexPaths.push(m[1].replace(/\?.*$/, ''));
  }
  assert.ok(buildPaths.length > 0, 'no scripts parsed from build.js');
  assert.ok(indexPaths.length > 0, 'no scripts parsed from index.html');
  assert.deepEqual(buildPaths, indexPaths, 'build.js and index.html script load order must match');
});
