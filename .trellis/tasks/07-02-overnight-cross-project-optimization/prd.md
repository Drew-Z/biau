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

- [ ] Each attempted child task has a clear status: completed, skipped with
      blocker, or left for human review.
- [ ] Completed child tasks have validation evidence recorded in their own
      task artifacts.
- [ ] Completed Git-backed changes are committed and pushed.
- [ ] Human-review items are listed before wrap-up.
- [ ] The final session journal references the work commits and blockers.
