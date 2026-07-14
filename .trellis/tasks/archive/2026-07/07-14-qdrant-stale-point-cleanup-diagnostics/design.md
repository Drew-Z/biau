# Design: Qdrant Stale Point Cleanup Diagnostics

## Sync Outcome Model

The Qdrant sync has two operational phases:

1. Authoritative upsert: ensure collection, generate embeddings, and upsert current chunks.
2. Best-effort reconciliation: scroll points for the same scope/source and delete stale IDs.

Upsert determines accepted. Reconciliation contributes cleanup diagnostics and issueCount but does not reverse an already accepted upsert.

## Cleanup Result

Introduce an internal structured result with status, reason, providerStep, errorKind, httpStatus, timeoutMs, scannedPointCount, stalePointCount, deletedPointCount, and issueCount.

The sync diagnostic flattens these fields using explicit cleanup-prefixed names so existing generic provider fields keep their meaning for fatal sync failures.

## Failure Semantics

- Scroll the dedicated collection without a provider-side payload filter, request payloads without vectors, and enforce `scope + source` locally before collecting stale IDs. This avoids provider-specific filtered-scroll rejection without weakening deletion isolation.
- Scroll/pagination failure: return warning with cleanupProviderStep=qdrant_scroll_points; do not attempt deletion from incomplete scan results.
- Delete request failure: retain counts gathered so far, report the failing delete step and unresolved stale-point count.
- No stale points: completed with scanned count and zero stale/deleted/issues.
- Successful deletion: completed with stale count equal to deleted count.
- Fatal collection, embedding, or upsert failure: existing accepted=false path remains unchanged.

## Request Boundary

Use the existing Qdrant request wrapper and normalizeQdrantError. Delete operations should use the throwing request contract or explicitly convert non-OK responses into QdrantProviderError so status and provider step are preserved.

## Persistence And UI

InternalKnowledgeSyncRun.diagnostic remains JSON, so no Prisma schema migration is required. The serializer already sanitizes an allowlist; extend that allowlist with the new cleanup fields.

Frontend normalizers accept only the same low-sensitive fields. The admin surface should render:

- completed cleanup: no warning;
- accepted sync with cleanup warning: corpus updated, stale cleanup needs attention;
- rejected sync: existing failed/skipped wording.

## Verification Strategy

Use deterministic fetch mocks in the existing RAG smoke surface to model:

- one-page scroll with no stale points;
- paginated scroll;
- stale IDs followed by successful delete;
- scroll 4xx/5xx;
- scroll timeout/network error;
- delete non-OK response.
- an unrelated source in the same collection that must survive local reconciliation.

No live Qdrant or embedding call is required for automated tests.

## Production Follow-Up

After deployment, run one approved internal knowledge sync. Read only the persisted low-sensitive cleanup diagnostic. If it identifies a provider-specific incompatibility, make a focused second patch grounded in that evidence.
