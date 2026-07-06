# Reliability Status and Synthetic Checks Implementation Plan

## Steps

1. Load `trellis-before-dev` and relevant frontend/backend quality specs.
2. Inspect current status data and synthetic scripts:
   - `src/data/statusTargets.ts`
   - `scripts/check-reliability-suite.mjs`
   - `scripts/generate-site-status.ts`
   - `scripts/check-*-synthetic.mjs`
   - `public/status/*`
3. Run baseline commands:
   - `npm.cmd run site:status`
   - `npm.cmd run reliability:check`
4. Identify the smallest real mismatch between status data, generated JSON, and project facts.
5. Implement one aligned improvement.
6. Re-run affected commands plus `git diff --check`.
7. If UI/data changed, run `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui`.

## Stop / Switch Rules

- If a check needs missing production credentials or platform access, record it in parent `manual-gates.md` and continue with local status improvements.
- If generated status changes only due transient network failure, do not treat it as a code fix; record the result and rerun once if useful.
