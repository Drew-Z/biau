# Implementation Plan

## Checklist

- [x] Collect evidence snapshots from the six project roots without reading secret files.
- [x] Add six `project-notes` topics to `scripts/blog-rewrite-plan.json`.
- [x] Generate six draft scaffolds with `blog:draft`.
- [x] Inspect generated drafts for `column: "project-notes"`, evidence pack, safe facts, uncertain facts, forbidden details, and roadmap/next iteration language.
- [x] Run validation commands.
- [x] Confirm public blog/assistant/sitemap data are unchanged.

## Commands

```powershell
npm.cmd run blog:plan
npm.cmd run blog:draft -- --slug legal-rag-project-notes-draft --force
npm.cmd run blog:draft -- --slug ozon-erp-project-notes-draft --force
npm.cmd run blog:draft -- --slug xunqiu-modernization-project-notes-draft --force
npm.cmd run blog:draft -- --slug playlab-games-project-notes-draft --force
npm.cmd run blog:draft -- --slug pet-workspace-project-notes-draft --force
npm.cmd run blog:draft -- --slug blog-semi-project-notes-draft --force
npm.cmd run blog:check
npm.cmd run lint
npm.cmd run build
git diff --name-only -- src/data server/data public/sitemap.xml
```

## Results

- Added research notes at `research/evidence-snapshots.md`, including local project evidence and external blog/content-pipeline references found through `smart-search`.
- Added six `project-notes` plan entries:
  - `legal-rag-project-notes-draft`
  - `ozon-erp-project-notes-draft`
  - `xunqiu-modernization-project-notes-draft`
  - `playlab-games-project-notes-draft`
  - `pet-workspace-project-notes-draft`
  - `blog-semi-project-notes-draft`
- Generated six draft scaffolds under `content-drafts/08-*` through `content-drafts/13-*`.
- Verified the generated drafts contain `column: "project-notes"`, evidence-pack sections, forbidden/private details, review gates, promotion checklist, and next-iteration language.
- `Pet Workspace` draft explicitly marks the project as WIP/current work and forbids presenting it as a finished public platform.

## Validation Results

- `npm.cmd run blog:plan` passed.
- Six `npm.cmd run blog:draft -- --slug <slug> --force` commands passed.
- `npm.cmd run blog:check` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `git diff --name-only -- src/data server/data public/sitemap.xml` returned no changed files.
- Build produced existing Vite `INEFFECTIVE_DYNAMIC_IMPORT` warnings for `blogCuration.ts` and `portfolio.ts`; no failure.

## Evidence Roots

- `D:\workspace4Cursor\legal-rag`
- `D:\workspace4Cursor\erp`
- `D:\workspace4Codex\xunqiu`
- `D:\workspace4Codex\xunqiu-backend-modern`
- `D:\workspace4Cursor\game`
- `D:\workspace4Cursor\pet`
- `D:\workspace4Cursor\blog-semi`

## Risk Points

- Do not read or quote `.env*`, `*.pem`, `*.key`, `*.p12`, signing material, or SSH files.
- Do not infer deployment state from stale docs alone; mark uncertain claims as uncertain.
- Do not turn draft evidence into public article metadata in this task.
