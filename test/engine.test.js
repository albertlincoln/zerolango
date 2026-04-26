// GameEngine tests: exercise pool building, weighted picking, distractors,
// scoring, streaks, results, review pool. Timer behaviour is covered by
// asserting clean stop and isRunning state — we avoid wall-clock waits.
const { test } = require('node:test');
const assert = require('node:assert');
const { createContext } = require('./helpers/loader');

function fresh() {
  return createContext();
}

function startBasic(ctx, overrides) {
  const cfg = Object.assign({
    mode: 'hiragana',
    direction: 'roman-to-japanese',
    duration: 60,
    onTick: () => {},
    onQuestion: () => {},
    onAnswer: () => {},
    onEnd: () => {},
  }, overrides || {});
  ctx.GameEngine.start(cfg);
  return cfg;
}

test('start() builds a hiragana pool and emits an initial question', () => {
  const ctx = fresh();
  let q = null;
  startBasic(ctx, { onQuestion: (got) => { q = got; } });
  assert.ok(q, 'onQuestion should fire');
  assert.equal(q.item.script, 'hiragana');
  assert.ok(q.options.length >= 2);
  // correct item is in options
  assert.ok(q.options.some((o) => o.character === q.item.character));
  // 4 options by default for an unseen item
  assert.equal(q.optionCount, 4);
  ctx.GameEngine.stop();
});

test('start() builds correct pool for each mode', () => {
  for (const mode of ['hiragana', 'katakana', 'kanji', 'vocabulary', 'emoji', 'mixed']) {
    const ctx = fresh();
    let q = null;
    startBasic(ctx, { mode, onQuestion: (got) => { q = got; } });
    assert.ok(q, `mode=${mode}: should emit question`);
    if (mode === 'mixed') {
      assert.ok(['hiragana', 'katakana', 'kanji'].includes(q.item.script));
    } else {
      assert.equal(q.item.script, mode);
    }
    ctx.GameEngine.stop();
  }
});

test('start() with review mode uses review pool from charStats', () => {
  const ctx = fresh();
  // Make 'あ' weak (must be < 80% accuracy and have attempts)
  const stats = { 'あ': { correct: 1, wrong: 4 } };
  let q = null;
  startBasic(ctx, {
    mode: 'review',
    charStats: stats,
    onQuestion: (got) => { q = got; },
  });
  assert.ok(q);
  assert.equal(q.item.character, 'あ');
  ctx.GameEngine.stop();
});

test('getReviewPool: filters across all scripts to weak (<80%) items only', () => {
  const ctx = fresh();
  const stats = {
    'あ': { correct: 9, wrong: 1 }, // 90% — mastered, excluded
    'い': { correct: 1, wrong: 4 }, // 20% — weak, included
    '山': { correct: 0, wrong: 2 }, // 0%  — weak, included
    'X':  { correct: 5, wrong: 5 }, // unknown character — still filtered (no entry in any dataset though)
  };
  const pool = ctx.GameEngine.getReviewPool(stats);
  const chars = pool.map((p) => p.character);
  assert.ok(chars.includes('い'));
  assert.ok(chars.includes('山'));
  assert.ok(!chars.includes('あ'), 'mastered should be excluded');
  // Items with zero attempts are excluded
  assert.ok(!chars.includes('う'));
});

test('getReviewPool: returns empty for missing/empty stats', () => {
  const ctx = fresh();
  assert.deepEqual(ctx.GameEngine.getReviewPool(undefined), []);
  assert.deepEqual(ctx.GameEngine.getReviewPool({}), []);
});

test('getReviewPool: tags items with their script', () => {
  const ctx = fresh();
  const stats = {
    'あ': { correct: 0, wrong: 1 },
    'ア': { correct: 0, wrong: 1 },
    '山': { correct: 0, wrong: 1 },
  };
  const pool = ctx.GameEngine.getReviewPool(stats);
  const byChar = Object.fromEntries(pool.map((p) => [p.character, p.script]));
  assert.equal(byChar['あ'], 'hiragana');
  assert.equal(byChar['ア'], 'katakana');
  assert.equal(byChar['山'], 'kanji');
});

test('submitAnswer: correct answer scores 10, increments streak and bestStreak', () => {
  const ctx = fresh();
  let lastQ = null;
  let lastA = null;
  startBasic(ctx, {
    onQuestion: (q) => { lastQ = q; },
    onAnswer: (a) => { lastA = a; },
  });
  // pick the correct option
  const isCorrect = ctx.GameEngine.submitAnswer(lastQ.item);
  assert.equal(isCorrect, true);
  assert.equal(lastA.isCorrect, true);
  assert.equal(lastA.score, 10);
  assert.equal(lastA.streak, 1);
  const r = ctx.GameEngine.getResults();
  assert.equal(r.correct, 1);
  assert.equal(r.wrong, 0);
  assert.equal(r.bestStreak, 1);
  assert.equal(r.accuracy, 100);
  ctx.GameEngine.stop();
});

test('submitAnswer: wrong answer resets streak and records missed item', () => {
  const ctx = fresh();
  let lastQ = null;
  startBasic(ctx, { onQuestion: (q) => { lastQ = q; } });
  // Pick a distractor (any option that is not the correct one)
  const distractor = lastQ.options.find((o) => o.character !== lastQ.item.character);
  assert.ok(distractor);
  const isCorrect = ctx.GameEngine.submitAnswer(distractor);
  assert.equal(isCorrect, false);
  const r = ctx.GameEngine.getResults();
  assert.equal(r.correct, 0);
  assert.equal(r.wrong, 1);
  assert.equal(r.bestStreak, 0);
  assert.equal(r.missedItems.length, 1);
  assert.equal(r.missedItems[0].character, lastQ.item.character);
  ctx.GameEngine.stop();
});

test('streak resets on wrong, bestStreak preserves the high-water mark', () => {
  const ctx = fresh();
  const questions = [];
  startBasic(ctx, { onQuestion: (q) => questions.push(q) });
  function answerCorrectly() {
    const cur = questions[questions.length - 1];
    ctx.GameEngine.submitAnswer(cur.item);
    ctx.GameEngine.nextQuestion();
  }
  function answerWrong() {
    const cur = questions[questions.length - 1];
    const d = cur.options.find((o) => o.character !== cur.item.character);
    ctx.GameEngine.submitAnswer(d);
    ctx.GameEngine.nextQuestion();
  }
  answerCorrectly();
  answerCorrectly();
  answerCorrectly();
  // streak now 3
  answerWrong();
  // streak resets to 0; bestStreak still 3
  answerCorrectly();
  const r = ctx.GameEngine.getResults();
  assert.equal(r.correct, 4);
  assert.equal(r.wrong, 1);
  assert.equal(r.bestStreak, 3);
  assert.equal(r.accuracy, 80);
  ctx.GameEngine.stop();
});

test('nextQuestion returns null and emits no question when timer expired', () => {
  const ctx = fresh();
  let count = 0;
  startBasic(ctx, { onQuestion: () => { count++; } });
  ctx.GameEngine.stop();
  const q = ctx.GameEngine.nextQuestion();
  assert.equal(q, null);
  // count is still 1 from start()
  assert.equal(count, 1);
});

test('isRunning() reflects timer state', () => {
  const ctx = fresh();
  assert.equal(ctx.GameEngine.isRunning(), false);
  startBasic(ctx);
  assert.equal(ctx.GameEngine.isRunning(), true);
  ctx.GameEngine.stop();
  assert.equal(ctx.GameEngine.isRunning(), false);
});

test('distractors are unique and from the same script as the correct item', () => {
  const ctx = fresh();
  // Run many rounds, mixed mode, to exercise multiple scripts
  for (let i = 0; i < 50; i++) {
    let q = null;
    startBasic(ctx, { mode: 'mixed', onQuestion: (got) => { q = got; } });
    const seen = new Set();
    for (const opt of q.options) {
      assert.ok(!seen.has(opt.character), 'duplicate option character');
      seen.add(opt.character);
      assert.equal(opt.script, q.item.script, 'option script mismatch');
    }
    ctx.GameEngine.stop();
  }
});

test('option count escalates with mastery', () => {
  // We cannot inspect getOptionCount directly (it's private). Instead, drive
  // it by seeding charStats and checking the emitted question.optionCount.

  // Default unseen -> 4 options
  {
    const ctx = fresh();
    let q;
    startBasic(ctx, { onQuestion: (got) => { q = got; } });
    assert.equal(q.optionCount, 4);
    ctx.GameEngine.stop();
  }
  // 5 correct + 80%+ accuracy -> 6 options. Use a tiny pool so the weighted
  // pick is forced onto a specific item.
  {
    const ctx = fresh();
    // Override pool indirectly: limit to a single hiragana via stats — but
    // since pool is hiragana, weights still apply. Instead, give the item
    // 5/0 (100%) and others 0/0 (unseen weight 3 which dominates), so we
    // need many trials to find one round where the mastered char is picked.
    const stats = {};
    // Make every hiragana except 'あ' have very low weight (mastered 100%) so
    // 'あ' is picked when its weight isn't suppressed. Easier: set every
    // character to mastered with the right counts so any pick yields ≥6 opts.
    for (const item of ctx.HIRAGANA) {
      stats[item.character] = { correct: 5, wrong: 1 }; // 5/6 ≈ 83%, ≥0.8 and correct≥5 → 6 options
    }
    let q;
    startBasic(ctx, { charStats: stats, onQuestion: (got) => { q = got; } });
    assert.equal(q.optionCount, 6);
    ctx.GameEngine.stop();
  }
  // 10 correct + 90%+ accuracy -> 8 options
  {
    const ctx = fresh();
    const stats = {};
    for (const item of ctx.HIRAGANA) {
      stats[item.character] = { correct: 10, wrong: 1 }; // ≈91%
    }
    let q;
    startBasic(ctx, { charStats: stats, onQuestion: (got) => { q = got; } });
    assert.equal(q.optionCount, 8);
    ctx.GameEngine.stop();
  }
});

test("direction='both' eventually produces both directions", () => {
  const ctx = fresh();
  const seen = new Set();
  for (let i = 0; i < 100 && seen.size < 2; i++) {
    let q;
    startBasic(ctx, { direction: 'both', onQuestion: (got) => { q = got; } });
    seen.add(q.direction);
    ctx.GameEngine.stop();
  }
  assert.equal(seen.size, 2, 'should produce both directions over many trials');
});

test('getResults snapshot contains all expected fields and is a copy', () => {
  const ctx = fresh();
  startBasic(ctx, { mode: 'kanji', duration: 90 });
  const r = ctx.GameEngine.getResults();
  assert.equal(typeof r.score, 'number');
  assert.equal(typeof r.correct, 'number');
  assert.equal(typeof r.wrong, 'number');
  assert.equal(typeof r.accuracy, 'number');
  assert.equal(typeof r.bestStreak, 'number');
  assert.ok(Array.isArray(r.missedItems));
  assert.equal(r.mode, 'kanji');
  assert.equal(r.duration, 90);
  // missedItems is a copy — mutating it doesn't affect engine state
  r.missedItems.push({ character: 'X', reading: 'x', script: 'hiragana' });
  assert.equal(ctx.GameEngine.getResults().missedItems.length, 0);
  ctx.GameEngine.stop();
});

test('emoji mode picks distractors from EMOJI ∪ EMOJI_WORDS', () => {
  const ctx = fresh();
  const allEmoji = new Set([...ctx.EMOJI, ...ctx.EMOJI_WORDS].map((e) => e.character));
  for (let i = 0; i < 30; i++) {
    let q;
    startBasic(ctx, { mode: 'emoji', onQuestion: (got) => { q = got; } });
    for (const opt of q.options) {
      assert.equal(opt.script, 'emoji');
      assert.ok(allEmoji.has(opt.character), `emoji ${opt.character} not in emoji set`);
    }
    ctx.GameEngine.stop();
  }
});

test('accuracy is 0 for a freshly started game with no answers', () => {
  const ctx = fresh();
  startBasic(ctx);
  assert.equal(ctx.GameEngine.getResults().accuracy, 0);
  ctx.GameEngine.stop();
});
