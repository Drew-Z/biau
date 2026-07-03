# Design

## Layer Model

The public status experience uses four reliability layers:

- `entry`: public entry reachability, usually HTTP/HTML response checks.
- `synthetic`: user-meaningful workflow checks, such as a short RAG query or contract review smoke task.
- `metrics`: project-owned operational metrics, usually `/metrics` or equivalent low-sensitive health counters.
- `observability`: dashboards, alerting, search analytics, product analytics, logs, traces, or LLM observability.

This split keeps visitor-facing status honest. A project can be reachable while its model workflow is not yet verified; the UI must show those as different facts.

## Data Contract

Extend the status payload without breaking existing target cards:

- `targets`: current L0 entry checks, generated from `siteStatusTargets`.
- `reliabilityProjects`: project-level groups for all important systems.
- Each project has:
  - `id`, `title`, `category`, `summary`.
  - `checks`: stable reliability checks.
  - `gates`: human decisions or private configuration needed before the check can become live.
  - `nextActions`: short implementation steps for later child tasks.
- Each check has:
  - `id`, `layer`, `label`, `status`, `description`, `evidence`, `cadence`, `ownerHint`.
  - Optional `relatedTargetId` for checks that correspond to an L0 entry.

Allowed check statuses:

- `online`: current generated evidence proves the check passed.
- `degraded`: target responded but has expected limits or warnings.
- `offline`: generated evidence proves failure.
- `unchecked`: check is known but no current automated evidence exists.
- `planned`: check is intentionally documented for future implementation.

## Generation Flow

`scripts/generate-site-status.ts` remains the single generator for the public JSON.

1. Check L0 targets serially through `fetchWithTimeout`.
2. Build static project reliability definitions from `src/data/statusTargets.ts`.
3. Merge generated L0 results into matching project checks.
4. Emit one JSON payload consumed by `/status`.

The script must stay low concurrency and must not call private APIs or LLM providers in this first baseline.

## UI Flow

`SiteStatusPage` keeps the existing visitor-facing overview and adds:

- A layer explanation strip.
- Project reliability sections grouped by project.
- Status badges for L0/L1/L2/L3 checks.
- Clear copy for `unchecked` and `planned`, so visitors see this as a roadmap rather than a false outage.
- Gate and next-action text kept short and non-sensitive.

## Prometheus / Grafana Boundary

Prometheus is useful after a service exposes stable low-sensitive metrics, but it cannot prove product workflows alone. Recommended order:

1. Add L1 synthetic checks for critical user journeys.
2. Persist L1 results into public JSON and/or internal metrics.
3. Add `/metrics` to services that can safely expose counters and histograms.
4. Scrape metrics with Prometheus or a hosted compatible system.
5. Build Grafana/ARMS/Sentry/Langfuse dashboards only after the signal is meaningful.

## Rollback

- Revert changes to `src/data/statusTargets.ts`, `scripts/generate-site-status.ts`, and `src/pages/SiteStatusPage.tsx`.
- Regenerate `public/status/site-status.json`.
- The existing L0 target checks can remain valid independently if the reliability project UI is removed.
