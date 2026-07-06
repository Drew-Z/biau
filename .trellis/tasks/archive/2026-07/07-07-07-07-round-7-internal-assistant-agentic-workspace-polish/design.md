# Internal Assistant Agentic Workspace Polish Design

## Scope

This child task covers `blog-semi` internal assistant surfaces:

- frontend pages/components for assistant/admin/studio-internal operations;
- server routes and services that support member sessions, model channels, internal knowledge, sync status, and diagnostics;
- local scripts/smoke checks that can validate contracts without production credentials or provider liveness calls.

## Selection Rule

After audit, pick the smallest improvement that:

- increases final-shape readiness rather than temporary MVP scaffolding;
- can be proven locally;
- keeps public and internal-sensitive data separated;
- improves operator/member understanding of what is configured, gated, degraded, or missing.

## Candidate Slices

- Admin knowledge-management status panel: make sync state, corpus scope, document counts, and next actions easier to inspect.
- Member model-channel diagnostics: show low-sensitive provider state, selected model, fallback shape, and failure categories without exposing keys/base URLs.
- API contract/smoke coverage: assert member channels, knowledge docs, sync records, and diagnostics payloads stay public-safe.
- Internal assistant UI cleanup: reduce clutter, make workspace actions discoverable, and align naming with Agentic Workspace.

## Non-goals

- No production model call.
- No provider liveness probe.
- No secret/config migration.
- No new cloud dependency.
- No large rewrite of RAG or Agent orchestration.

## Validation

Use focused script/API/UI checks first. Run `lint`, `build`, and `check:ui` for UI or shared TypeScript changes. Run `verify` if changes touch shared data, assistant server contracts, or broad routes.
