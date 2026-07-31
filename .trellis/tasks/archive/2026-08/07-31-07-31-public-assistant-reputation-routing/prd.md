# Public assistant reputation routing

## Goal

Use only real user requests to rank generation channels by recent reliability and latency, keep a stable healthy winner, and recover cooled channels without model liveness probes.

## Requirements

- Never probe a model, enumerate a provider catalog, or send a liveness prompt when the assistant opens or when ranking channels.
- Learn only from production-shaped answer attempts made for real user requests.
- Prefer a recently successful, consistently reliable channel over a higher configured priority channel that repeatedly fails.
- Use response first-activity latency only as a bounded tie-breaker; reliability and circuit state remain authoritative.
- Apply decay so old successes and failures do not permanently pin or punish a channel.
- Give a cooled channel a controlled real-request recovery opportunity without allowing concurrent requests to stampede it.
- Keep request-local candidate order frozen after routing begins.
- Keep health data provider-private, bounded, in-process, and reset on service restart.
- Preserve the existing absolute request deadline, retry count, cancellation, failure-domain, and public projection contracts.

## Acceptance Criteria

- [x] Ranking performs zero provider calls.
- [x] A healthy fallback that succeeds after the primary fails becomes first choice for subsequent requests.
- [x] One isolated failure does not permanently demote a historically healthy channel.
- [x] Repeated failures open the existing bounded circuit and move the channel behind healthy candidates.
- [x] Cooldown expiry grants at most one in-flight half-open lease per channel; concurrent requests keep using the known healthy channel.
- [x] When every channel is cooling down, the assistant returns a bounded degraded answer immediately and performs no provider request.
- [x] A successful half-open attempt restores the recovered channel without immediately erasing the healthy winner's reputation.
- [x] Stale reputation decays back toward configured quality order.
- [x] Deterministic checks cover stability, decay, cooldown recovery, and zero-probe behavior.
- [x] Public assistant model/agent checks, server build, lint, build, and diff checks pass.

## Notes

- `/health` may warm the API process but continues to inspect configuration only.
- No persistent database state is introduced in this task; persistence would couple routing availability to an optional database and expose cross-instance coordination complexity.
