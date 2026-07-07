# AI Daily Brief Guard Design

## Scope

Target files:

- `src/utils/studioAiDailyBrief.ts` (new)
- `src/pages/StudioAiDailyIssuePage.tsx`
- `src/styles/flow-pages.css`
- `scripts/check-studio-ai-daily-brief.ts` (new)
- `package.json`
- docs/spec updates if the contract becomes reusable.

## Design Direction

Create a utility that owns:

- `createDefaultAiDailyBrief()`
- `parseAiDailyBriefJson(text)`
- `validateAiDailyBrief(value)`
- `formatAiDailyBrief(value)`

Validation levels:

- `error`: parse failure, non-object, or missing required field that should block save.
- `warning`: field exists but is thin, such as empty arrays or very short strings.

The page should show a compact brief quality panel near the textarea. Save should still block parse errors; incomplete but parseable drafts can be saved with visible warnings because editorial work may be incremental.

## Safety

- No live model calls.
- No source fetching.
- No production token requirement.
- No private source URLs, credentials, database URLs, or model channels in examples.

## Validation

- New script check for the utility.
- `npm.cmd run studio:smoke`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
