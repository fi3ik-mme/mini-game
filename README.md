# Mini Games

A small collection of browser mini-games — plain HTML, CSS, and JavaScript, no build step. Each game lives in its own folder as a single self-contained page.

## Live site

**https://fi3ik-mme.github.io/mini-game/**

## Games

| Game | Description | URL |
|------|-------------|-----|
| Menu | Choose a game | [mini-game/](https://fi3ik-mme.github.io/mini-game/) |
| Лабіринт (Maze) | Find the exit as fast as you can | [games/maze/](https://fi3ik-mme.github.io/mini-game/games/maze/) |
| Перший мільйон (First Million) | Quiz in the style of “Who Wants to Be a Millionaire?” | [games/first-million/](https://fi3ik-mme.github.io/mini-game/games/first-million/) |

## Local development

Games are static files. For local preview (needed for JSON loading in the quiz):

```bash
npx serve .
```

Then open `http://localhost:3000`.

## Deploy

Push to `main` — GitHub Pages publishes automatically from the repo root.

```bash
git push origin main
```

## Tests

```bash
npm install
npx playwright install chromium
npm test              # local (starts serve on :3456)
npm run test:live     # against GitHub Pages after deploy
```
