const Storage = (() => {
  const KEY = 'zerolango_v1';

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY)) || { users: {}, lastUser: null, version: 0 };
      if (typeof data.version !== 'number') data.version = 0;
      return data;
    } catch (e) {
      return { users: {}, lastUser: null, version: 0 };
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function getUsers() {
    return Object.values(load().users);
  }

  function getLastUser() {
    const data = load();
    return data.lastUser ? (data.users[data.lastUser] || null) : null;
  }

  function getUser(username) {
    return load().users[username] || null;
  }

  function userExists(username) {
    return !!load().users[username];
  }

  function createUser(username) {
    const data = load();
    if (data.users[username]) return null;
    data.users[username] = {
      username,
      totalGamesPlayed: 0,
      bestScores: {
        hiragana:   { '30': 0, '60': 0, '90': 0, '120': 0 },
        katakana:   { '30': 0, '60': 0, '90': 0, '120': 0 },
        kanji:      { '30': 0, '60': 0, '90': 0, '120': 0 },
        mixed:      { '30': 0, '60': 0, '90': 0, '120': 0 },
        vocabulary: { '30': 0, '60': 0, '90': 0, '120': 0 },
        review:     { '30': 0, '60': 0, '90': 0, '120': 0 },
        emoji:      { '30': 0, '60': 0, '90': 0, '120': 0 },
      },
      lastMissed: [],
      lastSettings: { mode: 'hiragana', direction: 'roman-to-japanese', duration: 60 },
    };
    data.lastUser = username;
    save(data);
    return data.users[username];
  }

  function setLastUser(username) {
    const data = load();
    if (data.users[username]) {
      data.lastUser = username;
      save(data);
    }
  }

  function deleteUser(username) {
    const data = load();
    delete data.users[username];
    if (data.lastUser === username) {
      const remaining = Object.keys(data.users);
      data.lastUser = remaining.length > 0 ? remaining[0] : null;
    }
    save(data);
  }

  function saveGameResult(username, mode, duration, score, missedItems) {
    const data = load();
    const user = data.users[username];
    if (!user) return;
    user.totalGamesPlayed++;
    const key = String(duration);
    if (!user.bestScores[mode]) user.bestScores[mode] = { '60': 0, '90': 0, '120': 0 };
    if (score > (user.bestScores[mode][key] || 0)) {
      user.bestScores[mode][key] = score;
    }
    missedItems.forEach(function(item) {
      const idx = user.lastMissed.findIndex(function(m) { return m.character === item.character; });
      if (idx !== -1) user.lastMissed.splice(idx, 1);
      user.lastMissed.unshift(item);
    });
    user.lastMissed = user.lastMissed.slice(0, 20);
    save(data);
  }

  function getBestScore(username, mode, duration) {
    const user = getUser(username);
    if (!user) return 0;
    const scores = user.bestScores[mode];
    return scores ? (scores[String(duration)] || 0) : 0;
  }

  function saveUserSettings(username, settings) {
    const data = load();
    const user = data.users[username];
    if (!user) return;
    user.lastSettings = settings;
    save(data);
  }

  function updateCharStat(username, character, isCorrect) {
    const data = load();
    const user = data.users[username];
    if (!user) return;
    if (!user.charStats) user.charStats = {};
    if (!user.charStats[character]) user.charStats[character] = { correct: 0, wrong: 0 };
    if (isCorrect) {
      user.charStats[character].correct++;
    } else {
      user.charStats[character].wrong++;
    }
    save(data);
  }

  function getCharStats(username) {
    const user = getUser(username);
    return (user && user.charStats) ? user.charStats : {};
  }

  function bumpVersion() {
    const data = load();
    data.version = (data.version || 0) + 1;
    save(data);
    return data.version;
  }

  function mergeBestScores(a, b) {
    const merged = {};
    const modes = Object.keys(Object.assign({}, a || {}, b || {}));
    modes.forEach(function(mode) {
      merged[mode] = {};
      const durations = Object.keys(Object.assign({}, (a && a[mode]) || {}, (b && b[mode]) || {}));
      durations.forEach(function(dur) {
        const aVal = (a && a[mode] && a[mode][dur]) || 0;
        const bVal = (b && b[mode] && b[mode][dur]) || 0;
        merged[mode][dur] = Math.max(aVal, bVal);
      });
    });
    return merged;
  }

  function mergeLastMissed(a, b) {
    const seen = {};
    const merged = [];
    const combined = (b || []).concat(a || []);
    combined.forEach(function(item) {
      if (!seen[item.character]) {
        seen[item.character] = true;
        merged.push(item);
      }
    });
    return merged.slice(0, 20);
  }

  function mergeCharStats(a, b) {
    const merged = Object.assign({}, a || {});
    Object.entries(b || {}).forEach(function(entry) {
      const character = entry[0];
      const bStats = entry[1];
      if (!merged[character]) {
        merged[character] = bStats;
      } else {
        merged[character] = {
          correct: (merged[character].correct || 0) + (bStats.correct || 0),
          wrong: (merged[character].wrong || 0) + (bStats.wrong || 0),
        };
      }
    });
    return merged;
  }

  function mergeRemote(remoteData) {
    const local = load();
    const merged = {
      version: remoteData.version,
      lastUser: remoteData.lastUser || local.lastUser,
      users: Object.assign({}, local.users),
    };

    Object.entries(remoteData.users || {}).forEach(function(entry) {
      const username = entry[0];
      const remoteUser = entry[1];
      const localUser = merged.users[username];
      if (!localUser) {
        merged.users[username] = remoteUser;
        return;
      }
      merged.users[username] = {
        username: username,
        totalGamesPlayed: Math.max(localUser.totalGamesPlayed || 0, remoteUser.totalGamesPlayed || 0),
        bestScores: mergeBestScores(localUser.bestScores, remoteUser.bestScores),
        lastMissed: mergeLastMissed(localUser.lastMissed, remoteUser.lastMissed),
        lastSettings: remoteUser.lastSettings || localUser.lastSettings,
        charStats: mergeCharStats(localUser.charStats, remoteUser.charStats),
      };
    });

    save(merged);
    return merged;
  }

  return {
    load,
    save,
    getUsers,
    getLastUser,
    getUser,
    userExists,
    createUser,
    setLastUser,
    deleteUser,
    saveGameResult,
    getBestScore,
    updateCharStat,
    getCharStats,
    saveUserSettings,
    bumpVersion,
    mergeRemote,
  };
})();
