# AI Daily ingestion and evidence implementation

## Ordered Work

- [ ] Implement source registry contracts and adapters.
- [ ] Implement due-source scheduling, overlap windows, health, and conditional requests.
- [ ] Implement discovery query groups and Brave/Tavily/xAI adapters with mock fixtures.
- [ ] Implement safe fetch and extraction adapters.
- [ ] Implement evidence normalization and retention metadata.
- [ ] Implement canonicalization, dedupe, grouping, ranking, and deterministic selection.
- [ ] Implement ingestion leases, priorities, deadlines, continuation, and freshness metrics.
- [ ] Expose internal repository/service APIs for later runner and Studio tasks.

## Completion Gate

Do not enable live provider configuration. Completion is fixture-based and must produce a stable evidence selection for the generation child task.
