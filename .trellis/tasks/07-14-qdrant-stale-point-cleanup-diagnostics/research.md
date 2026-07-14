# Research

## Official Qdrant Points Contract

Source: https://qdrant.tech/documentation/manage-data/points/

Verified on 2026-07-14 with:

smart-search fetch "https://qdrant.tech/documentation/concepts/points/" --format markdown

The fetched official documentation redirects to the current manage-data page and confirms:

- Scroll uses POST /collections/{collection_name}/points/scroll.
- Filtered scroll supports limit, with_payload: true, and with_vector: false.
- Pagination returns result.next_page_offset; null indicates the last page.
- The returned offset is passed back as the next request's offset.
- Point mutation APIs are idempotent.
- Point IDs may be unsigned integers or UUID strings.
- ID-based point deletion is supported.

Conclusion: the repository's high-level endpoint and payload shape are valid. The production issue must be diagnosed from preserved provider-step/status evidence rather than speculative endpoint replacement.

## Production Acceptance Evidence

The first deployed public sync after structured diagnostics reported:

- accepted=true with 27 documents and 56 chunks;
- cleanupStatus=warning;
- cleanupProviderStep=qdrant_scroll_points;
- cleanupHttpStatus=400;
- scanned/stale/deleted counts all zero.

The earlier `qdrant_dimension_mismatch` reason was a local classification defect: `reasonForQdrantStatus()` mapped every Qdrant HTTP 400 to a dimension mismatch even outside collection creation or point upsert. The current Qdrant API reference confirms `POST /collections/:collection_name/points/scroll` permits pagination without a filter. The compatibility fix therefore uses unfiltered collection scroll plus local `scope + source` guards, while mapping non-upsert HTTP 400 responses to `qdrant_bad_request`.

Source: https://api.qdrant.tech/api-reference/points/scroll-points
