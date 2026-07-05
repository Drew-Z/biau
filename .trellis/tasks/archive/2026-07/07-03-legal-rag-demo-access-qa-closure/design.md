# Legal RAG Demo Access Design

## Boundary

This task closes the public-demo access and monitoring contract for Legal RAG from the BIAU Port side. It does not publish real credentials, bypass the Legal RAG login gate, create cloud resources, or claim that protected demo flows are open without evidence.

## Public Status Model

Legal RAG has two separate public states:

- Entry state: whether `https://legal-rag-web.onrender.com` and the API health endpoint respond.
- Demo access state: whether a visitor can complete the protected demo flow.

The demo access state is recorded in `public/status/legal-rag-synthetic.json` as:

- `open-demo`: the protected demo flow is reachable without missing credentials and the smoke checks confirm the core flow.
- `credential-required`: auth is enabled and no safe demo credentials are configured for the synthetic check.
- `blocked-by-login`: credentials were supplied but login failed before protected checks.
- `degraded`: the login gate is understood, but a protected flow, auth-status check, seed job, QA, contract review, or quality report did not pass.
- `offline`: the API base is not configured for the synthetic run or the API health check cannot be confirmed.

The `/status` page keeps using the existing low-cardinality check statuses: `online`, `degraded`, `offline`, `unchecked`, and `planned`. The Legal-specific access state is evidence metadata, not a new UI status label.

## Credential Policy

Public demo credentials are a manual gate. If credentials are shown in the Legal RAG web bundle through `VITE_PUBLIC_DEMO_EMAIL` and `VITE_PUBLIC_DEMO_PASSWORD`, they must be low-permission, revokable, and safe to publish. Real admin passwords, model keys, database URLs, Render dashboard links, and private provider endpoints must never be committed or surfaced on BIAU Port.

## Monitoring Flow

`npm.cmd run legal-rag:synthetic` checks:

1. API health.
2. Auth status and demo gate state.
3. Login only when `LEGAL_RAG_SYNTHETIC_EMAIL` and `LEGAL_RAG_SYNTHETIC_PASSWORD` are configured.
4. Public-safe dataset seed.
5. RAG QA with citation/diagnostics payload checks.
6. Contract review with risk and human-review flags.
7. Quality report with RAG and review evaluation summaries.

Missing credentials should keep protected checks `unchecked` and set `demoAccessStatus` to `credential-required`, while still allowing the task to continue to other unblocked work.

## Rollout

The main-site repository can publish the status metadata and safe explanations immediately. Enabling public self-serve demo access requires the user to configure Legal RAG API auth credentials and web-bundled public demo variables in the deployment platforms, then rerun the synthetic check with safe credentials.
