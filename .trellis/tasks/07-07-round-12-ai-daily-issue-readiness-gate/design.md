# Design

## Scope

Strengthen the AI Daily issue readiness path around:

- `src/utils/studioAiDailyBrief.ts`
- `src/pages/StudioAiDailyIssuePage.tsx`
- `server/src/studioRoutes.ts`
- `scripts/check-studio-ai-daily-brief.ts`
- `.trellis/spec/backend/ai-daily-workflow.md`

## Readiness Contract

An issue is review-ready only when:

- the brief JSON is a valid object with `summary`, `publicAngle`, `keySignals`, and `toVerify`;
- brief fields are not only structurally present, but carry enough editorial substance;
- at least one selected source exists;
- selected sources have public URLs, titles, source names, and useful summaries;
- source-card evidence can be carried into the hidden review draft.

The UI may show warnings for thin but editable states. The API must block transitions into review-ready states when readiness has errors.

Review-ready statuses for this task:

- `review-needed`
- `approved`
- `published`

## Frontend

Add a small readiness helper beside the existing brief helper so the page can combine:

- parsed brief validation;
- ordered selected sources;
- progression intent: save, enter review, convert.

The page should keep normal save behavior available for incremental editing, but disable:

- `进入审核`;
- `转为内容草稿`;

when readiness has blocking errors.

## Backend

Keep the server-side validation local to `studioRoutes.ts` to avoid widening build boundaries between the frontend Vite app and the server package.

`PATCH /ai-daily/issues/:id` should:

- continue validating source IDs before saving;
- if the target status is review-ready, load the selected sources from the new or existing issue state;
- evaluate brief + source readiness;
- return `409 { error: "ai-daily-issue-not-ready", issues: [...] }` when blocked.

`POST /ai-daily/issues/:id/content-draft` should keep the no-source gate and hidden review draft contract. If a linked or duplicate AI Daily draft already exists, the endpoint may keep returning the existing draft detail.

## Compatibility

- Existing draft creation stays model-free and hidden.
- Editors can still save incomplete issues in non-review statuses.
- Error code mapping should provide a friendly frontend message without exposing backend stack traces.

## Risks

- Duplicating frontend/server readiness logic can drift. Mitigate with matching deterministic check cases and spec notes.
- Overblocking incremental editing would hurt the Studio workflow. Only block review/draft progression.
