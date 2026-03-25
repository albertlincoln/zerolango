const Storage = (() => {
  const KEY = 'zerolango_v1';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { users: {}, lastUser: null };
    } catch (e) {
      return { users: {}, lastUser: null };
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
  };
})();
