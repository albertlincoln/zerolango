// Loads ZeroLango source files (which use globals, not modules) into a
// shared `node:vm` context so they can be unit-tested without a bundler.
//
// Each test that needs a fresh state should call `createContext()` to get a
// new isolated context with mocked browser globals (localStorage, fetch).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

// Files in the same load order used by build.js / index.html.
const SRC_FILES = [
  'src/data/hiragana.js',
  'src/data/vocabulary.js',
  'src/data/katakana.js',
  'src/data/kanji.js',
  'src/data/emoji.js',
  'src/storage/localStorage.js',
  'src/storage/gist.js',
  'src/game/engine.js',
];

function createMockLocalStorage(seed) {
  const store = Object.assign({}, seed || {});
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach(function(k) { delete store[k]; });
    },
    _store: store,
  };
}

function createContext(options) {
  options = options || {};
  const sandbox = {
    console: console,
    localStorage: createMockLocalStorage(options.localStorageSeed),
    fetch: options.fetch || function() {
      throw new Error('fetch not mocked');
    },
    Math: Math,
    Date: Date,
    JSON: JSON,
    Object: Object,
    Array: Array,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Error: Error,
    Promise: Promise,
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    clearTimeout: clearTimeout,
  };
  vm.createContext(sandbox);

  const files = options.files || SRC_FILES;
  files.forEach(function(rel) {
    let code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    // The src files declare globals as `const FOO = ...` or `let FOO = ...`
    // at the top level. In a vm context, lexical declarations don't bind to
    // the sandbox, so we promote top-of-line `const`/`let` declarations to
    // `var` to make them inspectable from tests. This affects only the very
    // first column at the start of a line, which matches the source style.
    code = code.replace(/^(const|let)\s+/gm, 'var ');
    vm.runInContext(code, sandbox, { filename: rel });
  });

  return sandbox;
}

module.exports = { createContext, createMockLocalStorage, SRC_FILES, ROOT };
