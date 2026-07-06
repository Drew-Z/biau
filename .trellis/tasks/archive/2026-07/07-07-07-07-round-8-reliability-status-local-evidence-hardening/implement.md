# Reliability Status Local Evidence Hardening Implementation Plan

## Steps

1. [x] Read applicable Trellis specs before editing.
2. [x] Inspect current status generation and contract checks.
3. [x] Add freshness classification and evidence wording to merged synthetic checks.
4. [x] Add deterministic assertions that generated/merged reliability evidence includes low-sensitive freshness context.
5. [x] Regenerate status data if the public JSON output changes.
6. [x] Run focused and broad validation.
7. [x] Update task notes, commit locally, defer push to the SSH host key manual gate, and archive.

## Validation Candidates

- `npm.cmd run site:status`
- `npm.cmd run status:contract`
- `npm.cmd run check:ui` with local preview
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`
- Targeted sensitive scan over status scripts/data

## Rollback

Revert freshness helper/check changes and regenerate `public/status/site-status.json` from the previous generator.

## Manual Gates

- Credentialed Legal RAG/ERP/Xunqiu checks remain manual.
- Live public assistant chat checks remain opt-in only.
- Prometheus/Grafana/ARMS/Umami/Plausible/Cloudflare dashboard setup remains manual.
- APK/AAB release approval remains manual.
- GitHub SSH host key verification must be resolved before pushing local commits.

## Execution Notes

- Implemented synthetic evidence freshness in `scripts/generate-site-status.ts` using local snapshot timestamps.
- Strengthened `scripts/check-status-contract.ts` so malformed or stale merged evidence is caught before publication.
- Regenerated `public/status/site-status.json`.
- Updated observability and frontend quality specs with the new status evidence contract and local preview timeout rule.
- Validation passed with the commands listed above; Vite still reports the existing dynamic import warning during build, but the build exits successfully.
- Local work commit: `aa7d284 test(status): surface reliability evidence freshness`; push is intentionally deferred because SSH host key verification failed.
