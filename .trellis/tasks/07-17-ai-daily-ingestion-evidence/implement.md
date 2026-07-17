# AI Daily ingestion and evidence implementation

## Ordered Work

- [x] Implement source registry contracts and adapters.
- [x] Implement due-source scheduling, overlap windows, health, and conditional requests.
- [x] Implement discovery query groups and Brave/Tavily/xAI adapters with mock fixtures.
- [x] Implement safe fetch and extraction adapters.
- [x] Implement evidence normalization and retention metadata.
- [x] Implement canonicalization, dedupe, grouping, ranking, and deterministic selection.
- [x] Implement ingestion leases, priorities, deadlines, continuation, and freshness metrics.
- [x] Expose internal repository/service APIs for later runner and Studio tasks.

## Completion Gate

Do not enable live provider configuration. Completion is fixture-based and must produce a stable evidence selection for the generation child task.
