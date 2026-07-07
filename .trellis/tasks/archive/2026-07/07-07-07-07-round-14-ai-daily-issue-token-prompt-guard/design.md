# Design

## Scope

Modify:

- `src/pages/StudioAiDailyIssuePage.tsx`
- `scripts/check-ui.mjs`

## Approach

`StudioAiDailyIssuePage` currently returns early from its load effect when no `adminToken` exists, so the status text stays empty until the user manually clicks refresh. Add a derived display status message:

- if `statusText` is non-empty, show it;
- else if no `adminToken`, show a stable no-token prompt;
- else show nothing.

Then extend the existing `/studio/ai-daily/ui-check-issue` `check-ui` route entry with `expectedText`.

## Compatibility

The change is local UI state only. It does not change API behavior, persistence, issue readiness rules, or draft conversion.
