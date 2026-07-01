# Design

## Approach

Use the existing upgraded draft pipeline:

- Add `project-notes` entries to `scripts/blog-rewrite-plan.json`.
- Use `npm.cmd run blog:draft -- --slug <slug> --force` to generate evidence-first scaffolds under `content-drafts/`.
- Keep all outputs hidden draft material; do not register loaders or curation.

## Evidence Collection

For each project, collect high-signal evidence from local project folders:

- root file list and workspace/package metadata
- source directories and route/module names
- tests, smoke scripts, deploy scripts, CI/config files
- docs and ADR/task notes when present
- current main-site `src/data/portfolio.ts` detail content as public wording reference

Avoid reading sensitive files such as `.env`, `.env.local`, private keys, certificates, signing files, SSH material, or deployment secrets.

## Draft Topics

First batch topics:

- `legal-rag-project-notes-draft`
- `ozon-erp-project-notes-draft`
- `xunqiu-modernization-project-notes-draft`
- `playlab-games-project-notes-draft`
- `pet-workspace-project-notes-draft`
- `blog-semi-project-notes-draft`

All use `column: "project-notes"` and the default scaffold flow.

## Safety Boundary

This task does not change public content surfaces:

- no `src/data/blog.ts`
- no `src/data/blog-posts/*.ts`
- no `src/data/blogContent.ts`
- no `src/data/blogCuration.ts`
- no `server/data/public-knowledge.json`
- no `public/sitemap.xml`

The generated drafts can mention local evidence source paths as authoring references, but the later public article must sanitize or omit local paths where needed.

## Validation

Validation focuses on draft correctness and public-surface isolation:

- `npm.cmd run blog:plan`
- `npm.cmd run blog:draft -- --slug <each slug> --force`
- `npm.cmd run blog:check`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --name-only -- src/data server/data public/sitemap.xml`
