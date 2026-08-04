# Implementation plan

1. Add a typed shared relay handler and Pages route with fixed endpoint construction, timing-safe auth, allowlist validation, bounded JSON/SSE forwarding, cancellation, and stable errors.
2. Extend Cloudflare fixture checks for auth, request validation, header stripping, endpoint/model pinning, JSON/SSE success, upstream status redaction, timeout, cancellation, and size limits.
3. Update `.env.example`, deployment/manual-gate docs, backend/Cloudflare code-spec, and deployment consistency checks.
4. Run targeted relay/Cloudflare checks, public model/agent/API checks, server build, lint, production build, and sensitive scan.
5. Commit and push the implementation.
6. Apply Cloudflare secret bindings without printing values, deploy Pages, generate/apply one relay shared token to Render, and deploy only `biau-public-assistant-api`.
7. Run one approved real request, inspect public result and safe Render recovery logs, delete the temporary session, and record rollback evidence.
