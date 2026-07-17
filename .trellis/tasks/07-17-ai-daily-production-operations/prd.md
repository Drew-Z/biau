# AI Daily production operations

## Goal

Configure, observe, and accept the completed AI Daily system in production through one real business edition without performing provider liveness tests.

## Dependencies

- Requires completion of all five sibling implementation tasks:
  - `07-17-ai-daily-domain-foundation`
  - `07-17-ai-daily-ingestion-evidence`
  - `07-17-ai-daily-generation-runner`
  - `07-17-ai-daily-studio-editorial`
  - `07-17-ai-daily-public-feed`

## Requirements

- Document and configure separate Render ingest and editorial Cron Jobs with UTC schedules and `Asia/Shanghai` application time.
- Configure Studio database, Brave, Firecrawl, optional Tavily fallback, optional xAI signal, generation role slots, public origins, cache, rate-limit, and public-feed variables without committing secrets.
- Curate and approve the initial 30-80 sources and discovery query groups.
- Run the offline model evaluation and select extractor/composer/verifier primaries and fallbacks from measured results.
- Add metrics for stage/outcome, freshness, lag, backlog, leases, source health, fallback, quality rejection, and feed age.
- Run one user-approved real edition as the first live provider task.
- Record manual review, flash approval, daily draft approval, export, deployment verification, and rollback instructions.

## Acceptance Criteria

- [ ] Both Cron Jobs run with deadlines shorter than their schedule intervals and resume durable work.
- [ ] No secret or private endpoint appears in repository, logs, public API, or generated content.
- [ ] Initial sources and model roles have an approved evaluation record.
- [ ] One live edition meets freshness, coverage, citation, quality, editorial, feed, export, and public deployment checks.
- [ ] Failure dashboards distinguish config, provider, evidence, quality, infrastructure, and stale-content conditions.
- [ ] Disabling Cron and public-feed flags provides a documented non-destructive rollback.

## Validation

Use the parent full quality gate, then perform the separately approved live business edition. No ping, doctor, diagnose, empty prompt, or liveness-only provider request is allowed.
