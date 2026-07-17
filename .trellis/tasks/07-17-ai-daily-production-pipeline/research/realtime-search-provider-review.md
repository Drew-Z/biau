# Real-time search provider review

Research date: 2026-07-17

## Decision

Use this production discovery and extraction chain for BIAU AI Daily:

```text
official RSS / official APIs
  -> Brave Search API for broad real-time gap discovery
  -> safe direct fetch or Firecrawl for selected original pages
  -> Tavily Search + Extract as same-capability fallback
  -> optional xAI X Search for early social signals
```

The runtime should use provider-neutral interfaces, but the recommended deployment is concrete. A production run requires a working discovery slot and original-page extraction slot.

## Why Brave Is The Primary Search Provider

- Brave returns raw search results and original URLs rather than only a generated answer.
- It supports freshness windows, country/language controls, site operators, and custom result shaping.
- Brave describes its index as more than 30 billion pages with more than 100 million daily page updates.
- Current public pricing is USD 5 per 1,000 requests with USD 5 monthly credits, which is appropriate for a personal site running grouped queries every two hours.

Official sources:

- https://brave.com/search/api/
- https://api-dashboard.search.brave.com/app/documentation/web-search/get-started

## Why Firecrawl Is The Extraction Layer

- Firecrawl turns selected URLs into clean Markdown/HTML and can handle pages that are difficult for a simple HTTP readability extractor.
- It should run after URL filtering, source checks, and preliminary dedupe rather than scraping every search result.
- Current public free allowance is 1,000 credits. Basic scrape is normally one credit per page; search has separate credit costs.
- Firecrawl search is not the primary BIAU discovery source because its news time filtering is less controllable than Brave's discovery interface.

Official sources:

- https://docs.firecrawl.dev/features/search
- https://www.firecrawl.dev/pricing

## Why Tavily Is The Fallback

- Tavily combines search and extraction in one service, which makes it the simplest full-chain fallback.
- It supports `topic=news`, date filters, domain filters, and cleaned raw content.
- Current public free allowance is 1,000 credits. Basic/fast searches use one credit and advanced uses two credits.
- It should be a fallback, not a permanently parallel duplicate of every Brave request, to control cost and repeated candidates.

Official sources:

- https://docs.tavily.com/documentation/api-reference/endpoint/search
- https://www.tavily.com/pricing

## Optional xAI X Search

- X Search can discover posts from selected vendor, researcher, or maintainer accounts before a story is broadly indexed.
- It supports date and handle filters.
- An X post is a lead. BIAU must follow its link or find an authoritative original page before using the claim as evidence.
- Current public pricing is USD 5 per 1,000 tool calls plus model token usage.

Official sources:

- https://docs.x.ai/developers/tools/x-search
- https://docs.x.ai/developers/pricing

## Rejected As The Default

### NewsAPI

The free plan is delayed by 24 hours and is limited to development use, so it does not meet BIAU's production real-time goal. The paid real-time plan is not economical for this site.

- https://newsapi.org/pricing

### Search-answer-only model tools

They are useful for research synthesis but are a weaker ingestion boundary because the application needs raw candidate URLs, deterministic fetching, stable evidence IDs, and replayable ranking.

### Running Every Provider In Parallel

Always calling all providers creates duplicate results, higher cost, noisier event clustering, and unnecessary concurrency. The production rule is primary, then bounded fallback, with optional signal queries only where they add distinct value.

## Search Schedule

```text
Tier 1 official feeds: every 15 minutes
Tier 2 technical media: every 30 minutes
Tier 3 community signals: every 60 minutes
Broad Brave discovery: every 2 hours
Mandatory discovery checkpoint: immediately before daily composition
Original-page extraction: immediately after candidate qualification
Extraction retry: approximately 5 / 20 / 60 minutes
```

## Evidence Boundary

Search results only create candidate URLs. A candidate becomes evidence only after original-page extraction succeeds and the system stores canonical URL, publisher, publication time when available, fetch time, content hash, and a bounded supporting quote.

This boundary remains true for Brave, Tavily, Firecrawl Search, and xAI X Search.
