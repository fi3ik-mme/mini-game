# Міні-Ігри · Українською

A small offline-first collection of Ukrainian-language browser mini-games — plain HTML, CSS, and JavaScript, no build step. Installable as a PWA on iOS, Android, and desktop.

## Live site

**https://fi3ik-mme.github.io/mini-game/**

## Games

| Game | Description | URL |
|------|-------------|-----|
| Menu | Choose a game | [mini-game/](https://fi3ik-mme.github.io/mini-game/) |
| Лабіринт (Maze) | Find the exit as fast as you can | [games/maze/](https://fi3ik-mme.github.io/mini-game/games/maze/) |
| Перший мільйон (First Million) | Quiz in the style of "Who Wants to Be a Millionaire?" | [games/first-million/](https://fi3ik-mme.github.io/mini-game/games/first-million/) |

## PWA / Offline

The site is a Progressive Web App:

- `manifest.webmanifest` — Ukrainian name (`Міні-Ігри · Українською`), icon, theme colors, standalone display, home-screen shortcuts to each game.
- `sw.js` — service worker. Pre-caches the menu, both games, the icon, and **all** quiz JSON data files on first visit, so the whole app runs offline afterwards. Navigations use network-first (so updates flow through), static assets use cache-first.
- `icon.svg` — single-file vector icon (М-monogram on a dark blue → gold gradient).

After the first visit (online) every game and every quiz question is cached locally. Users can play on a plane, on the metro, or with no data plan.

## Sharing the app with friends (email / messengers)

The menu page has a **«📤 Запросити друзів»** button that:

1. **Opens the device's native share sheet** via `navigator.share()` (iOS Safari, Android Chrome, modern Edge). The user picks Telegram, WhatsApp, Viber, SMS, email, AirDrop — whatever they have installed.
2. **Falls back to a share modal** on browsers without `navigator.share`, with direct buttons:
   - 📋 Copy link (clipboard)
   - ✉️ Email (`mailto:` with a pre-written Ukrainian invitation)
   - 💬 Telegram (`t.me/share/url`)
   - 🟢 WhatsApp (`wa.me/?text=`)
   - 🟣 Viber (`viber://forward?text=`)
   - 💌 SMS (`sms:?&body=`)
3. Includes a collapsible **«Як встановити додаток на телефон?»** help section with iOS/Android/desktop instructions in Ukrainian.

There is also a **«📲 Встановити додаток»** button that uses the Chrome/Edge `beforeinstallprompt` event to install directly on Android and desktop. On iOS, install is done manually via *Share → Add to Home Screen* (the help section explains this).

## Local development

Games are static files. For local preview (needed for JSON loading and the service worker):

```bash
npx serve .
```

Then open `http://localhost:3000`.

## Deploy

Push to `main` — GitHub Pages publishes automatically from the repo root.

```bash
git push origin main
```

When you change cached assets, bump `CACHE_NAME` in `sw.js` (e.g. `mini-games-v1` → `mini-games-v2`) so installed users pick up the new bundle on next launch.

## Tests

```bash
npm install
npx playwright install chromium
npm test              # local (starts serve on :3456)
npm run test:live     # against GitHub Pages after deploy
```
