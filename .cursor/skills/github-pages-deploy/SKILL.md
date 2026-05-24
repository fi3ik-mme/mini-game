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

After making changes, **always deploy and verify** unless the user says not to.

### 1. Review changes

```bash
git status
git diff
```

Do not commit `.idea/` or secrets.

### 2. Commit and push

Only commit when there are changes to ship (user asked to deploy, or deploy is part of the task).

```bash
git add <relevant files>
git commit -m "$(cat <<'EOF'
Short summary of why.

EOF
)"
git push origin main
```

### 3. Wait for GitHub Pages

Pages can take **30–120 seconds** after push. Poll until the live page reflects the change:

```bash
# Replace MARKER with a unique string from your change (title, heading, text)
curl -s "https://fi3ik-mme.github.io/mini-game/" | grep -F "MARKER"
```

Or check `Last-Modified` header:

```bash
curl -sI "https://fi3ik-mme.github.io/mini-game/" | grep -i last-modified
```

For a specific game:

```bash
curl -s "https://fi3ik-mme.github.io/mini-game/games/maze/index.html" | grep -F "MARKER"
```

Retry every 15–30 s, up to ~3 minutes.

### 4. Report result

Tell the user:
- commit hash pushed
- live URL checked
- whether the marker / new content was found

If verification fails after retries, say push succeeded but Pages may still be building; suggest checking Actions tab on GitHub.

## Verification checklist

```
Deploy Progress:
- [ ] Changes committed
- [ ] Pushed to origin/main
- [ ] Live URL fetched
- [ ] New content/marker confirmed on GitHub Pages
```

## Notes

- `fetch()` for local JSON requires HTTPS hosting — GitHub Pages is the intended runtime; do not rely on `file://`.
- Games load from paths like `/mini-game/games/<name>/index.html` — use relative links (`../../index.html`) in game files.
