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

## Android binary (.apk)

A pre-built signed Android APK is committed at [`download/mini-games.apk`](./download/mini-games.apk). It targets a **wide range of devices** (`minSdkVersion=21`, i.e. Android 5.0 Lollipop and up) and the **latest Android versions** (`targetSdkVersion=35`, Android 15). The current published version is tracked in [`release.json`](./release.json).

Under the hood it is a Trusted Web Activity (TWA) generated with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). The APK is a thin shell that opens the same live PWA at `https://fi3ik-mme.github.io/mini-game/` in a full-screen WebView — so once installed, every subsequent push to GitHub Pages auto-updates the app the next time the user opens it.

### Build the APK locally

Prerequisites (one-time, macOS):

```bash
brew install openjdk@17

# Download Android command-line tools, place at $HOME/Android/sdk/cmdline-tools/latest/
# https://developer.android.com/studio#command-line-tools-only

export JAVA_HOME=/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=$HOME/Android/sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# Bubblewrap looks for $ANDROID_HOME/bin (old layout); add a symlink:
ln -sf cmdline-tools/latest/bin $ANDROID_HOME/bin
```

Then, from the repo root:

```bash
npm install
npm run build:android
```

This single command:

1. Spins up a tiny local HTTP server so the build can read `manifest.webmanifest` and `icon.svg` without depending on the live site,
2. Generates the TWA Android project into `android/` (gitignored),
3. Reuses the signing keystore at `signing/release.keystore` (or generates one on first run),
4. Runs `gradle assembleRelease`, zipaligns and signs the APK,
5. Copies the final signed APK to `download/mini-games.apk`.

> The default keystore at `signing/release.keystore` uses password `minigames` (key alias `android`, key password `minigames`). It is committed for reproducible signing; **do not reuse it for a Play Store release** — generate a fresh one and override via `BUBBLEWRAP_KEYSTORE_PASSWORD` and `BUBBLEWRAP_KEY_PASSWORD` env vars.

### Installing the APK on a phone

1. On the phone, open the live site and tap **«🤖 Завантажити для Android»** to download `mini-games.apk`.
2. Open the downloaded file.
3. If Android blocks "unknown sources", allow this one-time install in *Settings → Security* (or use the per-app toggle Android offers on the install dialog).
4. Done — the icon **Міні-Ігри** appears in the launcher.

### How the app updates itself

The Mini-Games app has **two independent update layers**, and you almost never need to think about either of them:

1. **Web content (instant, automatic).** Because the APK is a TWA shell that loads the live PWA, every push to `main` ships immediately to every installed app the next time it goes online. The service worker downloads the new bundle in the background and shows the "✨ Доступна нова версія / Оновити" banner at the bottom of the screen. A single tap reloads the page on the new version. Everything keeps working offline either way.

2. **The APK itself (semi-automatic).** Some changes can only ship by reinstalling the APK — e.g. new Android permissions, a bumped `targetSdkVersion`, a new icon, or a new launcher name. For these the build script bakes the version into the start URL (`?src=apk&av=N`) and publishes a `release.json` at the site root. The installed app polls `release.json` on launch / when the network comes back / when the tab is refocused, and if the published `versionCode` is greater than the installed one it shows a green **«🚀 Доступна нова версія додатка»** card on the main menu. Tapping **«Завантажити та оновити»** downloads the signed APK; Android opens the package installer and — because the new APK uses the same `packageId` and signature — offers a one-tap *Update* (the user does not have to uninstall first, and all `localStorage` progress is kept).

> Fully silent install (true OS-level auto-update) is only possible via the Play Store or a Device Owner / MDM. Side-loaded APKs always require one explicit user tap to confirm the install, which is what the green update card streamlines.

### Releasing a new APK

1. Open `scripts/build-android.mjs` and bump the two constants at the top:

   ```js
   const APP_VERSION_CODE = 3;        // monotonic integer
   const APP_VERSION_NAME = "1.2.0";  // any semver-like string
   const RELEASE_NOTES    = "Що нового у цій версії…";
   ```

2. Run `npm run build:android`. This rebuilds `download/mini-games.apk` and overwrites `release.json` with the new version metadata.
3. Commit both files (`download/mini-games.apk`, `release.json`) and push to `main`. Every installed APK that has the older `versionCode` will see the update card on its next online launch.

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
