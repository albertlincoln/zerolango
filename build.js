#!/usr/bin/env node
const fs     = require('fs');
const path   = require('path');
const { execSync } = require('child_process');

const root = __dirname;

let gitHash = 'dev';
try {
  gitHash = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
} catch (e) {}


const css = fs.readFileSync(path.join(root, 'src/ui/styles.css'), 'utf8');

const scripts = [
  'src/data/hiragana.js',
  'src/data/vocabulary.js',
  'src/data/katakana.js',
  'src/data/kanji.js',
  'src/data/emoji.js',
  'src/storage/localStorage.js',
  'src/storage/gist.js',
  'src/game/engine.js',
  'src/app.js',
].map(function(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}).join('\n');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<link rel="stylesheet" href="[^"]*">/, '<style>\n' + css + '\n</style>')
  .replace(
    /<script src="[^"]*"><\/script>\n?/g,
    ''
  )
  .replace('__GIT_HASH__', gitHash)
  .replace('</body>', '<script>\n' + scripts + '\n</script>\n</body>');

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/index.html'), html, 'utf8');

console.log('Built docs/index.html');
