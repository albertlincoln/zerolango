---
name: add-user-field
description: Add a new field to the ZeroLango user record with backwards compatibility
---

# Skill: Adding a field to the user record

All user data lives under the `zerolango_v1` localStorage key. The schema is defined in `src/storage/localStorage.js`.

## Steps

### 1. Add the field to createUser

In `createUser()`, add the default value to the new user object:

```js
data.users[username] = {
  username,
  totalGamesPlayed: 0,
  bestScores: { ... },
  lastMissed: [],
  lastSettings: { ... },
  charStats: {},
  myNewField: defaultValue,  // add here
};
```

### 2. Guard existing users (backwards compatibility)

Existing users in localStorage won't have your new field. Always access it defensively:

```js
// Reading
const value = user.myNewField !== undefined ? user.myNewField : defaultValue;

// Or at the top of any function that uses it:
if (!user.myNewField) user.myNewField = defaultValue;
```

### 3. Add a Storage method if needed

If other modules need to read or write the field, add a function to the Storage IIFE and expose it in the `return` object:

```js
function saveMyField(username, value) {
  const data = load();
  const user = data.users[username];
  if (!user) return;
  user.myNewField = value;
  save(data);
}

function getMyField(username) {
  const user = getUser(username);
  return user ? (user.myNewField || defaultValue) : defaultValue;
}

return {
  // ... existing exports ...
  saveMyField,
  getMyField,
};
```

### 4. Call from app.js

Storage functions are available globally as `Storage.saveMyField(...)`.

## Important notes

- **Never change the top-level key** (`zerolango_v1`). Doing so abandons all existing user data.
- If a migration is truly needed, write a one-time migration function that runs in `Storage.load()` and upgrades old records on first read.
- The `charStats` field is a good example of an additive field that was added after launch — see how `getCharStats` handles the missing-field case: `return (user && user.charStats) ? user.charStats : {}`.
