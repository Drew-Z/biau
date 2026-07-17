# AI Daily ingestion and evidence

## Goal

Build the real-time source, discovery, original-page evidence, deterministic dedupe, event grouping, ranking, and selection pipeline.

## Dependencies

- Requires `07-17-ai-daily-domain-foundation` complete.
- Produces qualified, versioned evidence selections consumed by `07-17-ai-daily-generation-runner` and Studio.

## Requirements

- Add Studio-managed RSS/Atom, official-page, GitHub Release, HN API, and manual URL sources with tiers, topics, locale, cadence, and health.
- Implement Tier 1/2/3 schedules of 15/30/60 minutes with overlap lookback and conditional requests.
- Implement Brave Search as primary broad discovery, Tavily as recommended fallback, and optional xAI X Search as lead-only signal input.
- Implement safe direct extraction, Firecrawl selected-page extraction, and optional Tavily Extract fallback.
- Enforce SSRF, DNS, redirect, body, content-type, timeout, robots, and private-network protections.
- Normalize canonical URLs and deduplicate by URL, content hash, title fingerprint, and lexical similarity before optional semantic grouping.
- Store explainable ranking components and apply the parent task's deterministic selection contract.
- Record freshness, coverage, provider fallback, source health, and sanitized errors.
- Make no model or provider liveness-only calls; automated tests use mocks.

## Acceptance Criteria

- [x] Fixture sources produce deterministic candidates, evidence, duplicates, clusters, scores, and selected events.
- [x] Search/X results cannot become evidence without a fetched authoritative page.
- [x] Unsafe and private targets fail with stable sanitized categories.
- [x] Tier 1 publication-to-discovery fixtures meet the 30-minute p95 contract.
- [x] Stale collection/discovery checkpoints cause explicit gaps rather than normal success.
- [x] Missing Tavily is reported as reduced redundancy, while missing primary discovery is not production-ready.
- [x] Repeated runs create no duplicate canonical sources or selected issue relations.

## Validation

```powershell
npm.cmd run ai-daily:source-check
npm.cmd run ai-daily:discovery-check
npm.cmd run ai-daily:evidence-check
npm.cmd run ai-daily:freshness-check
npm.cmd run ai-daily:dedupe-check
npm.cmd run ai-daily:ranking-check
npm.cmd run server:build
```
