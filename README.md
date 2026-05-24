# Mini Games

A small collection of browser mini-games — plain HTML, CSS, and JavaScript, no build step. Each game lives in its own folder as a single self-contained page.

## Live site

**https://fi3ik-mme.github.io/mini-game/**

## Repository

**https://github.com/fi3ik-mme/mini-game**

## Games

| Game | Description | URL |
|------|-------------|-----|
| Menu | Choose a game | [mini-game/](https://fi3ik-mme.github.io/mini-game/) |
| Лабіринт (Maze) | Find the exit as fast as you can | [games/maze/](https://fi3ik-mme.github.io/mini-game/games/maze/) |
| Перший мільйон (First Million) | Quiz in the style of “Who Wants to Be a Millionaire?” | [games/first-million/](https://fi3ik-mme.github.io/mini-game/games/first-million/) |

## Project structure

```
index.html              # main menu
games/
  maze/index.html       # maze game
  first-million/
    index.html          # quiz game
    data/*.json         # question sets
```

## Local development

Games are static files. For local preview (needed for JSON loading in the quiz):

```bash
npx serve .
```

Then open `http://localhost:3000`.

## Deploy

Push to `main` — GitHub Pages publishes automatically from the repo root.
