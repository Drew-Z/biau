# PRD: Qdrant Stale Point Cleanup Diagnostics

## Goal

Make Qdrant corpus synchronization truthful and diagnosable when vector upsert succeeds but stale-point cleanup fails, then use the low-sensitive production diagnostic to resolve the actual compatibility problem without leaking provider configuration.

## Background

- A user-approved internal knowledge sync completed with accepted=true, status=COMPLETED, one document, and five chunks.
- The same run recorded issueCount=1.
- server/src/ragQdrantStore.ts currently converts every stale cleanup exception through catch(() => 1), losing whether failure occurred during scroll, pagination, or deletion.
- The official Qdrant points documentation confirms the current scroll endpoint, filter payload, with_payload, with_vector:false, next_page_offset, and ID-based delete shapes are valid.
- Provider URLs, API keys, collection configuration, raw responses, vectors, and internal knowledge content must remain private.

## Requirements

1. Represent stale cleanup as a structured result rather than a bare issue count.
2. Preserve successful vector upsert semantics when cleanup fails: synchronization remains accepted/completed but reports a cleanup warning.
3. Expose only low-sensitive cleanup fields: status, reason, provider step, error kind, HTTP status, timeout, scanned points, stale points, deleted points, and issue count.
4. Never expose Qdrant URL, API key, raw provider response, collection value, point payload, vector, document body, or stack trace.
5. Cover scroll failure, pagination failure, delete failure, no-stale-point success, and stale-point deletion success with deterministic mock tests.
6. Update internal sync persistence and admin UI normalization/wording so operators can distinguish upsert failure from cleanup warning.
7. Preserve public/internal scope isolation and existing RAG response compatibility.
8. After deployment, perform one user-approved internal sync to identify the real production cleanup failure; do not repeatedly sync while diagnostics remain ambiguous.

## Acceptance Criteria

- A successful upsert plus cleanup failure returns accepted=true and a nonzero issueCount, with a sanitized cleanup diagnostic identifying the failed step.
- A full successful sync reports cleanup status completed, accurate scanned/stale/deleted counts, and zero issues.
- A failed upsert remains accepted=false and preserves the existing provider diagnostic.
- The admin knowledge/RAG surface describes cleanup warnings without claiming the corpus was wholly unsuccessful.
- Mock checks prove no secret-shaped fields enter API or persisted diagnostics.
- server:build, assistant:rag-smoke, server:smoke, assistant:service-modes-smoke, frontend checks affected by admin wording, and git diff --check pass.

## Out Of Scope

- Replacing Qdrant or the embedding provider.
- Changing retrieval ranking or Agent prompts.
- Repeated live model/provider probing.
- Browser-side access to Qdrant or RAG sync credentials.
