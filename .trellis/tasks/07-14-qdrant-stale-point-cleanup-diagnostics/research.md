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
