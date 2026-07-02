# 公开助手模型接入产品化执行清单

## 1. Context

- [x] Inspect current `/chat/public`, `generateAnswer`, env, and widget code.
- [x] Read backend/frontend specs relevant to assistant API and UI.

## 2. Backend

- [x] Extend `ChatResponse` meta contract.
- [x] Return answer mode/model from `generateAnswer`.
- [x] Add public chat meta in `/chat/public` and internal chat usage remains compatible.
- [x] Update env/example docs for model connection point if needed.

## 3. Frontend

- [x] Parse response `meta`.
- [x] Display assistant status and answer metadata.
- [x] Preserve no-backend local fallback.

## 4. Validation

- [x] `npm.cmd run assistant:index`
- [x] `npm.cmd run server:build`
- [x] `npm.cmd run server:smoke`
- [x] `npm.cmd run blog:check`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `npm.cmd run check:ui`
- [x] `npm.cmd run sitemap:generate`
- [x] `git diff --check`
- [x] changed-file sensitive scan

## 5. Finish

- [ ] Commit and push `blog-semi/main`.
- [ ] Archive child task and record journal.
