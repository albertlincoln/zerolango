---
name: add-content
description: Add characters to an existing dataset or create a new game mode in ZeroLango
---

# Skill: Adding content to ZeroLango

## Adding items to an existing dataset

Each dataset is a plain JS array of `{ character, reading }` objects in its own file under `src/data/`.

| Mode | File | Global |
|------|------|--------|
| Hiragana | `src/data/hiragana.js` | `HIRAGANA` |
| Katakana | `src/data/katakana.js` | `KATAKANA` |
| Kanji | `src/data/kanji.js` | `KANJI` |
| Vocabulary | `src/data/vocabulary.js` | `VOCABULARY` |

**Format:**
```js
{ character: 'あ', reading: 'a' }           // kana — reading is romaji
{ character: '山', reading: 'mountain' }    // kanji — reading is primary English meaning
{ character: 'こんにちは', reading: 'hello' } // vocabulary — reading is English meaning
```

**Rules:**
- `reading` values must be unique within a dataset — they are used as answer options and duplicates will cause confusing distractor collisions.
- For kanji, use the most common single English word. Avoid phrases where possible.
- For vocabulary, readings can be short phrases (e.g. `'every day'`, `'train station'`).
- The `script` tag (`{ script: 'hiragana' }` etc.) is added by the engine at runtime — do not include it in the source data.

**Steps:**
1. Open the relevant data file.
2. Append entries to the array.
3. Open `index.html` and verify the correct `<script>` tag is already present (it will be).
4. If adding to the stats screen, no further changes are needed — the stats grid iterates the full array automatically.

---

## Adding a brand new game mode

A "mode" is a named pool of items. Adding one requires changes in four places.

### 1. Create the data file

Create `src/data/<modename>.js`:

```js
const MYMODE = [
  { character: '...', reading: '...' },
  // minimum ~10 items (need at least 4 for distractor generation)
];
```

### 2. Load it in index.html

Add a `<script>` tag **before** `src/storage/localStorage.js`:

```html
<script src="src/data/mymode.js"></script>
```

### 3. Register it in the engine (`src/game/engine.js`)

In `buildPool(mode)`, add a branch:
```js
if (mode === 'mymode') return MYMODE.map(function(item) {
  return Object.assign({}, item, { script: 'mymode' });
});
```

In `getScriptPool(script)`, add the same branch (used for distractor selection):
```js
if (script === 'mymode') return MYMODE.map(function(item) {
  return Object.assign({}, item, { script: 'mymode' });
});
```

### 4. Add to storage (`src/storage/localStorage.js`)

In `createUser`, add the new mode to `bestScores`:
```js
mymode: { '60': 0, '90': 0, '120': 0 },
```

The `saveGameResult` function already guards against missing keys, so existing users won't break:
```js
if (!user.bestScores[mode]) user.bestScores[mode] = { '60': 0, '90': 0, '120': 0 };
```

### 5. Wire up the UI (`index.html` + `src/app.js`)

In `index.html`, add a toggle button in `#mode-options`:
```html
<button class="toggle-btn" data-value="mymode">My Mode</button>
```

Add a stats tab in `#screen-stats .stats-tabs`:
```html
<button class="stats-tab" data-script="mymode">My Mode</button>
```

In `src/app.js`, update `renderStatsGrid` to map the new mode to its data array:
```js
else if (script === 'mymode') items = MYMODE;
```

If the mode's `character` values are long strings (like vocabulary), also add the `stat-cell--vocab` class:
```js
const vocabClass = (script === 'vocabulary' || script === 'mymode') ? ' stat-cell--vocab' : '';
```

And update `renderQuestion` if the prompt needs a different CSS class or direction hint text.

### 6. Check the prompt display

In `renderQuestion` in `src/app.js`:
- If Japanese characters are single glyphs → use `prompt-character` (6rem font)
- If Japanese text is multi-character words → use `prompt-vocab` (2.25rem font)
- Update the hint text logic if needed

---

## Checklist

- [ ] Data file created with unique `reading` values
- [ ] `<script>` tag added to `index.html` before `localStorage.js`
- [ ] `buildPool` branch added in `engine.js`
- [ ] `getScriptPool` branch added in `engine.js`
- [ ] `bestScores` initialised in `createUser` in `localStorage.js`
- [ ] Toggle button added to `#mode-options` in `index.html`
- [ ] Stats tab added to `#screen-stats` in `index.html`
- [ ] `renderStatsGrid` updated in `app.js`
- [ ] Prompt CSS class appropriate for item length
