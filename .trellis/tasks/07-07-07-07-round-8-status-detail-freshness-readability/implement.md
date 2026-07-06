# Status Detail Freshness Readability Implementation Plan

## Steps

1. [x] Read applicable Trellis specs before editing.
2. [x] Add a helper in `src/data/siteStatusView.ts` to parse merged synthetic freshness evidence.
3. [x] Render freshness facts/badge in `SiteStatusDetailPage`.
4. [x] Add responsive CSS for the freshness fact and badge.
5. [x] Strengthen `check:ui` to assert Legal RAG detail route exposes freshness facts when generated status data includes them.
6. [x] Run focused and broad validation.
7. [x] Update task notes, commit locally, and leave push as manual gate until SSH host key is resolved.

## Validation Candidates

- `npm.cmd run status:contract`
- `npm.cmd run check:ui`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- Targeted sensitive scan over changed files

## Manual Gates

- GitHub SSH host key verification is required before pushing local commits.
- Live model/provider prompts remain opt-in only.
- Credentialed project checks remain manual.

## Execution Notes

- `parseEvidenceFreshness()` parses only the generated low-sensitive markers `证据时间` and `证据新鲜度`.
- The page component consumes the helper and does not own the evidence parsing contract.
- `check:ui` derives expected Legal RAG freshness rows from generated status data, avoiding hardcoded synthetic counts.
- Full `verify` passed; Vite still prints the existing ineffective dynamic import warnings.
