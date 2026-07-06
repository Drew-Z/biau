# Assistant Studio AI Daily Implementation Plan

## Steps

1. Load relevant Studio, backend, and AI Daily specs.
2. Inspect current implementation and docs:
   - `server/src/studioRoutes.ts`
   - `src/pages/StudioPage.tsx`
   - `src/pages/StudioAiDailyIssuePage.tsx`
   - `src/data/studio.ts`
   - `scripts/check-studio-smoke.mjs`
   - `scripts/generate-ai-daily-draft.mjs`
   - `docs/content-studio.md`
   - `docs/ai-daily-pipeline.md`
   - `docs/deployment.md`
3. Run baseline `npm.cmd run studio:smoke`.
4. Identify the smallest real production-closure gap:
   - variable-boundary confusion;
   - missing safety/status wording;
   - stale smoke expectations;
   - missing manual gate record.
5. Implement one small improvement or document the closure state.
6. Re-run `studio:smoke`.
7. If code or UI changes, run:
   - `npm.cmd run server:build`
   - `npm.cmd run server:smoke`
   - `npm.cmd run assistant:service-modes-smoke`
   - `npm.cmd run lint`
   - `npm.cmd run build`
   - `npm.cmd run check:ui`
8. Run `git diff --check` and a sensitive scan before commit.

## Stop / Switch Rules

- If validation needs production Studio token, database URL, Render shell, or model calls, record it in the parent `manual-gates.md` and continue with local closure work.
- If the pipeline is already correct, produce a clear verification note instead of inventing a code change.

