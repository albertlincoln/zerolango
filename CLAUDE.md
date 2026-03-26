# ZeroLango — Agent Guide

## What this project is

A single-page Japanese character matching game. No bundler, no framework. During development, open `index.html` directly in a browser. Everything is vanilla JS with global variables loaded via `<script>` tags. For deployment, use `node build.js` to bundle all scripts and styles into a single HTML file at `docs/index.html`.

---

## Architecture

### No modules — globals only

All JS files declare global variables. **Do not use `import`, `export`, or `require`.** Data files expose arrays, logic files expose IIFEs:

```js
// data file pattern
const HIRAGANA = [ ... ];

// logic file pattern
const MyModule = (() => {
  // private state
  return { publicMethod };
})();
```

### Script load order in index.html

Scripts **must** be loaded in this order or globals won't exist when needed:

```html
<script src="src/data/hiragana.js"></script>    <!-- HIRAGANA global -->
<script src="src/data/vocabulary.js"></script>   <!-- VOCABULARY global -->
<script src="src/data/katakana.js"></script>      <!-- KATAKANA global -->
<script src="src/data/kanji.js"></script>         <!-- KANJI global -->
<script src="src/storage/localStorage.js"></script> <!-- Storage global -->
<script src="src/storage/gist.js"></script>       <!-- GistSync global -->
<script src="src/game/engine.js"></script>        <!-- GameEngine global -->
<script src="src/app.js"></script>                <!-- App global -->
```

**Critical:** Whenever you add a new script file, update both `index.html` AND `build.js` to include it in the same order. The build script reads `build.js` for the definitive load order.

### Dead files — ignore these

`src/game/matcher.js`, `src/game/scoring.js`, `src/ui/components.js`, `src/ui/screens.js` are legacy stubs that are never loaded. Do not touch or reference them.

---

## File responsibilities

| File | Global | Purpose |
|------|--------|---------|
| `src/data/hiragana.js` | `HIRAGANA` | 71 hiragana entries (basic + dakuten + handakuten) |
| `src/data/katakana.js` | `KATAKANA` | 71 katakana entries (same structure) |
| `src/data/kanji.js` | `KANJI` | 50 kanji with English meanings |
| `src/data/vocabulary.js` | `VOCABULARY` | 50 vocabulary words with English meanings |
| `src/storage/localStorage.js` | `Storage` | All localStorage read/write. Single key: `zerolango_v1` |
| `src/storage/gist.js` | `GistSync` | GitHub Gist sync API (push/pull) |
| `src/game/engine.js` | `GameEngine` | Timer, question generation, weighted selection, scoring |
| `src/app.js` | `App` | Screen management, DOM wiring, all UI callbacks |
| `src/ui/styles.css` | — | All styles. Uses CSS custom properties for theming |

---

## Data format

Every item across all four datasets uses the same shape:

```js
{ character: 'あ', reading: 'a' }        // hiragana / katakana
{ character: '山', reading: 'mountain' } // kanji
{ character: 'こんにちは', reading: 'hello' } // vocabulary
```

- `character` — the Japanese side (shown or chosen depending on direction)
- `reading` — the Roman/English side (romaji for kana, English meaning for kanji/vocabulary)

The engine tags each item with `script` at runtime:

```js
Object.assign({}, item, { script: 'hiragana' }) // 'hiragana' | 'katakana' | 'kanji' | 'vocabulary'
```

`script` drives distractor selection: distractors always come from the same script as the correct answer.

---

## Storage schema

Single localStorage key: `zerolango_v1`

```json
{
  "users": {
    "alice": {
      "username": "alice",
      "totalGamesPlayed": 12,
      "bestScores": {
        "hiragana":   { "60": 120, "90": 200, "120": 350 },
        "katakana":   { "60": 0,   "90": 0,   "120": 0   },
        "kanji":      { "60": 0,   "90": 0,   "120": 0   },
        "mixed":      { "60": 0,   "90": 0,   "120": 0   },
        "vocabulary": { "60": 0,   "90": 0,   "120": 0   }
      },
      "lastMissed": [ { "character": "ぬ", "reading": "nu", "script": "hiragana" } ],
      "lastSettings": { "mode": "hiragana", "direction": "roman-to-japanese", "duration": 60 },
      "charStats": {
        "あ": { "correct": 10, "wrong": 1 },
        "ぬ": { "correct": 2,  "wrong": 5 }
      }
    }
  },
  "lastUser": "alice"
}
```

**Backwards compatibility rule:** `saveGameResult` and `getBestScore` guard against missing `bestScores[mode]` keys — new modes can be added without breaking existing user records. `charStats` may be absent on old users; always access it as `user.charStats || {}`.

---

## Game engine

`GameEngine.start(config)` accepts:

```js
{
  mode:       'hiragana',             // game mode
  direction:  'roman-to-japanese',    // or 'japanese-to-roman' | 'both'
  duration:   60,                     // seconds
  charStats:  { 'あ': { correct: 5, wrong: 1 }, ... }, // for adaptive weighting
  onTick:     fn(timeLeft),
  onQuestion: fn({ item, options, direction }),
  onAnswer:   fn({ isCorrect, correctItem, selectedItem, score, streak }),
  onEnd:      fn(results),
}
```

**Adaptive weighting** — characters the user struggles with appear more often:

| Accuracy | Weight |
|----------|--------|
| ≥ 80%    | 1 (de-emphasized) |
| 60–79%   | 2 |
| 40–59%   | 3 |
| Unseen   | 3 |
| < 40%    | 5 (reinforced) |

**Results object** returned via `onEnd`:

```js
{ score, correct, wrong, accuracy, bestStreak, missedItems, mode, duration }
```

---

## Screens

Five screens live as divs in `index.html`, shown/hidden via `.hidden` class:

| Screen ID | Name | Navigates to |
|-----------|------|-------------|
| `screen-users` | Main menu / user select | `screen-setup` |
| `screen-setup` | Game settings | `screen-game`, `screen-stats` |
| `screen-game` | Active game | `screen-summary` (auto on timer end) |
| `screen-summary` | Round results | `screen-game`, `screen-setup`, `screen-users` |
| `screen-stats` | Per-character stats | back to wherever it was opened from (`statsReturnScreen`) |

`showScreen(name)` hides all screens then reveals the named one.

---

## CSS theming

All colours are CSS custom properties. To change the look, edit variables only — never hardcode colours outside of `:root` and `html[data-theme="dark"]`.

Theme is toggled by setting `data-theme="dark"` on `<html>`. Preference is stored in `localStorage` under the key `zerolango_theme` (separate from the main data key).

The stats grid accuracy cells use hardcoded colours (`.acc-low`, `.acc-mid-low`, `.acc-mid-high`, `.acc-high`, `.unseen`). Dark mode overrides for these live at the bottom of `styles.css`.

---

## Keyboard shortcuts

During a game round, keys `1` `2` `3` `4` select the corresponding answer button.

---

## Build process

This project bundles all scripts and styles into a single HTML file for deployment.

### Development
- Edit files normally in `src/`, `index.html`, etc.
- Open `index.html` directly in a browser to test
- Cache-busting query params (`?v=2`) in script tags prevent stale JS on dev

### Deployment
Run:
```bash
node build.js
```

This:
1. Reads all scripts in the order listed in `build.js` (data files → storage → game → app)
2. Reads `src/ui/styles.css` and inlines it as `<style>`
3. Replaces all `<script src="...">` tags with a single bundled `<script>`
4. Writes to `docs/index.html`

### ⚠️ Critical: When adding new scripts

Always update **both** files in the same order:
1. `index.html` — add `<script src="...?v=2"></script>` after dependencies
2. `build.js` — add the file path to the `scripts` array in the same position

If `build.js` is out of sync with `index.html`, the bundled version will be missing code or have globals undefined at runtime.

---

## Adding content — quick reference

See `skills/add-content.md` for step-by-step guides on:
- Adding characters to an existing dataset
- Adding a brand new game mode

---

## Things to avoid

- **Don't add ES modules.** No `import`/`export`/`require`. The app has no bundler.
- **Don't reorder `<script>` tags** without checking the dependency chain above.
- **Don't add new `localStorage` keys** — all user data lives under `zerolango_v1`. Extend the user schema and guard old records.
- **Don't reference the dead stub files** (`matcher.js`, `scoring.js`, `components.js`, `screens.js`).
- **Don't hardcode colours** outside the CSS variable blocks.
- **Don't use `var` in new code** — existing code mixes `var`/`const`/`let` for historical reasons; prefer `const`/`let`.
