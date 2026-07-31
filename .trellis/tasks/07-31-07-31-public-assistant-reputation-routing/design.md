# Design

## Decision

Extend the existing in-process channel health map into a passive reputation router. Each real answer attempt updates decayed success/failure evidence, recent success time, and first-activity latency. Ranking uses a lexicographic safety boundary followed by a bounded score:

1. closed channels before open circuits;
2. known healthy channels before unproven or recently failing channels;
3. decayed reliability and recent-success stickiness;
4. bounded latency tie-breaker;
5. configured quality priority as the deterministic fallback.

## Recovery

When a circuit cooldown expires, the channel becomes half-open. The first real request that ranks it may acquire a short in-process lease. Other concurrent requests continue with the known healthy channel. Success closes the circuit and updates reputation; failure reopens it with the existing bounded cooldown.

No background timer or provider request is introduced. If there is no user traffic, there is no recovery probe.

## Boundaries

- State remains process-local and contains no provider/model identifiers in public responses or metrics.
- Ranking is synchronous and side-effect free except for acquiring a half-open lease during request candidate resolution.
- One request freezes its ordered channel list in the existing `WeakMap`.
- Planner calls remain outside reputation accounting because planner and answer attempts do not currently expose the same attempt timing/outcome contract. This avoids inferring health from an incomplete signal.

## Tradeoffs

- A cold start resets learning, which is acceptable for the free single-instance deployment and avoids making the optional database a routing dependency.
- Configured quality order remains the cold-start/default order.
- Recently stable fallbacks remain preferred for a bounded window, while decay prevents permanent lock-in.
