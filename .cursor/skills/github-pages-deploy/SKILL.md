---
name: github-pages-deploy
description: >-
  Deploy this mini-game repo to GitHub Pages by pushing to main, then verify
  the live site shows the new changes. Use after game changes, when the user
  asks to deploy, publish, or check GitHub Pages, or when finishing work on
  this project.
---

# GitHub Pages Deploy

## Site

| Item | Value |
|------|-------|
| Repo | `https://github.com/fi3ik-mme/mini-game` |
| Branch | `main` |
| Live URL | `https://fi3ik-mme.github.io/mini-game/` |

GitHub Pages serves static files from the repo root on push to `main`.

## Deploy workflow

After making changes, **always deploy AND verify** unless the user says not to.
**Verification is not optional.** Do not stop after `git push` — keep polling
until the live URL reflects the new content (or report a clear failure).

### 1. Review changes

```bash
git status
git diff
```

Do not commit `.idea/` or secrets.

### 2. Pick verification markers BEFORE pushing

Choose at least two unambiguous strings tied to the new change so step 4 has
something concrete to grep for. Good markers:

- the new `CACHE_NAME` value in `sw.js` (e.g. `mini-games-v15`)
- a brand-new DOM id, class, or button label introduced by the change
  (e.g. `reset-progress-btn`, `cheat-toggle`, `Очистити прогрес`)
- a new key in a JSON data file (e.g. `"unlock": { "type":`)

Avoid markers that already exist in the previous deploy.

### 3. Commit and push

Only commit when there are changes to ship (user asked to deploy, or deploy
is part of the task).

```bash
git add <relevant files>
git commit -m "$(cat <<'EOF'
Short summary of why.

EOF
)"
git push origin main
```

If `git push` fails with a credential error
(`could not read Username for 'https://github.com'`), STOP, report the failure
to the user, and ask them to either run `gh auth login` or run `git push`
manually. Do NOT change the remote URL or `git config` without explicit user
permission. Once the user confirms the push, return to step 4 (verification)
without re-asking — they expect verification to follow automatically.

### 4. Verify (auto, always)

Pages can take **30–120 seconds** after push. **Always run this verification
step automatically** after any successful push, even if the user did not ask
for it explicitly — the deploy is not "done" until step 4 passes.

#### 4a. Confirm origin is on the new commit

```bash
git fetch origin main
git log origin/main --oneline -1   # should match the local commit you pushed
```

#### 4b. Poll the live site for each marker

Use a single shell loop. Poll every 15 s for up to 3 minutes:

```bash
LOCAL_SHA=$(git rev-parse HEAD)
echo "Verifying live site reflects $LOCAL_SHA…"

for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  SW=$(curl -s "https://fi3ik-mme.github.io/mini-game/sw.js" | grep -E "^const CACHE_NAME" | head -1)
  HTML_HIT=$(curl -s "https://fi3ik-mme.github.io/mini-game/games/<game>/index.html" | grep -cF "<MARKER>")
  echo "[$i] sw=$SW html_hits=$HTML_HIT"
  if [ "$HTML_HIT" -gt 0 ] && echo "$SW" | grep -q "<NEW_CACHE_NAME>"; then
    echo "VERIFIED"
    break
  fi
  sleep 15
done
```

Replace `<game>`, `<MARKER>`, and `<NEW_CACHE_NAME>` with the values chosen in
step 2. If the change touches the root page, also fetch `https://fi3ik-mme.github.io/mini-game/`
and grep there.

#### 4c. Sanity-check the data file too (when JSON changed)

```bash
curl -s "https://fi3ik-mme.github.io/mini-game/games/<game>/data/<file>.json" \
  | head -20
```

### 5. Report result

Tell the user:

- the commit hash that was pushed (`git rev-parse HEAD`)
- which live URLs were fetched
- which markers were confirmed (and which were not)
- the live `CACHE_NAME` actually observed

If verification fails after retries, say push succeeded but Pages may still
be building; suggest checking the Actions tab on GitHub
(`https://github.com/fi3ik-mme/mini-game/actions`).

## Verification checklist

```
Deploy Progress:
- [ ] Verification markers chosen (sw cache name + DOM id / text)
- [ ] Changes committed
- [ ] Pushed to origin/main (or user pushed after credential failure)
- [ ] origin/main HEAD matches the local commit
- [ ] Live HTML grep finds the new marker
- [ ] Live sw.js shows the new CACHE_NAME
- [ ] User informed with commit hash + verification results
```

## Notes

- `fetch()` for local JSON requires HTTPS hosting — GitHub Pages is the
  intended runtime; do not rely on `file://`.
- Games load from paths like `/mini-game/games/<name>/index.html` — use
  relative links (`../../index.html`) in game files.
- GitHub Pages caches aggressively; the `Last-Modified` / `ETag` headers
  update within seconds of a push, but CDN edges may serve stale bodies for
  ~30 s. Always rely on grepping markers in the response body, not just
  headers.
- Even when the user only says "deploy", run verification afterwards. They
  expect it.
