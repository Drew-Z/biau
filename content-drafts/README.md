# Public Blog Drafts

This folder stores reviewed Markdown drafts before they are promoted into typed blog data.

Rules:

- Drafts must be written as public technical explainers, not interview notes or private preparation material.
- Do not mention day numbers, resumes, job search, or internal study plans.
- Start each run by choosing a writing mode: `Codex-only scaffold/review`,
  `model-assisted draft/rewrite`, `review-only`, or `publish reviewed content`.
- New drafts should include an evidence pack, safe public facts, uncertain facts, forbidden/private details, model strategy, review gates, and promotion checklist.
- Draft generation writes only to `content-drafts/`; public visibility still requires explicit `blogCuration` and loader changes.
- Run `npm run blog:check` before promoting any draft into the public site.
- Keep API keys in `.env.local`; never commit local secrets.

Useful commands:

```bash
npm run blog:plan

# Codex-only scaffold/review
npm run blog:draft -- --slug blog-content-system-build-log-draft --force

# Model-assisted draft/rewrite
npm run blog:model -- setup
npm run blog:model -- status --all --format markdown
npm run blog:model -- doctor --all --format markdown
npm run blog:draft -- --slug blog-content-system-build-log-draft --force --generate --profile strong
npm run blog:draft -- --slug blog-content-system-build-log-draft --polish-from content-drafts/07-blog-content-system-build-log-draft.md --profile review
npm run blog:check
```

Default `blog:draft` creates an evidence-first scaffold and does not call a model.
Use `blog:model` to set up and check private model channels before `--generate`.
For model-assisted runs, run the guided three-profile `setup` or explicitly
confirm the selected profile before generation, then run masked offline
`status` / `doctor`. Use `--generate` only after the evidence pack and
private-detail boundary are ready and the generation step is explicitly
approved. Use `--profile strong` for the main draft, `--profile review` for
polishing, and `--profile fast` for outlines, titles, summaries, and low-risk
batch checks. Use `--polish-from content-drafts/<file>.md` when the review
profile should rewrite the existing `## Draft Body` while preserving the
evidence scaffold. Beginner setup skips temperature; use `--advanced` only when a
relay/model needs explicit sampling settings.
