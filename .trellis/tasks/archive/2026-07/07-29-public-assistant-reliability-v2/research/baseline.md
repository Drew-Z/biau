# Baseline Evidence

## Production Observation

- Date: 2026-07-29.
- One user-approved business request (`生成一首古诗词`) returned HTTP 200,
  `route=direct`, `status=answered`, `mode=model`, and `durationMs=19972`.
- The temporary anonymous session was deleted after acceptance.
- This proves one successful request, not an SLA or permanent provider health.

## Current Code Evidence

- `server/src/publicAssistantModel.ts:79` sends direct and research answers through
  the same full evidence-oriented JSON prompt.
- `server/src/responsesApi.ts:106` sends model, stream, and input but no optional
  output-token bound or structured-output schema.
- `server/src/publicAssistantProjection.ts:132` allowlists public answer metadata
  but currently retains only mode, reason, citation count, and research summary.
- `src/components/PublicAssistantWidget.tsx:291` displays status, route, evidence
  count, and duration but has no safe recovery/failure class.
- `server/src/metrics.ts:18` has finite HTTP duration buckets only through 10s.
- Production serves the assistant in a lazy immutable chunk of approximately
  158,809 raw bytes; bundle splitting is not the primary latency cause.

## Dependency Evidence

- The configured npm mirror does not implement the audit bulk-advisory endpoint.
- The official registry reports seven current findings: three high and four
  moderate. Findings include transitive `fast-uri`, React Router RSC behavior,
  and Prisma tooling dependencies. Reachability and compatible fixes require a
  dedicated review; `npm audit fix --force` is not acceptable.

## Isolation Evidence

- The primary worktree contains unrelated AI Daily/project-notes changes.
- `blog-semi-public-route` contains an uncommitted retry draft in
  `publicAssistantAgent.ts` and its fixture script.
- This task starts from clean `origin/main` at `70d55305` in a dedicated worktree.
