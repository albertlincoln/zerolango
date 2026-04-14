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

    el.btnThemeToggle   = document.getElementById('btn-theme-toggle');
    el.btnExportData    = document.getElementById('btn-export-data');
    el.importFileInput  = document.getElementById('import-file-input');

    // Gist sync
    el.btnGistToggle   = document.getElementById('btn-gist-toggle');
    el.gistPanel       = document.getElementById('gist-panel');
    el.gistPat         = document.getElementById('gist-pat');
    el.btnGistSavePat  = document.getElementById('btn-gist-save-pat');
    el.gistIdRow       = document.getElementById('gist-id-row');
    el.gistIdValue     = document.getElementById('gist-id-value');
    el.btnGistPush     = document.getElementById('btn-gist-push');
    el.btnGistPull     = document.getElementById('btn-gist-pull');
    el.gistStatus      = document.getElementById('gist-status');

    bindEvents();
    initTheme();
    initGistUI();
    showScreen('users');

    // Auto-select last user if available
    const last = Storage.getLastUser();
    if (last) {
      selectUser(last.username);
    } else {
      renderUsersList();
    }

    // Auto-pull from GitHub if PAT is configured and it's the first check of the day
    GistSync.checkAndAutoPull().then(function(result) {
      if (result.action === 'merged') {
        setGistStatus('Synced from GitHub (v' + result.remoteVersion + ')', false);
        renderUsersList();
        if (currentUser) {
          currentUser = Storage.getUser(currentUser.username) || currentUser;
        }
      }
    }).catch(function() {
      // silent — auto-pull failures should not interrupt startup
    });
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
    el.btnExportData.addEventListener('click', exportData);
    el.importFileInput.addEventListener('change', importData);

    el.btnGistToggle.addEventListener('click', function() {
      el.gistPanel.classList.toggle('hidden');
    });
    el.btnGistSavePat.addEventListener('click', handleGistSavePat);
    el.btnGistPush.addEventListener('click', handleGistPush);
    el.btnGistPull.addEventListener('click', handleGistPull);

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
        if (currentUser) {
          Storage.saveUserSettings(currentUser.username, {
            mode:      gameSettings.mode,
            direction: gameSettings.direction,
            duration:  gameSettings.duration,
          });
        }
      });
    });
  }

  function handleKeydown(e) {
    if (!gameActive) return;
    const key = e.key;
    if (key >= '1' && key <= '8') {
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

    // Options — apply 2-column layout class for 6/8 options
    el.gameOptions.innerHTML = '';
    el.gameOptions.classList.toggle('options-2col', question.optionCount >= 6);
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
    btn.blur();
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

    // Auto-push if PAT is configured
    const gistConfig = GistSync.getConfig();
    if (gistConfig.pat) {
      Storage.bumpVersion();
      GistSync.push(Storage.load()).then(function() {
        setGistStatus('Auto-synced after game', false);
      }).catch(function() {
        // silent failure — don't interrupt summary screen
      });
    }

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

  // --- Data export / import ---
  function exportData() {
    const raw = localStorage.getItem('zerolango_v1') || '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zerolango-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.users) throw new Error('Missing "users" key in file');

        // Read existing data directly from localStorage (no dependency on Storage internals)
        var existing;
        try {
          existing = JSON.parse(localStorage.getItem('zerolango_v1'));
        } catch (_) {
          existing = null;
        }
        if (!existing || typeof existing !== 'object') existing = {};
        if (!existing.users || typeof existing.users !== 'object') existing.users = {};
        if (!existing.lastUser) existing.lastUser = null;

        var added = [];
        var skipped = [];
        var names = Object.keys(parsed.users);
        for (var i = 0; i < names.length; i++) {
          var name = names[i];
          var user = parsed.users[name];
          if (!user || typeof user !== 'object') continue;
          if (existing.users[name]) {
            skipped.push(name);
          } else {
            existing.users[name] = user;
            added.push(name);
          }
        }

        localStorage.setItem('zerolango_v1', JSON.stringify(existing));
        el.importFileInput.value = '';
        renderUsersList();
        showScreen('users');

        var parts = [];
        if (added.length) parts.push('Added: ' + added.join(', '));
        if (skipped.length) parts.push('Skipped (already exist): ' + skipped.join(', '));
        if (parts.length) alert(parts.join('\n'));
        else alert('No users found in file.');
      } catch (err) {
        alert('Import failed: ' + err.message);
        el.importFileInput.value = '';
      }
    };
    reader.readAsText(file);
  }

  // --- Gist Sync ---
  function initGistUI() {
    const config = GistSync.getConfig();
    if (config.pat) {
      el.gistPat.placeholder = 'Token saved (click Save to replace)';
    }
    if (config.gistId) {
      el.gistIdValue.textContent = config.gistId;
      el.gistIdRow.classList.remove('hidden');
    }
    if (config.lastPushedAt) {
      setGistStatus('Last pushed: ' + formatSyncTime(config.lastPushedAt), false);
    }
  }

  function handleGistSavePat() {
    const pat = el.gistPat.value.trim();
    if (!pat) {
      setGistStatus('Please enter a token.', true);
      return;
    }
    const config = GistSync.getConfig();
    GistSync.saveConfig(Object.assign({}, config, { pat: pat }));
    el.gistPat.value = '';
    el.gistPat.placeholder = 'Token saved (click Save to replace)';
    setGistStatus('Token saved.', false);
  }

  function handleGistPush() {
    const config = GistSync.getConfig();
    if (!config.pat) {
      setGistStatus('Save a GitHub token first.', true);
      return;
    }
    const raw = localStorage.getItem('zerolango_v1');
    const data = raw ? JSON.parse(raw) : { users: {} };
    el.btnGistPush.disabled = true;
    el.btnGistPush.textContent = 'Pushing…';
    GistSync.push(data).then(function() {
      const cfg = GistSync.getConfig();
      el.gistIdValue.textContent = cfg.gistId;
      el.gistIdRow.classList.remove('hidden');
      setGistStatus('Pushed at ' + formatSyncTime(cfg.lastPushedAt), false);
    }).catch(function(err) {
      setGistStatus(err.message, true);
    }).finally(function() {
      el.btnGistPush.disabled = false;
      el.btnGistPush.textContent = '↑ Push to Gist';
    });
  }

  function handleGistPull() {
    const config = GistSync.getConfig();
    if (!config.pat) {
      setGistStatus('Save a GitHub token first.', true);
      return;
    }
    el.btnGistPull.disabled = true;
    el.btnGistPull.textContent = 'Pulling…';
    GistSync.pull().then(function(result) {
      const remoteTime = new Date(result.updatedAt).toLocaleString();
      if (!confirm('Replace local data with gist version last updated ' + remoteTime + '?')) {
        setGistStatus('Pull cancelled.', false);
        return;
      }
      localStorage.setItem('zerolango_v1', JSON.stringify(result.data));
      renderUsersList();
      showScreen('users');
      setGistStatus('Pulled at ' + formatSyncTime(GistSync.getConfig().lastPulledAt), false);
    }).catch(function(err) {
      setGistStatus(err.message, true);
    }).finally(function() {
      el.btnGistPull.disabled = false;
      el.btnGistPull.textContent = '↓ Pull from Gist';
    });
  }

  function setGistStatus(msg, isError) {
    el.gistStatus.textContent = msg;
    el.gistStatus.className = 'gist-status ' + (isError ? 'status-error' : 'status-ok');
    el.gistStatus.classList.remove('hidden');
  }

  function formatSyncTime(iso) {
    return new Date(iso).toLocaleString();
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', App.init);
