const GistSync = (() => {
  const CONFIG_KEY = 'zerolango_gist';
  const FILENAME = 'zerolango-data.json';
  const API = 'https://api.github.com';

  function getConfig() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  async function push(data) {
    const config = getConfig();
    if (!config.pat) throw new Error('No GitHub token configured.');

    const content = JSON.stringify(data, null, 2);
    const headers = {
      'Authorization': 'token ' + config.pat,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    let res;
    if (config.gistId) {
      res = await fetch(API + '/gists/' + config.gistId, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ files: { [FILENAME]: { content } } }),
      });
    } else {
      res = await fetch(API + '/gists', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          description: 'ZeroLango save data',
          public: false,
          files: { [FILENAME]: { content } },
        }),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(function() { return {}; });
      throw new Error(err.message || 'GitHub API error (HTTP ' + res.status + ')');
    }

    const gist = await res.json();
    saveConfig(Object.assign({}, config, {
      gistId: gist.id,
      lastPushedAt: new Date().toISOString(),
    }));
    return gist;
  }

  async function pull() {
    const config = getConfig();
    if (!config.pat) throw new Error('No GitHub token configured.');
    if (!config.gistId) throw new Error('No gist saved yet. Push first to create one.');

    const res = await fetch(API + '/gists/' + config.gistId, {
      headers: {
        'Authorization': 'token ' + config.pat,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(function() { return {}; });
      throw new Error(err.message || 'GitHub API error (HTTP ' + res.status + ')');
    }

    const gist = await res.json();
    const file = gist.files[FILENAME];
    if (!file) throw new Error('ZeroLango data file not found in gist.');

    let data;
    try {
      data = JSON.parse(file.content);
    } catch (e) {
      throw new Error('Could not parse gist data: ' + e.message);
    }
    if (!data.users) throw new Error('Invalid gist data (missing users key).');

    saveConfig(Object.assign({}, config, { lastPulledAt: new Date().toISOString() }));
    return { data: data, updatedAt: gist.updated_at };
  }

  async function checkAndAutoPull() {
    const config = getConfig();
    if (!config.pat || !config.gistId) return { action: 'skipped' };

    const today = new Date().toDateString();
    if (config.lastAutoCheckDate === today) return { action: 'skipped' };

    const result = await pull();
    saveConfig(Object.assign({}, getConfig(), { lastAutoCheckDate: today }));

    const localData = JSON.parse(localStorage.getItem('zerolango_v1') || '{}');
    const localVersion = localData.version || 0;
    const remoteVersion = result.data.version || 0;

    if (remoteVersion > localVersion) {
      Storage.mergeRemote(result.data);
      return { action: 'merged', remoteVersion: remoteVersion };
    }
    return { action: 'up-to-date', remoteVersion: remoteVersion };
  }

  return { getConfig: getConfig, saveConfig: saveConfig, push: push, pull: pull, checkAndAutoPull: checkAndAutoPull };
})();
