---
name: simple-games
description: >-
  Build mini-game HTML pages with minimal complexity — one self-contained file
  per game. Use when adding or editing games in this repo, refactoring game
  structure, or when the user asks for a new mini-game.
---

# Simple Games

## Core rules

1. **Games should be as simple as possible.**
2. **Try to keep one game in one file** — a single `index.html` with inline `<style>` and `<script>`. No separate `.js` / `.css` files for game logic.
3. **Root `index.html` is the menu only** — links to games, no game logic.
4. **One directory per game** under `games/<game-name>/index.html`.
5. **No build step** — plain HTML/CSS/JS, no bundlers, no npm unless the user explicitly asks.
6. **Minimal dependencies** — prefer vanilla JS. Avoid frameworks.

## Allowed exceptions

- **JSON data files** in a `data/` subfolder when content must be loaded externally (e.g. quiz questions). Game logic still stays in the single HTML file.
- **Shared assets** (images, sounds) only when truly needed.

## Structure

```
index.html                 ← menu
games/
  maze/index.html          ← one file, all logic inline
  first-million/
    index.html             ← one file, all logic inline
    data/*.json            ← question/content data only
```

## When adding a game

1. Create `games/<name>/index.html` as a single self-contained file.
2. Add a link card on root `index.html`.
3. Add a back link to `../../index.html` from the game page.
4. Keep UI and code readable; avoid abstractions that do not serve the game.

## Anti-patterns

- Splitting one game across `game.js`, `styles.css`, `utils.js`
- Putting game logic in the root menu page
- Adding webpack, vite, or TypeScript for a simple browser game
