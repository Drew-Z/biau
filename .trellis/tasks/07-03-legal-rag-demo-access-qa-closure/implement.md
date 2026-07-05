# Legal RAG Demo Access Implement

## Checklist

- [x] Confirm current task is `in_progress` and read Trellis/spec context.
- [x] Review existing Legal RAG project page, status targets, synthetic script, and generated status JSON.
- [x] Add explicit `demoAccessStatus` metadata to the Legal RAG synthetic report without exposing credentials or endpoints.
- [x] Run a public-safe synthetic check against the known Legal RAG API base without demo credentials.
- [x] Regenerate `public/status/site-status.json`.
- [x] Update task acceptance evidence and manual-action notes.
- [x] Run focused quality checks for the changed scripts/data.
- [ ] Commit and push the Legal RAG closure slice on `blog-semi/main`.

## Current Evidence

- `npm.cmd run legal-rag:synthetic` with the public Legal RAG API base and no credentials generated `demoAccessStatus=credential-required`.
- `npm.cmd run site:status` generated five online public entry targets and merged Legal RAG synthetic evidence into `/status`.
- `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` passed.
- Sensitive scan found only placeholder variable names and code identifiers, not real secrets.
- User approval to publish a low-permission demo account was received on 2026-07-05.
- Protected RAG QA, contract review, and quality report checks remain intentionally `unchecked` until the approved demo account is configured in the Legal RAG API/Web deployments and provided to the synthetic run through shell-only env variables.
- `npm.cmd run reliability:check` now preserves the existing Legal RAG synthetic report when `LEGAL_RAG_API_BASE_URL` is not configured in the runner environment, so scheduled checks do not overwrite live health evidence with a local configuration gap.

## Validation Commands

Use public URL values only when they are already published project links. Do not print or commit credentials.

```powershell
$env:LEGAL_RAG_API_BASE_URL='https://legal-rag-api-9bki.onrender.com'; npm.cmd run legal-rag:synthetic; Remove-Item Env:\LEGAL_RAG_API_BASE_URL
npm.cmd run site:status
npm.cmd run lint
npm.cmd run build
git diff --check
```

If credentials are not configured, the expected result is API health checked and protected checks marked `unchecked` with `demoAccessStatus=credential-required`.

After the approved public demo account is configured in production, run:

```powershell
$env:LEGAL_RAG_API_BASE_URL='<public-api-base>'; $env:LEGAL_RAG_SYNTHETIC_EMAIL='<public-demo-email>'; $env:LEGAL_RAG_SYNTHETIC_PASSWORD='<public-demo-password>'; npm.cmd run legal-rag:synthetic; Remove-Item Env:\LEGAL_RAG_API_BASE_URL; Remove-Item Env:\LEGAL_RAG_SYNTHETIC_EMAIL; Remove-Item Env:\LEGAL_RAG_SYNTHETIC_PASSWORD
npm.cmd run site:status
```

The expected closure result is `demoAccessStatus=open-demo` with `legal-rag-qa`, `legal-rag-contract-review`, and `legal-rag-observability` no longer `unchecked`.

## Manual Gate

Before claiming self-serve public Legal RAG demo access, the user must configure the approved low-permission demo account in both Legal RAG deployments, redeploy, and allow a credentialed synthetic check using that safe account.
