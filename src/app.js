const App = (() => {
  // --- State ---
  let currentUser = null;
  let gameSettings = {
    mode: 'hiragana',
    direction: 'roman-to-japanese',
    duration: 60,
  };
  let gameActive = false;
  let feedbackTimeout = null;
  let lastQuestion = null;
  let statsReturnScreen = 'setup';

  // --- DOM refs (populated in init) ---
  const el = {};

  function init() {
    // Cache DOM elements
    el.screens = {
      users:   document.getElementById('screen-users'),
      setup:   document.getElementById('screen-setup'),
      game:    document.getElementById('screen-game'),
      summary: document.getElementById('screen-summary'),
      stats:   document.getElementById('screen-stats'),
    };

    // Users screen
    el.usersList     = document.getElementById('users-list');
    el.newUsername   = document.getElementById('new-username');
    el.btnAddUser    = document.getElementById('btn-add-user');
    el.usersError    = document.getElementById('users-error');

    // Setup screen
    el.btnBackUsers  = document.getElementById('btn-back-users');
    el.setupUsername = document.getElementById('setup-username-label');
    el.modeOpts      = document.getElementById('mode-options');
    el.directionOpts = document.getElementById('direction-options');
    el.durationOpts  = document.getElementById('duration-options');
    el.bestScoreDisp = document.getElementById('setup-best-score');
    el.btnStartGame  = document.getElementById('btn-start-game');

    // Game screen
    el.gameScore     = document.getElementById('game-score');
    el.gameTimer     = document.getElementById('game-timer');
    el.gameTimerWrap = document.getElementById('game-timer-wrap');
    el.gameStreak    = document.getElementById('game-streak');
    el.gamePrompt    = document.getElementById('game-prompt');
    el.directionHint = document.getElementById('game-direction-hint');
    el.gameOptions   = document.getElementById('game-options');

    // Summary screen
    el.summaryStats      = document.getElementById('summary-stats');
    el.missedSection     = document.getElementById('missed-section');
    el.missedList        = document.getElementById('missed-list');
    el.btnPlayAgain      = document.getElementById('btn-play-again');
    el.btnChangeSettings = document.getElementById('btn-change-settings');
    el.btnMainMenu       = document.getElementById('btn-main-menu');

    // Stats screen
    el.btnViewStats      = document.getElementById('btn-view-stats');
    el.btnBackFromStats  = document.getElementById('btn-back-from-stats');
    el.statsUsername     = document.getElementById('stats-username-label');
    el.statsSummaryBar   = document.getElementById('stats-summary');
    el.statsTabs         = document.getElementById('screen-stats').querySelectorAll('.stats-tab');
    el.statsGrid         = document.getElementById('stats-grid');

    el.btnThemeToggle = document.getElementById('btn-theme-toggle');

    bindEvents();
    initTheme();
    showScreen('users');

    // Auto-select last user if available
    const last = Storage.getLastUser();
    if (last) {
      selectUser(last.username);
    } else {
      renderUsersList();
    }
  }

  function bindEvents() {
    // Users screen
    el.btnAddUser.addEventListener('click', handleAddUser);
    el.newUsername.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleAddUser();
    });

    // Setup screen
    el.btnBackUsers.addEventListener('click', function() { showScreen('users'); });
    el.btnStartGame.addEventListener('click', startGame);

    // Toggle groups
    setupToggleGroup(el.modeOpts, 'mode');
    setupToggleGroup(el.directionOpts, 'direction');
    setupToggleGroup(el.durationOpts, 'duration');

    // Stats screen
    el.btnViewStats.addEventListener('click', function() {
      statsReturnScreen = 'setup';
      showStatsScreen();
    });
    el.btnBackFromStats.addEventListener('click', function() { showScreen(statsReturnScreen); });
    el.statsTabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        el.statsTabs.forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        renderStatsGrid(tab.dataset.script);
      });
    });

    // Summary screen
    el.btnPlayAgain.addEventListener('click', function() { startGame(); });
    el.btnChangeSettings.addEventListener('click', function() { showScreen('setup'); });
    el.btnMainMenu.addEventListener('click', function() {
      showScreen('users');
      renderUsersList();
    });

    el.btnThemeToggle.addEventListener('click', toggleTheme);

    // Keyboard: 1-4 during game
    document.addEventListener('keydown', handleKeydown);
  }

  function setupToggleGroup(groupEl, settingKey) {
    groupEl.querySelectorAll('.toggle-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        groupEl.querySelectorAll('.toggle-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (settingKey === 'duration') {
          gameSettings[settingKey] = parseInt(btn.dataset.value, 10);
        } else {
          gameSettings[settingKey] = btn.dataset.value;
        }
        updateBestScoreDisplay();
      });
    });
  }

  function handleKeydown(e) {
    if (!gameActive) return;
    const key = e.key;
    if (key === '1' || key === '2' || key === '3' || key === '4') {
      const idx = parseInt(key, 10) - 1;
      const btns = el.gameOptions.querySelectorAll('.option-btn');
      if (btns[idx] && !btns[idx].disabled) {
        btns[idx].click();
      }
    }
  }

  // --- Theme ---
  function initTheme() {
    const saved = localStorage.getItem('zerolango_theme') || 'light';
    applyTheme(saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    el.btnThemeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('zerolango_theme', theme);
  }

  // --- Screen management ---
  function showScreen(name) {
    Object.values(el.screens).forEach(function(s) { s.classList.add('hidden'); });
    el.screens[name].classList.remove('hidden');
  }

  // --- Users screen ---
  function renderUsersList() {
    const users = Storage.getUsers();
    el.usersList.innerHTML = '';
    if (users.length === 0) {
      el.usersList.innerHTML = '<p class="no-users">No users yet. Create one below.</p>';
      return;
    }
    users.forEach(function(user) {
      const card = document.createElement('div');
      card.className = 'user-card';

      const info = document.createElement('div');
      info.className = 'user-info';
      const name = document.createElement('span');
      name.className = 'user-name';
      name.textContent = user.username;
      const games = document.createElement('span');
      games.className = 'user-games';
      games.textContent = user.totalGamesPlayed + ' game' + (user.totalGamesPlayed !== 1 ? 's' : '');
      info.appendChild(name);
      info.appendChild(games);

      const actions = document.createElement('div');
      actions.className = 'user-actions';

      const selectBtn = document.createElement('button');
      selectBtn.className = 'btn-primary btn-sm';
      selectBtn.textContent = 'Play';
      selectBtn.addEventListener('click', function() { selectUser(user.username); });

      const statsBtn = document.createElement('button');
      statsBtn.className = 'btn-secondary btn-sm';
      statsBtn.textContent = '📊 Stats';
      statsBtn.addEventListener('click', function() {
        currentUser = Storage.getUser(user.username);
        Storage.setLastUser(user.username);
        statsReturnScreen = 'users';
        showStatsScreen();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-ghost btn-sm btn-danger';
      deleteBtn.textContent = '\u2715';
      deleteBtn.title = 'Delete user';
      deleteBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete "' + user.username + '"?')) {
          if (confirm('Are you really sure you want to delete "' + user.username + '"? All progress will be lost.')) {
            Storage.deleteUser(user.username);
            if (currentUser && currentUser.username === user.username) {
              currentUser = null;
            }
            renderUsersList();
          }
        }
      });

      actions.appendChild(selectBtn);
      actions.appendChild(statsBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(info);
      card.appendChild(actions);
      el.usersList.appendChild(card);
    });
  }

  function handleAddUser() {
    const username = el.newUsername.value.trim();
    if (!username) {
      showUsersError('Please enter a username.');
      return;
    }
    if (username.length < 2) {
      showUsersError('Username must be at least 2 characters.');
      return;
    }
    if (Storage.userExists(username)) {
      showUsersError('That username is already taken.');
      return;
    }
    const user = Storage.createUser(username);
    el.newUsername.value = '';
    hideUsersError();
    selectUser(user.username);
  }

  function showUsersError(msg) {
    el.usersError.textContent = msg;
    el.usersError.classList.remove('hidden');
  }

  function hideUsersError() {
    el.usersError.classList.add('hidden');
  }

  function selectUser(username) {
    const user = Storage.getUser(username);
    if (!user) { renderUsersList(); showScreen('users'); return; }
    currentUser = user;
    Storage.setLastUser(username);
    if (user.lastSettings) {
      gameSettings.mode      = user.lastSettings.mode      || gameSettings.mode;
      gameSettings.direction = user.lastSettings.direction || gameSettings.direction;
      gameSettings.duration  = user.lastSettings.duration  || gameSettings.duration;
    }
    showSetupScreen();
  }

  // --- Setup screen ---
  function showSetupScreen() {
    renderUsersList();
    el.setupUsername.textContent = currentUser.username;
    // Restore toggles to current settings
    restoreToggle(el.modeOpts, String(gameSettings.mode));
    restoreToggle(el.directionOpts, String(gameSettings.direction));
    restoreToggle(el.durationOpts, String(gameSettings.duration));
    updateBestScoreDisplay();
    showScreen('setup');
  }

  function restoreToggle(groupEl, value) {
    groupEl.querySelectorAll('.toggle-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  function updateBestScoreDisplay() {
    if (!currentUser) return;
    const best = Storage.getBestScore(currentUser.username, gameSettings.mode, gameSettings.duration);
    el.bestScoreDisp.textContent = best > 0
      ? 'Best: ' + best + ' pts for this mode'
      : 'No best score yet for this mode';
  }

  // --- Game screen ---
  function startGame() {
    if (!currentUser) { showScreen('users'); return; }
    gameActive = true;

    el.gameScore.textContent = '0';
    el.gameStreak.textContent = '0';
    el.gameTimer.textContent = gameSettings.duration;
    el.gameTimerWrap.classList.remove('timer-warning');

    showScreen('game');

    Storage.saveUserSettings(currentUser.username, {
      mode:      gameSettings.mode,
      direction: gameSettings.direction,
      duration:  gameSettings.duration,
    });

    GameEngine.start({
      mode:       gameSettings.mode,
      direction:  gameSettings.direction,
      duration:   gameSettings.duration,
      charStats:  Storage.getCharStats(currentUser.username),
      onTick:     handleTick,
      onQuestion: renderQuestion,
      onAnswer:   handleAnswerResult,
      onEnd:      handleGameEnd,
    });
  }

  function handleTick(timeLeft) {
    el.gameTimer.textContent = timeLeft;
    el.gameTimerWrap.classList.toggle('timer-warning', timeLeft <= 10);
  }

  function renderQuestion(question) {
    lastQuestion = question;
    const item      = question.item;
    const options   = question.options;
    const direction = question.direction;

    // Prompt
    if (direction === 'roman-to-japanese') {
      el.gamePrompt.textContent = item.reading;
      el.gamePrompt.className = 'prompt-text';
      el.directionHint.textContent = item.script === 'vocabulary' ? 'Pick the Japanese word' : 'Pick the Japanese character';
    } else {
      el.gamePrompt.textContent = item.character;
      el.gamePrompt.className = item.script === 'vocabulary' ? 'prompt-vocab' : 'prompt-character';
      el.directionHint.textContent = (item.script === 'kanji' || item.script === 'vocabulary') ? 'Pick the English meaning' : 'Pick the romaji reading';
    }

    // Options
    el.gameOptions.innerHTML = '';
    options.forEach(function(opt, i) {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.index = i;

      if (direction === 'roman-to-japanese') {
        btn.textContent = opt.character;
        btn.classList.add('option-character');
      } else {
        btn.textContent = opt.reading;
        btn.classList.add('option-text');
      }

      const keyHint = document.createElement('span');
      keyHint.className = 'key-hint';
      keyHint.textContent = i + 1;
      btn.appendChild(keyHint);

      btn.addEventListener('click', function() { handleOptionClick(opt, btn); });
      el.gameOptions.appendChild(btn);
    });
  }

  function handleOptionClick(selectedItem, btn) {
    if (!gameActive) return;
    // Disable all buttons immediately
    disableAllOptions();
    GameEngine.submitAnswer(selectedItem);
  }

  function handleAnswerResult(result) {
    const isCorrect   = result.isCorrect;
    const correctItem = result.correctItem;
    const selectedItem = result.selectedItem;
    const score       = result.score;
    const streak      = result.streak;

    el.gameScore.textContent  = score;
    el.gameStreak.textContent = streak;

    // Record per-character result for adaptive weighting and stats
    Storage.updateCharStat(currentUser.username, correctItem.character, isCorrect);

    // Highlight buttons
    const btns = el.gameOptions.querySelectorAll('.option-btn');
    btns.forEach(function(btn) {
      const idx = parseInt(btn.dataset.index, 10);
      const opt = lastQuestion.options[idx];
      if (opt.character === correctItem.character) {
        btn.classList.add('correct');
      } else if (opt.character === selectedItem.character && !isCorrect) {
        btn.classList.add('incorrect');
      }
    });

    const delay = isCorrect ? 400 : 1400;
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(function() {
      if (!GameEngine.isRunning()) return; // timer ended during pause
      // Clear highlights
      btns.forEach(function(btn) { btn.classList.remove('correct', 'incorrect'); });
      GameEngine.nextQuestion();
    }, delay);
  }

  function handleGameEnd(results) {
    gameActive = false;
    clearTimeout(feedbackTimeout);
    Storage.saveGameResult(
      currentUser.username,
      results.mode,
      results.duration,
      results.score,
      results.missedItems
    );
    // Refresh currentUser data
    currentUser = Storage.getUser(currentUser.username);
    renderSummary(results);
    showScreen('summary');
  }

  function disableAllOptions() {
    el.gameOptions.querySelectorAll('.option-btn').forEach(function(btn) {
      btn.disabled = true;
    });
  }

  // --- Summary screen ---
  function renderSummary(results) {
    el.summaryStats.innerHTML =
      '<div class="stat-card"><div class="stat-value">' + results.score + '</div><div class="stat-label">Score</div></div>' +
      '<div class="stat-card correct-card"><div class="stat-value">' + results.correct + '</div><div class="stat-label">Correct</div></div>' +
      '<div class="stat-card incorrect-card"><div class="stat-value">' + results.wrong + '</div><div class="stat-label">Wrong</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + results.accuracy + '%</div><div class="stat-label">Accuracy</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + results.bestStreak + '</div><div class="stat-label">Best Streak</div></div>';

    if (results.missedItems.length > 0) {
      el.missedSection.classList.remove('hidden');
      el.missedList.innerHTML = results.missedItems.map(function(item) {
        return '<div class="missed-item"><span class="missed-char">' + item.character + '</span><span class="missed-arrow">\u2192</span><span class="missed-reading">' + item.reading + '</span></div>';
      }).join('');
    } else {
      el.missedSection.classList.add('hidden');
    }
  }

  // --- Stats screen ---
  function showStatsScreen() {
    currentUser = Storage.getUser(currentUser.username);
    el.statsUsername.textContent = currentUser.username;

    // Compute overall summary
    const charStats = currentUser.charStats || {};
    const chars = Object.keys(charStats);
    var totalCorrect = 0, totalWrong = 0;
    chars.forEach(function(c) {
      totalCorrect += charStats[c].correct;
      totalWrong  += charStats[c].wrong;
    });
    const totalAttempts = totalCorrect + totalWrong;
    const overallAcc = totalAttempts > 0 ? Math.round(totalCorrect / totalAttempts * 100) : null;

    el.statsSummaryBar.innerHTML =
      '<span><strong>' + chars.length + '</strong> characters practiced</span>' +
      '<span><strong>' + totalAttempts + '</strong> total answers</span>' +
      (overallAcc !== null ? '<span><strong>' + overallAcc + '%</strong> overall accuracy</span>' : '<span>Play a round to see stats</span>');

    // Reset tabs to hiragana
    el.statsTabs.forEach(function(t) { t.classList.toggle('active', t.dataset.script === 'hiragana'); });
    renderStatsGrid('hiragana');
    showScreen('stats');
  }

  function renderStatsGrid(script) {
    currentUser = Storage.getUser(currentUser.username);
    const charStats = (currentUser && currentUser.charStats) ? currentUser.charStats : {};

    var items;
    if (script === 'hiragana')        items = HIRAGANA;
    else if (script === 'katakana')   items = KATAKANA;
    else if (script === 'vocabulary') items = VOCABULARY;
    else                              items = KANJI;

    // Sort: worst accuracy first, unseen last
    var sorted = items.slice().sort(function(a, b) {
      const sa = charStats[a.character];
      const sb = charStats[b.character];
      const seenA = sa && (sa.correct + sa.wrong) > 0;
      const seenB = sb && (sb.correct + sb.wrong) > 0;
      if (!seenA && !seenB) return 0;
      if (!seenA) return 1;
      if (!seenB) return -1;
      const accA = sa.correct / (sa.correct + sa.wrong);
      const accB = sb.correct / (sb.correct + sb.wrong);
      return accA - accB;
    });

    const vocabClass = script === 'vocabulary' ? ' stat-cell--vocab' : '';

    el.statsGrid.innerHTML = sorted.map(function(item) {
      const stat = charStats[item.character];
      const seen = stat && (stat.correct + stat.wrong) > 0;

      if (!seen) {
        return '<div class="stat-cell unseen' + vocabClass + '" title="' + item.reading + '">' +
          '<div class="stat-char">' + item.character + '</div>' +
          '<div class="stat-reading">' + item.reading + '</div>' +
          '<div class="stat-counts">—</div>' +
          '</div>';
      }

      const total    = stat.correct + stat.wrong;
      const accuracy = Math.round(stat.correct / total * 100);
      const colorClass = accuracy >= 80 ? 'acc-high'
                       : accuracy >= 60 ? 'acc-mid-high'
                       : accuracy >= 40 ? 'acc-mid-low'
                       :                  'acc-low';

      return '<div class="stat-cell ' + colorClass + vocabClass + '" title="' + item.reading + '">' +
        '<div class="stat-char">' + item.character + '</div>' +
        '<div class="stat-reading">' + item.reading + '</div>' +
        '<div class="stat-counts">' + stat.correct + '/' + total + '</div>' +
        '<div class="stat-bar-wrap"><div class="stat-bar" style="width:' + accuracy + '%"></div></div>' +
        '<div class="stat-pct">' + accuracy + '%</div>' +
        '</div>';
    }).join('');
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', App.init);
