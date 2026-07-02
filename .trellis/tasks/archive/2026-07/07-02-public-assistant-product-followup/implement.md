# 公开助手产品体验与模型接入落地补强执行清单

## 1. Context

- [x] Inspect current archived public assistant task.
- [x] Read backend/frontend specs relevant to env, assistant API, type contracts, and UI.
- [x] Inspect current `server/src/env.ts`, `server/src/model.ts`, `server/src/app.ts`, `server/src/types.ts`, `src/components/PublicAssistantWidget.tsx`, and assistant CSS.

## 2. Backend

- [x] Add preferred `ASSISTANT_MODEL_*` env contract with `OPENAI_*` compatibility.
- [x] Return sanitized provider/model/reason metadata from `generateAnswer`.
- [x] Keep public/internal chat response compatibility.
- [x] Update smoke expectations only if the public meta contract changes.

## 3. Frontend

- [x] Parse provider/reason meta defensively.
- [x] Improve public assistant trigger/header/status/intro copy.
- [x] Improve per-answer trust meta and error/fallback copy.
- [x] Adjust CSS for professional compact layout and mobile safety.

## 4. Docs

- [x] Update `.env.example` with preferred public assistant model variables and no real secrets.

## 5. Validation

- [x] `npm.cmd run assistant:index`
- [x] `npm.cmd run server:build`
- [x] `npm.cmd run server:smoke`
- [x] `npm.cmd run blog:check`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `npm.cmd run check:ui` if affected selectors/layout need screenshot-level validation
- [x] `git diff --check`
- [x] changed-file sensitive scan

## 6. Finish

- [ ] Commit and push `blog-semi/main`.
- [ ] Archive child task and record journal.
