# AI Daily ingestion and evidence design

## Flow

```text
source adapters + grouped Brave queries
  -> candidate URL normalization
  -> safe direct fetch / Firecrawl / Tavily fallback
  -> bounded evidence documents
  -> deterministic dedupe
  -> event grouping
  -> explainable ranking and stable selection
```

## Provider Rules

- Brave is the configured production primary.
- Tavily is an optional high-availability fallback, not a third mandatory vendor.
- xAI X Search creates leads only.
- Firecrawl runs only for filtered pages or direct extraction failure.
- Raw provider bodies and credentials are never persisted.

## Scheduling

The ingestion tick uses leases, priorities, and a deadline shorter than its schedule interval. Unfinished work persists for the next tick.

## Dependency Output

The task publishes selection-versioned `SourceItem`, candidate, cluster, evidence, ranking, and freshness records. It does not create public wording or approve anything.
