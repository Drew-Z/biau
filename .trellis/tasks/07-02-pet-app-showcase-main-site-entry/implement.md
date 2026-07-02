# Pet App 展示页接入主站执行清单

## 1. Context

- [x] Read `blog-semi` Trellis specs for frontend/data/static public content.
- [x] Read `pet/gamer/AGENTS.md`.
- [x] Inspect `blog-semi` and `pet/gamer` git status before edits.

## 2. Main Site

- [x] Create `/public/pet-app-showcase/` static page and CSS using existing screenshots.
- [x] Update Pet project links, detail copy, and `assistantContext`.
- [x] Add `/pet-app-showcase/` to sitemap generation.
- [x] Regenerate assistant knowledge and sitemap.

## 3. Pet Repo

- [x] Inspect dirty community API files and untracked pagination/test/output files.
- [x] Run focused tests for any kept source changes.
- [x] Remove only confirmed temporary output.
- [x] Update static showcase deployment/release notes if needed.

## 4. APK

- [x] Discover existing Android build commands and project paths.
- [x] Attempt a local APK build.
- [x] Record artifact path and checksum on success, or failure evidence and next fix on failure.

## 5. Validation

- [x] `blog-semi`: `npm.cmd run assistant:index`
- [x] `blog-semi`: `npm.cmd run sitemap:generate`
- [x] `blog-semi`: `npm.cmd run blog:check`
- [x] `blog-semi`: `npm.cmd run lint`
- [x] `blog-semi`: `npm.cmd run build`
- [x] `blog-semi`: `npm.cmd run check:ui` if the static page or project links need browser verification
- [x] `pet/gamer`: focused tests/build commands relevant to touched files
- [x] Both repos: `git diff --check`
- [x] Both repos: changed-file sensitive info scan

## 6. Finish

- [ ] Commit and push `blog-semi/main`.
- [ ] Commit and push `pet/gamer` current branch when its cleanup/build docs change.
- [ ] Archive this Trellis child task and record journal progress.
