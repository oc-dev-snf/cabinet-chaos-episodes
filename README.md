# Cabinet Chaos Episodes

[![Deploy snazzy pages](https://github.com/oc-dev-snf/cabinet-chaos-episodes/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/oc-dev-snf/cabinet-chaos-episodes/actions/workflows/deploy-pages.yml)
[![IssueOps episode skeleton PR](https://github.com/oc-dev-snf/cabinet-chaos-episodes/actions/workflows/issueops-episode-skeleton.yml/badge.svg)](https://github.com/oc-dev-snf/cabinet-chaos-episodes/actions/workflows/issueops-episode-skeleton.yml)

Weekly original political satire episode transcripts.

**Read online:** https://oc-dev-snf.github.io/cabinet-chaos-episodes/

---

## Repository structure

- `episodes/` → source markdown transcripts
- `web/` → GitHub Pages frontend (renders markdown)
- `.github/workflows/deploy-pages.yml` → deploys Pages on push to `main`
- `.github/workflows/issueops-auto-label.yml` → auto-labels issue-form requests
- `.github/workflows/issueops-episode-skeleton.yml` → creates draft skeleton PRs from labeled issues
- `.github/workflows/issueops-pr-review-merge.yml` → watches IssueOps PRs, marks ready when TODOs are removed, and attempts squash merge

---

## Add a new episode (manual)

1. Create a new file in `episodes/`:
   - `episodes/YYYY-MM-DD-episode-XXX-episode-slug.md`
2. Use the episode template below.
3. Commit and push to `main`.
4. Pages updates automatically.

### Episode template

```md
# THE THICK OF ITCH

**Episode:** XXX
**Title:** Episode Title
**Genre:** Original political satire

---

## COLD OPEN
...

## ACT ONE
...

## ACT TWO
...

## ACT THREE
...

## CLIMAX
...

## TAG
...

**END**
```

---

## Add a new episode (IssueOps)

Use **Issues → New issue → “Episode request”**.

Issue forms are auto-labeled `episode-request`.
When that label is present, automation creates a **draft** skeleton episode PR.

Then:
1. Open the generated PR branch.
2. Paste/write the full transcript text (remove all `TODO` markers).
3. Push changes.
4. Automation marks the PR `ready-for-review` and attempts squash merge when merge conditions are met.

---

## Notes

- Keep content original (no direct copyrighted script reuse).
- Prefer one episode per file and one commit per episode.
- IssueOps is intentionally skeleton-only (no paid external AI API calls).
- If PR creation is blocked (`GitHub Actions is not permitted to create or approve pull requests`), workflows post a fallback comment with a one-click compare URL so you can open the PR manually.
- Optional: enable **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests** for full auto PR creation.
