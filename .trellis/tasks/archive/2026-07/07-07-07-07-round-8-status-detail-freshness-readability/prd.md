# Round 8 status detail freshness readability

## Goal

Make reliability status detail pages show synthetic evidence freshness as a readable public-safe signal, using existing local generated status data and without live credential checks.

## Requirements

- R1. Status detail checks that contain merged synthetic evidence must expose the evidence checked time and freshness as readable UI facts, not only as a long evidence sentence.
- R2. The UI must remain public-safe: no raw URLs, credentials, tokens, provider endpoints, dashboard links, local paths, or raw response bodies.
- R3. Keep the existing status JSON schema compatible. Prefer deriving freshness from the existing public `evidence` string because `site:status` already writes checked-at and freshness text.
- R4. Freshness display must distinguish `新鲜`, `接近过期`, `已过期`, and `未知`, and should visually align with existing status tones.
- R5. Add or strengthen deterministic UI/contract checks so the status detail route cannot regress to hiding freshness facts.
- R6. Do not add live checks, production credentials, model calls, metrics platform setup, or cloud deployment changes in this slice.

## Acceptance Criteria

- [x] Status detail pages show checked-at/freshness facts for reliability checks whose evidence includes merged synthetic freshness context.
- [x] Stale/unknown freshness is visibly distinguishable from fresh evidence without implying the project is offline solely because evidence is stale.
- [x] Static/planned/manual-gated checks without synthetic freshness still render normally.
- [x] `status:contract`, `check:ui`, `lint`, and `build` pass.
- [x] Manual gates and push limitation are recorded.
- [x] Changes are committed locally; push is attempted only after the GitHub SSH host key gate is resolved.

## Notes

- This task builds on `07-07-round-8-reliability-status-local-evidence-hardening`.
- Current push gate: `main` is ahead of `origin/main`, and SSH host key verification blocks pushing until the user confirms the trusted GitHub fingerprint.

## Result

- Added `parseEvidenceFreshness()` in `src/data/siteStatusView.ts`.
- Status detail checks now render extra fact cards for `证据时间` and `证据新鲜度` when generated evidence contains freshness context.
- Added freshness badges using existing status tones: fresh -> online, aging/stale -> degraded, unknown -> unchecked.
- Strengthened `check:ui` so Legal RAG status detail freshness rows and badges are asserted from generated status data.
- Updated frontend quality spec so future `/status/:projectId` freshness UI remains helper-driven and data-derived.

## Validation

- `npm.cmd run status:contract`
- `npm.cmd run lint`
- `git diff --check`
- `npm.cmd run build`
- `npm.cmd run check:ui` with local preview at `http://127.0.0.1:5174`
- `npm.cmd run verify`

## Manual Gates

- GitHub SSH host key verification still blocks pushing local commits.
- No live model/provider prompts, credentialed project checks, cloud dashboard setup, or APK release approvals were attempted.
