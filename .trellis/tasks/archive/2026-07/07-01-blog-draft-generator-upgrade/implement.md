# Implementation Plan

## Checklist

- [x] Update `scripts/blog-rewrite-plan.json` with at least one new column-aware sample draft topic.
- [x] Refactor `scripts/generate-blog-draft.mjs`:
  - keep `--list`, `--slug`, `--limit`, `--force`;
  - add default scaffold generation that does not require `GEMINI_API_KEY`;
  - add column-aware templates and frontmatter;
  - keep optional model generation behind an explicit flag if practical.
- [x] Update `scripts/check-public-blog.mjs` so new evidence-first drafts pass and old drafts remain acceptable.
- [x] Update `content-drafts/README.md` and, if useful, `content-drafts/blog-rewrite-workflow.md`.
- [x] Generate one sample draft with `npm.cmd run blog:draft -- --slug <sample> --force`.
- [x] Verify no public blog data files are modified by draft generation.
- [x] Run validation commands.

## Validation Commands

```powershell
npm.cmd run blog:plan
npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft --force
npm.cmd run blog:check
npm.cmd run lint
npm.cmd run build
```

Attempt broad verification if time permits:

```powershell
npm.cmd run verify
```

## Risk Points

- `content-drafts/` already has old drafts. The checker should not fail old drafts simply because they lack the new evidence-pack sections.
- `scripts/blog-rewrite-plan.json` may be used by existing commands. Preserve backward compatibility for old fields.
- Do not accidentally load or print secrets from `.env.local`.
- Do not modify public blog curation, assistant index, or sitemap for draft-only work.

## Done When

- The draft command can produce a reviewed scaffold without a model key.
- The scaffold includes column, evidence pack, model strategy, review gates, and promotion checklist.
- The checker validates the new structure and still passes the current draft folder.

## Verification Results

- `npm.cmd run blog:plan` passed and lists column-aware draft topics.
- `npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft --force` passed and generated `content-drafts/07-blog-content-system-build-log-draft.md`.
- `npm.cmd run blog:check` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run verify` passed.
- `git diff --name-only -- src/data server/data public/sitemap.xml` returned no changed public blog, assistant index, or sitemap paths.
