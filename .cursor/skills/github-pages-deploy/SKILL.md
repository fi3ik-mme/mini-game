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

### 3. Commit and push (agent does this — do NOT ask the user to push)

When the user says **«реліз»**, **release**, **deploy**, or **publish**, the
agent must **commit (if needed) and push to `origin/main` itself**. Pushing is
part of the release task, not a hand-off to the user.

Only commit when there are changes to ship.

```bash
git add <relevant files>
git commit -m "$(cat <<'EOF'
Short summary of why.

EOF
)"
```

#### 3a. Push autonomously (try every method below before giving up)

Run push with **full shell permissions** (not sandboxed) so macOS keychain /
`gh` credentials can be used.

**Order of attempts:**

1. **Plain push**
   ```bash
   git push origin main
   ```

2. **`gh` as Git credential helper** (preferred when `gh` is logged in)
   ```bash
   gh auth status          # must show "Logged in"
   gh auth setup-git       # wires gh into git for HTTPS
   git push origin main
   ```

3. **Token from environment** (CI / user shell profile)
   ```bash
   # If GH_TOKEN or GITHUB_TOKEN is set:
   git push https://x-access-token:${GH_TOKEN:-$GITHUB_TOKEN}@github.com/fi3ik-mme/mini-game.git main
   ```

4. **Confirm whether anything actually reached GitHub**
   ```bash
   git fetch origin main
   git rev-parse HEAD
   git rev-parse origin/main   # must equal local HEAD after a successful push
   curl -s https://api.github.com/repos/fi3ik-mme/mini-game/commits/main \
     | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>console.log(JSON.parse(s).sha?.slice(0,7)))'
   ```

**Do NOT** change `git remote` URL or run `git config` without explicit user
permission — except `gh auth setup-git`, which only configures the credential
helper for `gh`.

**Only if all push attempts fail:** tell the user push could not run from this
environment, show `git log origin/main..HEAD --oneline` (what is waiting), and
ask them to run **once** in their terminal:

```bash
gh auth login    # GitHub.com → HTTPS → web browser (one-time setup)
git push origin main
```

After they confirm «пушнув», **immediately** continue to step 4 (verification)
without re-asking.

**Never** stop at «please push yourself» on the first credential error without
trying steps 2–4 above.

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
