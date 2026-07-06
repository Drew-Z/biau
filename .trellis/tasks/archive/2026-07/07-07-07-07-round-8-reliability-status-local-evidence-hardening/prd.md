# Round 8 reliability status local evidence hardening

## Goal

Strengthen the main site's reliability/status observation with local deterministic evidence, clearer manual gates, and checks that improve cross-project demo readiness without using live credentials or model/provider pings.

## Requirements

- R1. Improve the status/reliability observation surface with deterministic local evidence, not live credentials or model/provider calls.
- R2. Make merged synthetic evidence more useful to visitors and maintainers by exposing when the evidence was checked and whether it is stale.
- R3. Keep status evidence low-sensitive: no real tokens, passwords, private URLs, model relay endpoints, raw response bodies, or local absolute paths.
- R4. Preserve current status data shape for existing pages unless a small typed extension is needed.
- R5. Add or strengthen local checks so stale or malformed status evidence is caught before publication.
- R6. Do not change production platform configuration, external monitoring dashboards, or real synthetic credentials in this slice.

## Acceptance Criteria

- [x] Status evidence includes checked-at/freshness context for merged synthetic checks.
- [x] The status page or detail page can show stale evidence without implying the underlying project is currently healthy.
- [x] A deterministic local check covers status evidence freshness/shape and is wired into verification where appropriate.
- [x] Existing `status:contract`, `site:status`, `check:ui`, `lint`, `build`, and `verify` pass.
- [x] Manual gates are documented for credentials, cloud monitoring, metrics, and live synthetic checks.
- [x] Changes are committed locally; push is deferred to the GitHub SSH host key manual gate.

## Notes

- Evidence inspected before planning:
  - `scripts/generate-site-status.ts` already merges `public/status/*-synthetic.json` into `reliabilityProjects`, but the merged evidence text does not include checked time or freshness.
  - `scripts/check-status-contract.ts` validates static status data and synthetic snapshot shape, but does not assert freshness semantics in merged evidence.
  - `src/pages/SiteStatusDetailPage.tsx` displays `check.evidence` as free text, so a small generator/data change can improve visible detail without a large UI rewrite.
  - Existing snapshots under `public/status/` already contain `checkedAt` per report/check.

## Out Of Scope

- No live credentialed Legal RAG / ERP / Xunqiu checks.
- No model chat synthetic run.
- No Prometheus/Grafana/ARMS/Umami/Plausible setup.
- No APK/AAB release approval or download-link publication.

## Result

- `site:status` now appends low-sensitive synthetic evidence time and freshness wording to merged reliability checks.
- Freshness labels are `新鲜`, `接近过期`, `已过期`, and `未知`, based on local generated status data only.
- Stale or unreadable synthetic evidence downgrades an otherwise `online` merged check to `degraded` rather than implying current health.
- `status:contract` now asserts freshness text exists and prevents stale/unknown merged evidence from staying `online`.
- Local UI checks now ignore transient Google Fonts timeout noise in Vite preview while still failing same-origin JS, CSS, image, JSON, or route failures.

## Validation

- `npm.cmd run site:status`
- `npm.cmd run status:contract`
- `npm.cmd run check:ui`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`
- Targeted sensitive scan over changed status scripts/data: no real secrets or private deployment values found.

## Manual Gates

- Credentialed Legal RAG / ERP / Xunqiu live checks still need approved production tokens or demo credentials.
- Public/internal assistant live model prompts remain opt-in only; do not add them to default liveness checks.
- Prometheus, Grafana, ARMS, Umami/Plausible, Cloudflare dashboards, and alert routing remain human platform setup.
- Pet/Xunqiu APK/AAB signing, checksum publication, and public download approval remain human release gates.
- GitHub SSH host key verification blocks `git push origin main`; local commit `aa7d284` is ready to push after the user verifies the trusted host key.
