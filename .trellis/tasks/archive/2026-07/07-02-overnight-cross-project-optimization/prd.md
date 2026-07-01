# Overnight cross-project optimization

## Goal

Run an unattended cross-project optimization queue before 09:00 Asia/Shanghai,
prioritizing direct product experience improvements over blog generation.

The work may modify `blog-semi`, `erp`, and `pet`, with each repository
validated, committed, and pushed independently when possible. Other related
projects may be read as evidence but should not be modified unless a child task
explicitly narrows and validates that work.

## Confirmed Facts

- `D:/workspace4Cursor/blog-semi` is on `main` and clean at task creation.
- `D:/workspace4Cursor/erp` is on `codex/ozon-plugin-parity` and clean at task
  creation.
- `D:/workspace4Cursor/pet` exists but its root is not currently a Git
  repository, so Pet changes cannot use the same commit/push flow from the root.
- ERP already has `/api/auth/register`, `/api/auth/bootstrap`, frontend
  `/register`, Pinia auth registration, and production self-registration control
  through `ERP_REGISTRATION_ENABLED`.
- `blog-semi` project cards already split card detail clicks and external
  buttons on the projects page. The homepage hero card data still sends some
  project cards directly to external sites.
- Pet has existing Android/community artifacts and screenshots that can support
  a static app showcase/download page, but no public APK should be claimed
  without explicit verification.

## Child Task Map

1. `07-02-erp-auth-entry-polish` — improve ERP login/register/owner setup entry.
2. `07-02-blog-semi-home-project-card-routing` — make homepage project cards
   open local detail pages while card buttons open project sites.
3. `07-02-pet-app-showcase-download-page` — create a static Pet app
   showcase/download page with safe public assets.
4. `07-02-blog-semi-project-pages-sync` — update main-site project pages and
   assistant context for ERP and Pet changes.
5. `07-02-content-pipeline-safe-backlog` — use remaining time for safe
   draft-only blog/content improvements.

## Requirements

- R1. Work through the child tasks in queue order unless a child is blocked.
- R2. Keep sensitive operations behind human review: production registration
  enablement, real APK publishing, deployment, article publication, old content
  deletion, secrets, and production data.
- R3. Validate and commit each completed child task independently in its target
  repository when that repository supports Git.
- R4. If a repository is not a Git repository or cannot be pushed safely, record
  the limitation and continue with the next child.
- R5. Do not run destructive Git commands or modify unrelated dirty work.

## Acceptance Criteria

- [x] Each attempted child task has a clear status: completed, skipped with
      blocker, or left for human review.
- [x] Completed child tasks have validation evidence recorded in their own
      task artifacts.
- [x] Completed Git-backed changes are committed and pushed.
- [x] Human-review items are listed before wrap-up.
- [x] The final session journal references the work commits and blockers.

## Result

All five child tasks were completed and archived.

| Child task | Status | Repository / commit |
|---|---|---|
| `07-02-erp-auth-entry-polish` | Completed | `erp` `2774f3d feat(auth): polish login and registration entry` pushed to `origin/codex/ozon-plugin-parity` |
| `07-02-blog-semi-home-project-card-routing` | Completed | `blog-semi` `1f87df6 feat(home): split project card detail and site actions` pushed to `origin/main` |
| `07-02-pet-app-showcase-download-page` | Completed | `gamer` `56a1812 feat(app): add pet showcase download page` pushed to `origin/cursor-windows-migration` |
| `07-02-blog-semi-project-pages-sync` | Completed | `blog-semi` `7bbc243 feat(projects): sync erp and pet showcase updates` pushed to `origin/main` |
| `07-02-content-pipeline-safe-backlog` | Completed | `blog-semi` `e0342e0 docs(blog): record safe content backlog` pushed to `origin/main` |
| Completion audit follow-up | Completed | `blog-semi` follow-up commit records `detailLink` contract cleanup and review notes for drafts `08`-`13` |

## Human Review Items

- ERP: production self-registration remains controlled by server policy; no
  production registration switch was enabled.
- ERP: branch `codex/ozon-plugin-parity` was pushed and may need PR review
  before merge.
- Pet/Gamer: public APK download remains pending; no APK link was added.
- Pet/Gamer: branch `cursor-windows-migration` was pushed and still contains
  unrelated pre-existing dirty pagination files outside this task's commit.
- Blog: no draft was promoted, no legacy content was deleted, and no live model
  or image generation was run.
- Pet showcase: current public main site links to the GitHub showcase source;
  a live hosted showcase URL can replace it after deployment.

## Validation Summary

- ERP: `npm run build --workspace @erp/web` passed; `npm run test --workspace @erp/api` passed (`17` files, `148` tests).
- blog-semi homepage: `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui` passed after starting the expected temporary dev server.
- Pet showcase: local Playwright file checks passed on desktop and mobile; `git diff --check -- pet-app-showcase-site` passed.
- blog-semi project sync: `assistant:index`, `sitemap:generate`, `blog:check`, `lint`, and `build` passed. Build still reports existing Vite `INEFFECTIVE_DYNAMIC_IMPORT` warnings.
- Content backlog: `blog:plan`, `blog:check`, and `git diff --check` passed.
- Completion audit follow-up: `blog:check`, `lint`, `build`, and `check:ui`
  passed after aligning hero data to `detailLink` / `externalLink` and adding
  review-only notes to `content-drafts/08-*` through `13-*`.
