# Implementation Plan

- [x] Add a structured stale cleanup result in server/src/ragQdrantStore.ts.
- [x] Preserve scroll/delete provider errors and attach sanitized cleanup fields to public and internal sync diagnostics.
- [x] Extend backend sync diagnostic sanitization and shared response types.
- [x] Update admin frontend normalization and warning copy for accepted syncs with cleanup issues.
- [x] Add deterministic mock coverage for cleanup success, pagination, scroll failure, and delete failure.
- [x] Update backend/frontend Trellis specs with the accepted-upsert/cleanup-warning contract.
- [x] Stabilize the reduced-motion OffscreenCanvas ready signal exposed by the full UI quality gate.
- [x] Run focused RAG/server checks, lint, build, UI checks if admin rendering changes, sensitive scan, and git diff --check.
- [x] Commit and push implementation.
- [x] Use the first production diagnostic to identify filtered scroll HTTP 400 and correct the misleading dimension classification.
- [x] Switch cleanup to unfiltered scroll with local scope/source isolation and verify the provider-specific follow-up.
- [x] Record deployment and one approved production resync as a manual acceptance gate.
- [x] Archive the task after production diagnostics confirm cleanup success or identify a separately tracked provider-specific follow-up.

## Rollback Points

- Cleanup result changes are confined to the Qdrant adapter and diagnostic projection.
- API fields are additive; older frontend behavior remains valid when cleanup fields are absent.
- If production behavior regresses, revert the cleanup diagnostic commit without changing collection contents or credentials.
