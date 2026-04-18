const GameEngine = (() => {
  let pool = [];
  let modeSetting = 'hiragana';
  let directionSetting = 'roman-to-japanese';
  let duration = 60;

  let score = 0;
  let correct = 0;
  let wrong = 0;
  let streak = 0;
  let bestStreak = 0;
  let timeLeft = 0;
  let timerInterval = null;
  let missedItems = [];

  let currentItem = null;
  let currentOptions = [];
  let currentDirection = 'roman-to-japanese';

  // Per-character accuracy stats (provided at game start)
  let charStats = {};

  // Callbacks
  let onTick = null;
  let onQuestion = null;
  let onAnswer = null;
  let onEnd = null;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function buildPool(mode) {
    if (mode === 'hiragana')   return HIRAGANA.map(function(item) { return Object.assign({}, item, { script: 'hiragana' }); });
    if (mode === 'katakana')   return KATAKANA.map(function(item) { return Object.assign({}, item, { script: 'katakana' }); });
    if (mode === 'kanji')      return KANJI.map(function(item) { return Object.assign({}, item, { script: 'kanji' }); });
    if (mode === 'vocabulary') return VOCABULARY.map(function(item) { return Object.assign({}, item, { script: 'vocabulary' }); });
    if (mode === 'emoji')      return EMOJI.map(function(item) { return Object.assign({}, item, { script: 'emoji' }); });
    if (mode === 'review')     return getReviewPool(charStats);
    // mixed
    return [].concat(
      HIRAGANA.map(function(item) { return Object.assign({}, item, { script: 'hiragana' }); }),
      KATAKANA.map(function(item) { return Object.assign({}, item, { script: 'katakana' }); }),
      KANJI.map(function(item) { return Object.assign({}, item, { script: 'kanji' }); })
    );
  }

  // Items across all scripts that have been attempted but not mastered (<80% accuracy).
  function getReviewPool(stats) {
    const s = stats || {};
    const all = [].concat(
      HIRAGANA.map(function(item)   { return Object.assign({}, item, { script: 'hiragana' }); }),
      KATAKANA.map(function(item)   { return Object.assign({}, item, { script: 'katakana' }); }),
      KANJI.map(function(item)      { return Object.assign({}, item, { script: 'kanji' }); }),
      VOCABULARY.map(function(item) { return Object.assign({}, item, { script: 'vocabulary' }); }),
      EMOJI.map(function(item)      { return Object.assign({}, item, { script: 'emoji' }); })
    );
    return all.filter(function(item) {
      const stat = s[item.character];
      if (!stat) return false;
      const total = stat.correct + stat.wrong;
      if (total === 0) return false;
      return (stat.correct / total) < 0.8;
    });
  }

  function getScriptPool(script) {
    if (script === 'hiragana')   return HIRAGANA.map(function(item) { return Object.assign({}, item, { script: 'hiragana' }); });
    if (script === 'katakana')   return KATAKANA.map(function(item) { return Object.assign({}, item, { script: 'katakana' }); });
    if (script === 'kanji')      return KANJI.map(function(item) { return Object.assign({}, item, { script: 'kanji' }); });
    if (script === 'vocabulary') return VOCABULARY.map(function(item) { return Object.assign({}, item, { script: 'vocabulary' }); });
    if (script === 'emoji') return EMOJI.concat(EMOJI_WORDS).map(function(item) { return Object.assign({}, item, { script: 'emoji' }); });
    return [];
  }

  function resolveDirection() {
    if (directionSetting === 'both') {
      return Math.random() < 0.5 ? 'roman-to-japanese' : 'japanese-to-roman';
    }
    return directionSetting;
  }

  function getWeight(character) {
    const stat = charStats[character];
    if (!stat || (stat.correct + stat.wrong) === 0) return 3;
    const accuracy = stat.correct / (stat.correct + stat.wrong);
    if (accuracy >= 0.8) return 1;
    if (accuracy >= 0.6) return 2;
    if (accuracy >= 0.4) return 3;
    return 5;
  }

  function weightedPick(items) {
    const weights = items.map(function(item) { return getWeight(item.character); });
    const total = weights.reduce(function(s, w) { return s + w; }, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      rand -= weights[i];
      if (rand <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function getOptionCount(item) {
    const stat = charStats[item.character];
    if (!stat) return 4;
    const total = stat.correct + stat.wrong;
    if (total === 0) return 4;
    const accuracy = stat.correct / total;
    if (stat.correct >= 10 && accuracy >= 0.9) return 8;
    if (stat.correct >= 5  && accuracy >= 0.8) return 6;
    return 4;
  }

  function generateQuestion() {
    currentItem = weightedPick(pool);
    currentDirection = resolveDirection();

    const optionCount = getOptionCount(currentItem);
    const distractorCount = optionCount - 1;

    // Build distractors from same script as correct item
    const samePool = getScriptPool(currentItem.script);
    const used = {};
    used[currentItem.character] = true;
    const distractors = [];

    // Shuffle the pool to pick random distractors
    const shuffled = shuffle(samePool);
    for (let i = 0; i < shuffled.length && distractors.length < distractorCount; i++) {
      if (!used[shuffled[i].character]) {
        used[shuffled[i].character] = true;
        distractors.push(shuffled[i]);
      }
    }

    currentOptions = shuffle([currentItem].concat(distractors));

    return {
      item: currentItem,
      options: currentOptions,
      direction: currentDirection,
      optionCount: currentOptions.length,
    };
  }

  function start(config) {
    modeSetting      = config.mode;
    directionSetting = config.direction;
    duration         = config.duration;
    charStats        = config.charStats   || {};
    onTick           = config.onTick     || null;
    onQuestion       = config.onQuestion || null;
    onAnswer         = config.onAnswer   || null;
    onEnd            = config.onEnd      || null;

    pool        = buildPool(modeSetting);
    score       = 0;
    correct     = 0;
    wrong       = 0;
    streak      = 0;
    bestStreak  = 0;
    timeLeft    = duration;
    missedItems = [];

    startTimer();
    const q = generateQuestion();
    if (onQuestion) onQuestion(q);
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(function() {
      timeLeft--;
      if (onTick) onTick(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (onEnd) onEnd(getResults());
      }
    }, 1000);
  }

  function submitAnswer(selectedItem) {
    const isCorrect = selectedItem.character === currentItem.character;
    if (isCorrect) {
      score += 10;
      correct++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      wrong++;
      streak = 0;
      missedItems.push(Object.assign({}, currentItem));
    }
    if (onAnswer) {
      onAnswer({
        isCorrect: isCorrect,
        correctItem: currentItem,
        selectedItem: selectedItem,
        score: score,
        streak: streak,
      });
    }
    return isCorrect;
  }

  function nextQuestion() {
    if (timeLeft <= 0) return null;
    const q = generateQuestion();
    if (onQuestion) onQuestion(q);
    return q;
  }

  function getResults() {
    return {
      score: score,
      correct: correct,
      wrong: wrong,
      accuracy: (correct + wrong) > 0
        ? Math.round((correct / (correct + wrong)) * 100)
        : 0,
      bestStreak: bestStreak,
      missedItems: missedItems.slice(),
      mode: modeSetting,
      duration: duration,
    };
  }

  function stop() {
    clearInterval(timerInterval);
    timeLeft = 0;
  }

  function isRunning() {
    return timeLeft > 0;
  }

  return { start: start, submitAnswer: submitAnswer, nextQuestion: nextQuestion, stop: stop, isRunning: isRunning, getResults: getResults, getReviewPool: getReviewPool };
})();
