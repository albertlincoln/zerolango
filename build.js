#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const root = __dirname;

const css = fs.readFileSync(path.join(root, 'src/ui/styles.css'), 'utf8');

const scripts = [
  'src/data/hiragana.js',
  'src/data/vocabulary.js',
  'src/data/katakana.js',
  'src/data/kanji.js',
  'src/storage/localStorage.js',
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
  .replace('</body>', '<script>\n' + scripts + '\n</script>\n</body>');

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/index.html'), html, 'utf8');

console.log('Built docs/index.html');
