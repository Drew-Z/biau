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

- [ ] At least one child task is completed, verified, committed, and pushed.
- [ ] Manual gates are recorded in task notes when encountered.
- [ ] No secrets, production credentials, private URLs, model relay endpoints, or unapproved APK links are committed.
- [ ] Finished child tasks are archived before the parent is archived.

## Notes

- Default child order: reliability/status observation first, then public demo readiness, then project detail/content improvements, then assistant or AI Daily follow-ups.
- Current first child: `07-07-round-8-reliability-status-local-evidence-hardening`.
