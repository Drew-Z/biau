# Public Blog Drafts

This folder stores reviewed Markdown drafts before they are promoted into typed blog data.

Rules:

- Drafts must be written as public technical explainers, not interview notes or private preparation material.
- Do not mention day numbers, resumes, job search, or internal study plans.
- New drafts should include an evidence pack, safe public facts, uncertain facts, forbidden/private details, model strategy, review gates, and promotion checklist.
- Draft generation writes only to `content-drafts/`; public visibility still requires explicit `blogCuration` and loader changes.
- Run `npm run blog:check` before promoting any draft into the public site.
- Keep API keys in `.env.local`; never commit local secrets.

Useful commands:

```bash
npm run blog:plan
npm run blog:model -- status --profile strong --format markdown
npm run blog:model -- doctor --profile strong --format markdown
npm run blog:draft -- --slug blog-content-system-build-log-draft --force
npm run blog:draft -- --slug blog-content-system-build-log-draft --force --generate --profile strong
npm run blog:check
```

Default `blog:draft` creates an evidence-first scaffold and does not call a model. Use `blog:model` to set up and check private model channels before `--generate`. Use `--generate` only after the evidence pack and private-detail boundary are ready. Use `--profile strong` for long-form drafting, `--profile fast` for outlines and summaries, and `--profile review` only for optional secondary review.
