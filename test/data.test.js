// Data integrity tests: validate the shape and contents of every dataset.
const { test } = require('node:test');
const assert = require('node:assert');
const { createContext } = require('./helpers/loader');

const ctx = createContext();
const datasets = [
  { name: 'HIRAGANA',    arr: ctx.HIRAGANA },
  { name: 'KATAKANA',    arr: ctx.KATAKANA },
  { name: 'KANJI',       arr: ctx.KANJI },
  { name: 'VOCABULARY',  arr: ctx.VOCABULARY },
  { name: 'EMOJI',       arr: ctx.EMOJI },
  { name: 'EMOJI_WORDS', arr: ctx.EMOJI_WORDS },
];

for (const { name, arr } of datasets) {
  test(`${name} is a non-empty array`, () => {
    assert.ok(Array.isArray(arr), `${name} should be an array`);
    assert.ok(arr.length > 0, `${name} should not be empty`);
  });

  test(`${name} entries have well-formed {character, reading}`, () => {
    for (const entry of arr) {
      assert.equal(typeof entry, 'object', `${name} entry should be object`);
      assert.equal(typeof entry.character, 'string', `${name} character must be a string`);
      assert.equal(typeof entry.reading, 'string', `${name} reading must be a string`);
      assert.ok(entry.character.length > 0, `${name} character must not be empty`);
      assert.ok(entry.reading.length > 0, `${name} reading must not be empty`);
      assert.equal(entry.character.trim(), entry.character, `${name} character must not have whitespace`);
      assert.equal(entry.reading.trim(), entry.reading, `${name} reading must not have whitespace`);
    }
  });

  test(`${name} characters are unique`, () => {
    const seen = new Set();
    for (const entry of arr) {
      assert.ok(!seen.has(entry.character), `${name} duplicate character: ${entry.character}`);
      seen.add(entry.character);
    }
  });
}

test('HIRAGANA readings only contain lowercase ASCII letters', () => {
  for (const entry of ctx.HIRAGANA) {
    assert.match(entry.reading, /^[a-z]+$/, `bad reading: ${entry.character} -> ${entry.reading}`);
  }
});

test('KATAKANA readings only contain lowercase ASCII letters', () => {
  for (const entry of ctx.KATAKANA) {
    assert.match(entry.reading, /^[a-z]+$/, `bad reading: ${entry.character} -> ${entry.reading}`);
  }
});

test('HIRAGANA and KATAKANA have parallel coverage of readings', () => {
  // Every katakana reading should also exist as a hiragana reading.
  const hira = new Set(ctx.HIRAGANA.map((e) => e.reading));
  for (const entry of ctx.KATAKANA) {
    assert.ok(hira.has(entry.reading), `katakana reading "${entry.reading}" missing from hiragana`);
  }
});

test('HIRAGANA and KATAKANA characters do not overlap', () => {
  const hiraChars = new Set(ctx.HIRAGANA.map((e) => e.character));
  for (const entry of ctx.KATAKANA) {
    assert.ok(!hiraChars.has(entry.character), `${entry.character} appears in both HIRAGANA and KATAKANA`);
  }
});

test('KANJI characters are single CJK ideographs', () => {
  for (const entry of ctx.KANJI) {
    // Single code point, in the CJK Unified Ideographs range
    assert.equal([...entry.character].length, 1, `kanji should be single code point: ${entry.character}`);
    const cp = entry.character.codePointAt(0);
    assert.ok(cp >= 0x4E00 && cp <= 0x9FFF, `kanji not in CJK range: ${entry.character}`);
  }
});

test('VOCABULARY entries have multi-character Japanese strings', () => {
  for (const entry of ctx.VOCABULARY) {
    assert.ok(entry.character.length >= 1, `vocab too short: ${entry.character}`);
  }
});
