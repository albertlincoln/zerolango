// Storage tests: localStorage-backed user data, scores, char stats, streaks, merge.
const { test } = require('node:test');
const assert = require('node:assert');
const { createContext } = require('./helpers/loader');

function fresh() {
  return createContext();
}

test('load() returns empty default when localStorage is empty', () => {
  const { Storage } = fresh();
  const data = Storage.load();
  assert.deepEqual(data, { users: {}, lastUser: null, version: 0 });
});

test('load() returns default on corrupt JSON', () => {
  const ctx = createContext({ localStorageSeed: { zerolango_v1: '{not json' } });
  assert.deepEqual(ctx.Storage.load(), { users: {}, lastUser: null, version: 0 });
});

test('load() preserves missing version field as 0', () => {
  const ctx = createContext({
    localStorageSeed: { zerolango_v1: JSON.stringify({ users: {}, lastUser: null }) },
  });
  assert.equal(ctx.Storage.load().version, 0);
});

test('createUser creates a new user with defaults and sets lastUser', () => {
  const { Storage } = fresh();
  const u = Storage.createUser('alice');
  assert.equal(u.username, 'alice');
  assert.equal(u.totalGamesPlayed, 0);
  assert.deepEqual(u.lastMissed, []);
  assert.equal(u.streak, 0);
  assert.equal(u.lastPracticeDate, null);
  assert.deepEqual(u.lastSettings, { mode: 'hiragana', direction: 'roman-to-japanese', duration: 60 });
  // bestScores has all current modes
  for (const mode of ['hiragana', 'katakana', 'kanji', 'mixed', 'vocabulary', 'review', 'emoji']) {
    assert.ok(u.bestScores[mode], `missing bestScores.${mode}`);
    for (const dur of ['30', '60', '90', '120']) {
      assert.equal(u.bestScores[mode][dur], 0);
    }
  }
  assert.equal(Storage.getLastUser().username, 'alice');
});

test('createUser returns null for duplicate username', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  assert.equal(Storage.createUser('alice'), null);
});

test('userExists / getUser / getUsers basics', () => {
  const { Storage } = fresh();
  assert.equal(Storage.userExists('alice'), false);
  Storage.createUser('alice');
  Storage.createUser('bob');
  assert.equal(Storage.userExists('alice'), true);
  assert.equal(Storage.getUser('alice').username, 'alice');
  assert.equal(Storage.getUser('nobody'), null);
  assert.equal(Storage.getUsers().length, 2);
});

test('setLastUser only sets when the user exists', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  Storage.createUser('bob');
  Storage.setLastUser('bob');
  assert.equal(Storage.getLastUser().username, 'bob');
  Storage.setLastUser('ghost'); // no-op
  assert.equal(Storage.getLastUser().username, 'bob');
});

test('deleteUser removes user and reassigns lastUser when needed', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  Storage.createUser('bob');
  Storage.setLastUser('alice');
  Storage.deleteUser('alice');
  assert.equal(Storage.getUser('alice'), null);
  // lastUser falls back to a remaining user
  assert.equal(Storage.getLastUser().username, 'bob');
  Storage.deleteUser('bob');
  assert.equal(Storage.getLastUser(), null);
});

test('saveGameResult records a new best score and increments games played', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  Storage.saveGameResult('alice', 'hiragana', 60, 100, []);
  let u = Storage.getUser('alice');
  assert.equal(u.totalGamesPlayed, 1);
  assert.equal(u.bestScores.hiragana['60'], 100);
  // Lower score does not overwrite
  Storage.saveGameResult('alice', 'hiragana', 60, 50, []);
  u = Storage.getUser('alice');
  assert.equal(u.totalGamesPlayed, 2);
  assert.equal(u.bestScores.hiragana['60'], 100);
  // Higher score overwrites
  Storage.saveGameResult('alice', 'hiragana', 60, 250, []);
  assert.equal(Storage.getBestScore('alice', 'hiragana', 60), 250);
});

test('saveGameResult adds bestScores entry for unknown mode (forward compat)', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  // Simulate an old user record that lacks a new mode by deleting it.
  const data = Storage.load();
  delete data.users.alice.bestScores.kanji;
  Storage.save(data);
  Storage.saveGameResult('alice', 'kanji', 90, 42, []);
  assert.equal(Storage.getBestScore('alice', 'kanji', 90), 42);
});

test('saveGameResult is a no-op for unknown user', () => {
  const { Storage } = fresh();
  // Should not throw
  Storage.saveGameResult('ghost', 'hiragana', 60, 100, []);
  assert.deepEqual(Storage.load().users, {});
});

test('saveGameResult tracks lastMissed (most-recent-first, capped at 20, deduped)', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  // First batch
  Storage.saveGameResult('alice', 'hiragana', 60, 0, [
    { character: 'あ', reading: 'a', script: 'hiragana' },
    { character: 'い', reading: 'i', script: 'hiragana' },
  ]);
  let u = Storage.getUser('alice');
  // most recent (last forEach'd) is at the front
  assert.equal(u.lastMissed[0].character, 'い');
  assert.equal(u.lastMissed[1].character, 'あ');

  // Re-missing 'あ' moves it to the front (dedupe)
  Storage.saveGameResult('alice', 'hiragana', 60, 0, [{ character: 'あ', reading: 'a', script: 'hiragana' }]);
  u = Storage.getUser('alice');
  assert.equal(u.lastMissed[0].character, 'あ');
  assert.equal(u.lastMissed.filter((m) => m.character === 'あ').length, 1);

  // Cap at 20
  const big = [];
  for (let i = 0; i < 30; i++) big.push({ character: 'X' + i, reading: 'r' + i, script: 'hiragana' });
  Storage.saveGameResult('alice', 'hiragana', 60, 0, big);
  u = Storage.getUser('alice');
  assert.equal(u.lastMissed.length, 20);
});

test('getBestScore returns 0 for missing user / mode / duration', () => {
  const { Storage } = fresh();
  assert.equal(Storage.getBestScore('ghost', 'hiragana', 60), 0);
  Storage.createUser('alice');
  assert.equal(Storage.getBestScore('alice', 'newmode', 60), 0);
  assert.equal(Storage.getBestScore('alice', 'hiragana', 9999), 0);
});

test('saveUserSettings persists settings; no-op for missing user', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  Storage.saveUserSettings('alice', { mode: 'kanji', direction: 'both', duration: 120 });
  assert.deepEqual(Storage.getUser('alice').lastSettings, { mode: 'kanji', direction: 'both', duration: 120 });
  Storage.saveUserSettings('ghost', { mode: 'kanji' }); // should not throw
});

test('updateCharStat increments correct/wrong, initialises charStats lazily', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  // Ensure backwards compat: pre-existing user has no charStats
  assert.equal(Storage.getUser('alice').charStats, undefined);
  Storage.updateCharStat('alice', 'あ', true);
  Storage.updateCharStat('alice', 'あ', true);
  Storage.updateCharStat('alice', 'あ', false);
  assert.deepEqual(Storage.getCharStats('alice')['あ'], { correct: 2, wrong: 1 });
  // Unknown user
  Storage.updateCharStat('ghost', 'あ', true);
  assert.deepEqual(Storage.getCharStats('ghost'), {});
});

test('getCharStats returns empty object for missing user or no stats', () => {
  const { Storage } = fresh();
  assert.deepEqual(Storage.getCharStats('ghost'), {});
  Storage.createUser('alice');
  assert.deepEqual(Storage.getCharStats('alice'), {});
});

test('updateStreak: first call sets streak to 1', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  Storage.updateStreak('alice');
  const u = Storage.getUser('alice');
  assert.equal(u.streak, 1);
  assert.ok(u.lastPracticeDate); // YYYY-MM-DD
  assert.match(u.lastPracticeDate, /^\d{4}-\d{2}-\d{2}$/);
});

test('updateStreak: same-day re-call is a no-op', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  Storage.updateStreak('alice');
  Storage.updateStreak('alice');
  assert.equal(Storage.getUser('alice').streak, 1);
});

test('updateStreak: yesterday extends streak; gap > 2 days resets to 1', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  // Yesterday
  const yesterday = new Date(Date.now() - 86400000);
  const y = yesterday.getFullYear() + '-'
          + String(yesterday.getMonth() + 1).padStart(2, '0') + '-'
          + String(yesterday.getDate()).padStart(2, '0');
  let data = Storage.load();
  data.users.alice.lastPracticeDate = y;
  data.users.alice.streak = 5;
  Storage.save(data);
  Storage.updateStreak('alice');
  assert.equal(Storage.getUser('alice').streak, 6);

  // Long gap (10 days ago) resets streak
  const old = new Date(Date.now() - 10 * 86400000);
  const ostr = old.getFullYear() + '-'
             + String(old.getMonth() + 1).padStart(2, '0') + '-'
             + String(old.getDate()).padStart(2, '0');
  data = Storage.load();
  data.users.alice.lastPracticeDate = ostr;
  data.users.alice.streak = 99;
  Storage.save(data);
  Storage.updateStreak('alice');
  assert.equal(Storage.getUser('alice').streak, 1);
});

test('getCurrentStreak returns 0 when no practice date / stale; current streak otherwise', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  assert.equal(Storage.getCurrentStreak('alice'), 0);

  Storage.updateStreak('alice');
  assert.equal(Storage.getCurrentStreak('alice'), 1);

  // Stale (5 days ago) -> 0 even though streak field is set
  const stale = new Date(Date.now() - 5 * 86400000);
  const s = stale.getFullYear() + '-'
          + String(stale.getMonth() + 1).padStart(2, '0') + '-'
          + String(stale.getDate()).padStart(2, '0');
  const data = Storage.load();
  data.users.alice.lastPracticeDate = s;
  data.users.alice.streak = 7;
  Storage.save(data);
  assert.equal(Storage.getCurrentStreak('alice'), 0);
});

test('bumpVersion increments the data version', () => {
  const { Storage } = fresh();
  assert.equal(Storage.bumpVersion(), 1);
  assert.equal(Storage.bumpVersion(), 2);
  assert.equal(Storage.load().version, 2);
});

test('mergeRemote: adds users that exist only remotely', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  const merged = Storage.mergeRemote({
    version: 5,
    lastUser: 'bob',
    users: {
      bob: {
        username: 'bob',
        totalGamesPlayed: 3,
        bestScores: { hiragana: { '60': 50 } },
        lastMissed: [],
        lastSettings: { mode: 'hiragana', direction: 'roman-to-japanese', duration: 60 },
        charStats: {},
        streak: 2,
        lastPracticeDate: '2024-01-01',
      },
    },
  });
  assert.equal(merged.version, 5);
  assert.equal(merged.users.bob.totalGamesPlayed, 3);
  assert.ok(merged.users.alice, 'alice should be preserved');
});

test('mergeRemote: combines best scores, char stats, missed, and picks newer streak', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  // Local alice: some scores and stats
  let data = Storage.load();
  data.users.alice.bestScores.hiragana['60'] = 100;
  data.users.alice.bestScores.hiragana['90'] = 200;
  data.users.alice.charStats = { 'あ': { correct: 5, wrong: 2 } };
  data.users.alice.lastMissed = [{ character: 'い', reading: 'i', script: 'hiragana' }];
  data.users.alice.streak = 3;
  data.users.alice.lastPracticeDate = '2024-01-10';
  Storage.save(data);

  Storage.mergeRemote({
    version: 7,
    lastUser: 'alice',
    users: {
      alice: {
        username: 'alice',
        totalGamesPlayed: 99,
        bestScores: {
          hiragana: { '60': 80, '120': 300 }, // 60 lower (keep local 100), 120 new
          kanji:    { '60': 10 },              // new mode
        },
        lastMissed: [
          { character: 'う', reading: 'u', script: 'hiragana' },
          { character: 'い', reading: 'i', script: 'hiragana' }, // dup
        ],
        lastSettings: { mode: 'kanji', direction: 'both', duration: 120 },
        charStats: { 'あ': { correct: 1, wrong: 1 }, 'い': { correct: 3, wrong: 0 } },
        streak: 10,
        lastPracticeDate: '2024-01-15', // newer
      },
    },
  });
  const u = Storage.getUser('alice');
  assert.equal(u.bestScores.hiragana['60'], 100);  // max of (100, 80)
  assert.equal(u.bestScores.hiragana['90'], 200);  // local-only preserved
  assert.equal(u.bestScores.hiragana['120'], 300); // remote-only added
  assert.equal(u.bestScores.kanji['60'], 10);
  // charStats summed
  assert.deepEqual(u.charStats['あ'], { correct: 6, wrong: 3 });
  assert.deepEqual(u.charStats['い'], { correct: 3, wrong: 0 });
  // missed: deduped, remote first then local
  assert.equal(u.lastMissed.length, 2);
  assert.equal(u.lastMissed[0].character, 'う');
  assert.equal(u.lastMissed[1].character, 'い');
  // newer practice date wins streak
  assert.equal(u.streak, 10);
  assert.equal(u.lastPracticeDate, '2024-01-15');
  // remote settings win when remote provided them
  assert.deepEqual(u.lastSettings, { mode: 'kanji', direction: 'both', duration: 120 });
});

test('mergeRemote: keeps local streak when local practice date is newer', () => {
  const { Storage } = fresh();
  Storage.createUser('alice');
  let data = Storage.load();
  data.users.alice.streak = 12;
  data.users.alice.lastPracticeDate = '2024-06-01';
  Storage.save(data);
  Storage.mergeRemote({
    version: 1,
    lastUser: 'alice',
    users: {
      alice: {
        username: 'alice',
        totalGamesPlayed: 0,
        bestScores: {},
        lastMissed: [],
        lastSettings: null,
        charStats: {},
        streak: 99,
        lastPracticeDate: '2024-05-01',
      },
    },
  });
  const u = Storage.getUser('alice');
  assert.equal(u.streak, 12);
  assert.equal(u.lastPracticeDate, '2024-06-01');
});
