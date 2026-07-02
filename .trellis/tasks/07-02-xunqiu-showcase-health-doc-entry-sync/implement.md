# Xunqiu Showcase Health And Doc Entry Sync Implement Plan

## 1. Context

- [x] Inspect `xunqiu` inventory and showcase site.
- [x] Inspect `xunqiu-backend-modern` README, smoke script, render health path.
- [x] Inspect current `blog-semi` Xunqiu project data.

## 2. Static Showcase

- [x] Update showcase validation/deploy doc with health/smoke/cold-start boundary.
- [x] If useful, update `docs.html` or homepage copy to surface the validation doc without adding brittle production claims.

## 3. Main Site

- [x] Update Xunqiu project detail and assistant context with docs/APK/health/smoke/migration boundary.
- [x] Regenerate assistant index and sitemap if public data changes.

## 4. Validation

- [x] Static showcase link/content sanity check.
- [x] `blog-semi`: `npm.cmd run assistant:index`
- [x] `blog-semi`: `npm.cmd run sitemap:generate`
- [x] `blog-semi`: `npm.cmd run blog:check`
- [x] `blog-semi`: `npm.cmd run lint`
- [x] `blog-semi`: `npm.cmd run build`
- [x] `blog-semi`: `npm.cmd run check:ui` if visible content changes.
- [x] `git diff --check` in touched repos.
- [x] changed-file sensitive scan in touched repos.

## 5. Finish

- [ ] Commit/push showcase repo if changed.
- [ ] Commit/push `blog-semi/main`.
- [ ] Archive child task and record journal.
