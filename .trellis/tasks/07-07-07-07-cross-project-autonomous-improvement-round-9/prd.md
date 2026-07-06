# Cross-project autonomous improvement round 9

## Goal

Continue autonomous local improvements for BIAU Port and related projects, prioritizing project detail visual semantics, visitor-facing demo clarity, and deterministic checks while recording manual gates for push, credentials, live model calls, cloud platforms, and APK releases.

## Requirements

- R1. Continue local, verifiable improvements without waiting for user input unless a true manual gate appears.
- R2. Prefer visitor-facing trust improvements: project detail visual semantics, demo clarity, status evidence, content quality, or assistant usability.
- R3. Do not run live model/provider pings, credentialed production checks, paid tasks, cloud dashboard changes, or APK release publication without explicit user approval.
- R4. Record manual gates instead of blocking further local work.
- R5. Keep each child task independently verifiable and small enough to roll back.

## Acceptance Criteria

- [ ] At least one child task is completed, verified, and committed locally.
- [ ] Manual gates are recorded in task notes.
- [ ] No secrets, production credentials, private URLs, model relay endpoints, or unapproved APK links are committed.
- [ ] Finished child tasks are archived before the parent is archived.

## Notes

- Current push gate from Round 8 still applies: `git push origin main` is blocked by GitHub SSH host key verification.
- First child: `07-07-round-9-project-visual-semantics-guard`.
