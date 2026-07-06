# Cross-project autonomous improvement round 8

## Goal

Continue sustained autonomous improvements after Round 7, focusing on reliability observation, public demo readiness, cross-project status evidence, and low-risk local checks while recording manual gates for credentials, cloud platforms, live model calls, and release approvals.

## Requirements

- R1. Continue autonomous improvements without waiting for user input unless a manual gate is unavoidable.
- R2. Prefer changes that improve public demo readiness, reliability observation, content quality, or assistant usefulness across the main site and related projects.
- R3. Do not run live model/provider ping, paid model probes, production credential checks, or APK/public release changes without explicit user approval.
- R4. Record manual gates instead of blocking: cloud dashboards, credentials, production demo accounts, live chat/model tasks, metrics platforms, signed APK/AAB, and release approvals.
- R5. Keep each child task independently verifiable with local deterministic checks when possible.

## Acceptance Criteria

- [x] At least one child task is completed, verified, and committed locally; push is deferred to the GitHub SSH host key manual gate.
- [x] Manual gates are recorded in task notes when encountered.
- [x] No secrets, production credentials, private URLs, model relay endpoints, or unapproved APK links are committed.
- [x] Finished child tasks are archived before the parent is archived.

## Notes

- Default child order: reliability/status observation first, then public demo readiness, then project detail/content improvements, then assistant or AI Daily follow-ups.
- Completed children:
  - `07-07-round-8-reliability-status-local-evidence-hardening`
  - `07-07-round-8-status-detail-freshness-readability`
- Push gate: local commits are ready, but SSH host key verification blocked `git push origin main`; see `manual-gates.md`.

## Result

- Reliability status generation now appends checked-at/freshness context to merged synthetic evidence.
- `status:contract` enforces freshness evidence shape and prevents stale/unknown synthetic evidence from remaining `online`.
- `/status/:projectId` now surfaces `证据时间` and `证据新鲜度` as readable detail facts instead of burying them only in a long evidence paragraph.
- `check:ui` now asserts status detail freshness rows and badges from generated status data.
- Trellis specs now document both the status evidence freshness contract and the frontend helper-driven display rule.

## Validation

- `npm.cmd run site:status`
- `npm.cmd run status:contract`
- `npm.cmd run check:ui`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`
- Targeted sensitive scans over changed status/UI/task files; only expected spec/example words or CSS `mask-` false positives appeared.

## Recommended Next Round

- Continue with a new child focused on visitor-facing project detail/asset polish, AI Daily authoring workflow, or internal assistant admin usability.
- Keep GitHub SSH host key verification as the top manual action before attempting any push.
