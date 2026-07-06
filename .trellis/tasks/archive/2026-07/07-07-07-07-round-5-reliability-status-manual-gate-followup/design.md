# Reliability Status Manual Gate Followup Design

## Direction

Treat reliability as a controllability map, not a promise that every deployed system is fully observable from this repository.

The status layer should separate:

- public entry reachability;
- local deterministic checks;
- credentialed demo checks;
- platform/manual gates;
- release gates such as APK approval;
- future observability integrations.

## Candidate Improvements

- Add or tighten a static check that validates status target records and public status snapshots.
- Make `reliability:check` or `site:status` catch missing manual gate explanations, stale status files, or inconsistent project ids.
- Improve manual gate wording so each item includes owner action, required input, and verification command/path.
- Add docs/spec coverage for how gated checks should be represented.

## Safety

Do not turn gated checks into live probes. If a check needs credentials, cloud dashboard access, model calls, or signed release assets, record it as a manual gate and keep the local check low-sensitive.
