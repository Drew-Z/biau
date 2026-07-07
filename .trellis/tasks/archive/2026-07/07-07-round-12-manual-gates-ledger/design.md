# Design

## Scope

Add a small documentation contract:

- `docs/manual-gates.md` becomes the human-action queue for this repository and associated project demo surfaces.
- `scripts/check-manual-gates.mjs` validates required headings, cross-links, and public-safety constraints.
- `package.json` exposes `docs:manual-gates-check`.
- `scripts/verify.mjs` runs the new check near other docs/content gates.

## Ledger Shape

The ledger should be organized by gate category rather than by historical task:

- Git / repository publishing
- Cloud and deployment platforms
- Databases and production migrations
- Model providers and live AI tasks
- Internal assistant / RAG / Studio
- AI Daily and blog publication
- Project demos and credentialed checks
- APK / mobile release
- Observability and analytics

Each category should record:

- what needs human action;
- why it cannot be automated by default;
- safe local evidence or commands that can be run without secrets;
- what must not be committed.

## Check Strategy

The check script should be intentionally simple and deterministic:

- read the ledger and key docs;
- assert required phrases/sections exist;
- assert linked docs point to `docs/manual-gates.md`;
- scan added ledger text for secret-like strings, private connection strings, bearer tokens, local absolute paths, and private key blocks.

It should not fetch the network, inspect `.env*`, run model providers, or require cloud state.
