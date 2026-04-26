// GistSync tests with a mocked fetch.
const { test } = require('node:test');
const assert = require('node:assert');
const { createContext } = require('./helpers/loader');

function makeFetchMock() {
  const calls = [];
  let queue = [];
  const fn = (url, init) => {
    calls.push({ url, init });
    const next = queue.shift();
    if (!next) throw new Error('fetch called with no queued response: ' + url);
    return Promise.resolve({
      ok: next.ok !== false,
      status: next.status || 200,
      json: () => Promise.resolve(next.body),
    });
  };
  fn.calls = calls;
  fn.enqueue = (resp) => { queue.push(resp); return fn; };
  return fn;
}

test('getConfig returns {} when nothing stored or corrupt JSON', () => {
  let ctx = createContext();
  assert.deepEqual(ctx.GistSync.getConfig(), {});
  ctx = createContext({ localStorageSeed: { zerolango_gist: '{not json' } });
  assert.deepEqual(ctx.GistSync.getConfig(), {});
});

test('saveConfig and getConfig round-trip', () => {
  const ctx = createContext();
  ctx.GistSync.saveConfig({ pat: 'abc', gistId: 'g1' });
  assert.deepEqual(ctx.GistSync.getConfig(), { pat: 'abc', gistId: 'g1' });
});

test('push() throws when no PAT is configured', async () => {
  const ctx = createContext();
  await assert.rejects(() => ctx.GistSync.push({ users: {} }), /No GitHub token/);
});

test('push() creates a new gist when no gistId exists', async () => {
  const fetchMock = makeFetchMock().enqueue({
    ok: true,
    body: { id: 'newGist123', updated_at: '2024-01-01T00:00:00Z' },
  });
  const ctx = createContext({
    localStorageSeed: { zerolango_gist: JSON.stringify({ pat: 'tok' }) },
    fetch: fetchMock,
  });
  const result = await ctx.GistSync.push({ users: { alice: {} }, version: 1 });
  assert.equal(result.id, 'newGist123');
  assert.equal(fetchMock.calls.length, 1);
  assert.equal(fetchMock.calls[0].init.method, 'POST');
  assert.match(fetchMock.calls[0].url, /\/gists$/);
  assert.equal(fetchMock.calls[0].init.headers.Authorization, 'token tok');
  // Body contains the JSON
  const body = JSON.parse(fetchMock.calls[0].init.body);
  assert.equal(body.public, false);
  assert.ok(body.files['zerolango-data.json'].content.includes('alice'));
  // Config now has gistId and lastPushedAt
  const cfg = ctx.GistSync.getConfig();
  assert.equal(cfg.gistId, 'newGist123');
  assert.ok(cfg.lastPushedAt);
});

test('push() patches an existing gist when gistId is set', async () => {
  const fetchMock = makeFetchMock().enqueue({ ok: true, body: { id: 'g1' } });
  const ctx = createContext({
    localStorageSeed: { zerolango_gist: JSON.stringify({ pat: 'tok', gistId: 'g1' }) },
    fetch: fetchMock,
  });
  await ctx.GistSync.push({ users: {} });
  assert.equal(fetchMock.calls[0].init.method, 'PATCH');
  assert.match(fetchMock.calls[0].url, /\/gists\/g1$/);
});

test('push() surfaces server error message', async () => {
  const fetchMock = makeFetchMock().enqueue({
    ok: false, status: 401, body: { message: 'Bad credentials' },
  });
  const ctx = createContext({
    localStorageSeed: { zerolango_gist: JSON.stringify({ pat: 'tok' }) },
    fetch: fetchMock,
  });
  await assert.rejects(() => ctx.GistSync.push({}), /Bad credentials/);
});

test('push() falls back to HTTP status when error body lacks message', async () => {
  const fetchMock = makeFetchMock().enqueue({ ok: false, status: 500, body: {} });
  const ctx = createContext({
    localStorageSeed: { zerolango_gist: JSON.stringify({ pat: 'tok' }) },
    fetch: fetchMock,
  });
  await assert.rejects(() => ctx.GistSync.push({}), /HTTP 500/);
});

test('pull() throws without PAT or without gistId', async () => {
  let ctx = createContext();
  await assert.rejects(() => ctx.GistSync.pull(), /No GitHub token/);
  ctx = createContext({
    localStorageSeed: { zerolango_gist: JSON.stringify({ pat: 'tok' }) },
  });
  await assert.rejects(() => ctx.GistSync.pull(), /Push first/);
});

test('pull() returns parsed data and updates lastPulledAt', async () => {
  const remote = { users: { alice: { username: 'alice' } }, version: 3 };
  const fetchMock = makeFetchMock().enqueue({
    ok: true,
    body: {
      updated_at: '2024-02-01T00:00:00Z',
      files: { 'zerolango-data.json': { content: JSON.stringify(remote) } },
    },
  });
  const ctx = createContext({
    localStorageSeed: { zerolango_gist: JSON.stringify({ pat: 'tok', gistId: 'g1' }) },
    fetch: fetchMock,
  });
  const result = await ctx.GistSync.pull();
  assert.equal(result.updatedAt, '2024-02-01T00:00:00Z');
  assert.deepEqual(result.data, remote);
  assert.ok(ctx.GistSync.getConfig().lastPulledAt);
});

test('pull() rejects when gist file is missing', async () => {
  const fetchMock = makeFetchMock().enqueue({
    ok: true, body: { files: { 'other.json': { content: '{}' } } },
  });
  const ctx = createContext({
    localStorageSeed: { zerolango_gist: JSON.stringify({ pat: 'tok', gistId: 'g1' }) },
    fetch: fetchMock,
  });
  await assert.rejects(() => ctx.GistSync.pull(), /data file not found/);
});

test('pull() rejects on unparseable JSON', async () => {
  const fetchMock = makeFetchMock().enqueue({
    ok: true,
    body: { files: { 'zerolango-data.json': { content: '{not json' } } },
  });
  const ctx = createContext({
    localStorageSeed: { zerolango_gist: JSON.stringify({ pat: 'tok', gistId: 'g1' }) },
    fetch: fetchMock,
  });
  await assert.rejects(() => ctx.GistSync.pull(), /Could not parse gist data/);
});

test('pull() rejects when payload is missing users key', async () => {
  const fetchMock = makeFetchMock().enqueue({
    ok: true,
    body: { files: { 'zerolango-data.json': { content: JSON.stringify({ version: 1 }) } } },
  });
  const ctx = createContext({
    localStorageSeed: { zerolango_gist: JSON.stringify({ pat: 'tok', gistId: 'g1' }) },
    fetch: fetchMock,
  });
  await assert.rejects(() => ctx.GistSync.pull(), /Invalid gist data/);
});

test('checkAndAutoPull skips when no PAT or no gistId', async () => {
  let ctx = createContext();
  let r = await ctx.GistSync.checkAndAutoPull();
  assert.deepEqual(r, { action: 'skipped' });
  ctx = createContext({
    localStorageSeed: { zerolango_gist: JSON.stringify({ pat: 'tok' }) },
  });
  r = await ctx.GistSync.checkAndAutoPull();
  assert.deepEqual(r, { action: 'skipped' });
});

test('checkAndAutoPull skips when already checked today', async () => {
  const today = new Date().toDateString();
  const ctx = createContext({
    localStorageSeed: {
      zerolango_gist: JSON.stringify({ pat: 'tok', gistId: 'g1', lastAutoCheckDate: today }),
    },
  });
  const r = await ctx.GistSync.checkAndAutoPull();
  assert.deepEqual(r, { action: 'skipped' });
});

test('checkAndAutoPull merges when remote version is higher', async () => {
  const remote = {
    version: 5,
    lastUser: 'alice',
    users: {
      alice: {
        username: 'alice',
        totalGamesPlayed: 7,
        bestScores: { hiragana: { '60': 200 } },
        lastMissed: [],
        lastSettings: { mode: 'hiragana', direction: 'roman-to-japanese', duration: 60 },
        charStats: { 'あ': { correct: 3, wrong: 0 } },
        streak: 1,
        lastPracticeDate: '2024-01-01',
      },
    },
  };
  const fetchMock = makeFetchMock().enqueue({
    ok: true,
    body: {
      updated_at: '2024-02-01T00:00:00Z',
      files: { 'zerolango-data.json': { content: JSON.stringify(remote) } },
    },
  });
  const ctx = createContext({
    localStorageSeed: {
      zerolango_v1: JSON.stringify({ users: {}, lastUser: null, version: 1 }),
      zerolango_gist: JSON.stringify({ pat: 'tok', gistId: 'g1' }),
    },
    fetch: fetchMock,
  });
  const r = await ctx.GistSync.checkAndAutoPull();
  assert.equal(r.action, 'merged');
  assert.equal(r.remoteVersion, 5);
  // Local store was merged
  assert.ok(ctx.Storage.getUser('alice'));
  // lastAutoCheckDate is now set
  assert.ok(ctx.GistSync.getConfig().lastAutoCheckDate);
});

test('checkAndAutoPull reports up-to-date when local version is current or higher', async () => {
  const remote = { version: 1, users: {} };
  const fetchMock = makeFetchMock().enqueue({
    ok: true,
    body: {
      updated_at: '2024-02-01T00:00:00Z',
      files: { 'zerolango-data.json': { content: JSON.stringify(remote) } },
    },
  });
  const ctx = createContext({
    localStorageSeed: {
      zerolango_v1: JSON.stringify({ users: {}, lastUser: null, version: 5 }),
      zerolango_gist: JSON.stringify({ pat: 'tok', gistId: 'g1' }),
    },
    fetch: fetchMock,
  });
  const r = await ctx.GistSync.checkAndAutoPull();
  assert.equal(r.action, 'up-to-date');
});
