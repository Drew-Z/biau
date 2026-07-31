# Implementation

1. Extend model-channel health state with decayed success/failure samples and half-open lease metadata.
2. Replace cooldown-only sorting with deterministic passive reputation ranking.
3. Release half-open leases on recorded success/failure and bound abandoned leases by time.
4. Add fixture checks for stable winner preference, decay, one-request half-open recovery, and zero provider probes.
5. Update the public assistant backend spec.
6. Run focused checks, then the required build/lint gates.

## Validation

```powershell
npm.cmd run assistant:public-model-check
npm.cmd run assistant:public-agent-check
npm.cmd run server:build
npm.cmd run lint
npm.cmd run build
git diff --check
```

All listed validation commands passed on 2026-08-01. The repository-wide `check:ui` harness was also attempted against a local Vite server, but the monolithic full-site matrix exceeded both 120-second and 300-second command limits without reporting an assertion failure. This task changes only server routing; the focused server and production-build gates are authoritative for the change.
