---
name: add-screen
description: Add a new screen to ZeroLango
---

# Skill: Adding a new screen

ZeroLango uses a simple show/hide screen system. All screens exist as divs in `index.html` and are toggled via the `.hidden` CSS class.

## Steps

### 1. Add the HTML div in index.html

```html
<!-- Screen: My New Screen -->
<div id="screen-myscreen" class="screen hidden">
  <div class="screen-content">
    <div class="screen-nav">
      <button id="btn-back-from-myscreen" class="btn-back">← Back</button>
      <span class="current-user-label" id="myscreen-username-label"></span>
    </div>
    <h2>My Screen Title</h2>
    <!-- content here -->
  </div>
</div>
```

Place it before the closing `</div>` of `#app`.

### 2. Register it in App's screen map (`src/app.js`)

In `init()`, add the screen to `el.screens`:

```js
el.screens = {
  users:    document.getElementById('screen-users'),
  setup:    document.getElementById('screen-setup'),
  game:     document.getElementById('screen-game'),
  summary:  document.getElementById('screen-summary'),
  stats:    document.getElementById('screen-stats'),
  myscreen: document.getElementById('screen-myscreen'), // add this
};
```

### 3. Cache any interactive elements

Still in `init()`, cache DOM refs:

```js
el.btnBackFromMyscreen = document.getElementById('btn-back-from-myscreen');
el.myscreenUsername    = document.getElementById('myscreen-username-label');
```

### 4. Bind events in bindEvents()

```js
el.btnBackFromMyscreen.addEventListener('click', function() { showScreen('setup'); });
```

### 5. Add a show function

```js
function showMyScreen() {
  el.myscreenUsername.textContent = currentUser ? currentUser.username : '';
  // populate content here
  showScreen('myscreen');
}
```

### 6. Add navigation to the screen from wherever triggers it

For example, adding a button to the setup screen:

```html
<!-- index.html, inside screen-setup -->
<button id="btn-open-myscreen" class="btn-secondary">Open My Screen</button>
```

```js
// app.js bindEvents()
document.getElementById('btn-open-myscreen').addEventListener('click', showMyScreen);
```

## Notes

- `showScreen(name)` hides **all** registered screens then shows the named one. Any screen not in `el.screens` will not be hidden — always register new screens.
- The `.screen` CSS class sets `min-height: 100vh` and a fade-in animation. Use `.screen-content` inside for the max-width centred layout.
- If the screen can be reached from multiple places and needs a smart back button, use the same `returnScreen` variable pattern used by the stats screen (`statsReturnScreen`).
