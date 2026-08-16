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

  // Grace period: when the main countdown hits 0, the player gets this many
  // extra seconds to answer the question already on screen — but no new
  // questions and no further time after that.
  const GRACE_SECONDS = 5;
  // How long the correct answer stays highlighted after the grace period
  // expires unanswered, before the summary appears.
  const REVEAL_MS = 500;
  let graceInterval = null;
  let timeUp = false;          // main countdown finished
  let ended = false;           // onEnd already fired
  let currentAnswered = false; // current question has been answered

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
  let onGrace = null;
  let onTimeout = null;

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
    if (mode === 'conjugation') return CONJUGATION.map(function(item) { return Object.assign({}, item, { script: 'conjugation' }); });
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
      EMOJI.map(function(item)      { return Object.assign({}, item, { script: 'emoji' }); }),
      CONJUGATION.map(function(item) { return Object.assign({}, item, { script: 'conjugation' }); })
    );
    return all.filter(function(item) {
      const stat = s[item.character];
      if (!stat) return false;
      const total = stat.correct + stat.wrong;
      if (total === 0) return false;
      return (stat.correct / total) < 0.8;
    });
  }

  // `item` is the question's correct answer — only used where distractors need
  // to be narrower than the whole script (conjugation drills on one verb).
  function getScriptPool(script, item) {
    if (script === 'hiragana')   return HIRAGANA.map(function(i) { return Object.assign({}, i, { script: 'hiragana' }); });
    if (script === 'katakana')   return KATAKANA.map(function(i) { return Object.assign({}, i, { script: 'katakana' }); });
    if (script === 'kanji')      return KANJI.map(function(i) { return Object.assign({}, i, { script: 'kanji' }); });
    if (script === 'vocabulary') return VOCABULARY.map(function(i) { return Object.assign({}, i, { script: 'vocabulary' }); });
    if (script === 'emoji') return EMOJI.concat(EMOJI_WORDS).map(function(i) { return Object.assign({}, i, { script: 'emoji' }); });
    if (script === 'conjugation') {
      // Other forms of the same verb, so the question tests the conjugation
      // rather than which verb it is. Falls back to the full set if the verb
      // can't be identified.
      const all = CONJUGATION.map(function(i) { return Object.assign({}, i, { script: 'conjugation' }); });
      if (!item || !item.group) return all;
      const sameVerb = all.filter(function(i) { return i.group === item.group; });
      return sameVerb.length >= 4 ? sameVerb : all;
    }
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
    currentAnswered = false;
    currentItem = weightedPick(pool);
    currentDirection = resolveDirection();

    const optionCount = getOptionCount(currentItem);
    const distractorCount = optionCount - 1;

    // Build distractors from same script as correct item
    const samePool = getScriptPool(currentItem.script, currentItem);
    const used = {};
    used[currentItem.character] = true;
    const distractors = [];

    // Build weighted distractor pool — unseen or weak items are 1.5x more likely
    const candidates = samePool.filter(function(item) { return !used[item.character]; });
    for (let d = 0; d < distractorCount && candidates.length > 0; d++) {
      const weights = candidates.map(function(item) {
        const stat = charStats[item.character];
        if (!stat || (stat.correct + stat.wrong) === 0) return 1.5;
        return (stat.correct / (stat.correct + stat.wrong)) < 0.8 ? 1.5 : 1.0;
      });
      const total = weights.reduce(function(s, w) { return s + w; }, 0);
      let rand = Math.random() * total;
      let picked = candidates.length - 1;
      for (let i = 0; i < candidates.length; i++) {
        rand -= weights[i];
        if (rand <= 0) { picked = i; break; }
      }
      used[candidates[picked].character] = true;
      distractors.push(candidates[picked]);
      candidates.splice(picked, 1);
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
    onGrace          = config.onGrace    || null;
    onTimeout        = config.onTimeout  || null;

    pool        = buildPool(modeSetting);
    score       = 0;
    correct     = 0;
    wrong       = 0;
    streak      = 0;
    bestStreak  = 0;
    timeLeft    = duration;
    missedItems = [];

    clearInterval(graceInterval);
    timeUp          = false;
    ended           = false;
    currentAnswered = false;

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
        beginGrace();
      }
    }, 1000);
  }

  // Pause / resume the main countdown — used while showing the correct answer
  // after a wrong guess.
  function pause() {
    clearInterval(timerInterval);
  }

  function resume() {
    if (timeUp || ended) return;
    startTimer();
  }

  // Main time ran out. If the player has already answered the question on
  // screen, end immediately once feedback finishes (the app drives that via
  // nextQuestion). Otherwise grant a short grace period to answer it.
  function beginGrace() {
    timeUp = true;
    if (currentAnswered) return;
    let graceLeft = GRACE_SECONDS;
    if (onGrace) onGrace(graceLeft);
    clearInterval(graceInterval);
    graceInterval = setInterval(function() {
      graceLeft--;
      if (onGrace) onGrace(graceLeft);
      if (graceLeft <= 0) {
        clearInterval(graceInterval);
        // Reveal the answer they never got to before the summary takes over.
        if (onTimeout) {
          onTimeout(currentItem);
          setTimeout(endGame, REVEAL_MS);
        } else {
          endGame();
        }
      }
    }, 1000);
  }

  function endGame() {
    if (ended) return;
    ended = true;
    clearInterval(timerInterval);
    clearInterval(graceInterval);
    timeLeft = 0;
    if (onEnd) onEnd(getResults());
  }

  function submitAnswer(selectedItem) {
    currentAnswered = true;
    // The last question got answered inside the grace window — stop the grace
    // countdown so feedback isn't cut short; the game ends after feedback.
    if (timeUp) clearInterval(graceInterval);
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
    if (timeUp) { endGame(); return null; }
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
    clearInterval(graceInterval);
    timeLeft = 0;
    timeUp = true;
    ended = true;
  }

  function isRunning() {
    return timeLeft > 0;
  }

  return { start: start, submitAnswer: submitAnswer, nextQuestion: nextQuestion, pause: pause, resume: resume, stop: stop, isRunning: isRunning, getResults: getResults, getReviewPool: getReviewPool };
})();
