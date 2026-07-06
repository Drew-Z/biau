# Project Visual Semantics Guard Implementation Plan

## Steps

1. [x] Read applicable Trellis specs before editing.
2. [x] Add a public-safe Space War workflow SVG under `public/images/projects/showcase/`.
3. [x] Add the workflow visual to Space War detail content in `src/data/portfolio.ts`.
4. [x] Strengthen `scripts/check-project-detail-evidence.ts` to require screenshot + structural visual composition.
5. [x] Update `docs/showcase-assets.md` and frontend spec if the rule is reusable.
6. [x] Run focused and broad validation.
7. [x] Update task notes and commit locally; keep push as manual gate.

## Validation Candidates

- `npm.cmd run project-details:check`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`
- Targeted sensitive scan over `portfolio.ts`, the check script, docs, and SVG.

## Manual Gates

- GitHub SSH host key verification remains required before pushing.
- Replacing runtime screenshots with fresher captures from related projects is a follow-up manual/asset task if it needs running those apps.

## Execution Notes

- Initial visual type audit showed only Space War lacked a structural visual under the new composition rule.
- New Space War diagram is SVG and explicitly labeled as a public playable-loop explanation, not a live deployment topology or analytics chart.
- Full `verify` passed; Vite still prints the existing ineffective dynamic import warnings.
