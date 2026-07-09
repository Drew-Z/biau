# Credential-free synthetic refresh

## Goal

Refresh low-sensitive ERP/Legal/Xunqiu synthetic snapshots without using demo credentials or live model tasks, then regenerate site status if artifacts change.

## Requirements

- Run only credential-free checks.
- Explicitly clear Legal RAG synthetic email/password for this run so protected QA and contract review are not invoked.
- Explicitly clear ERP synthetic username/password for this run so only health/bootstrap registration state is checked.
- Do not read, print, or commit tokens, passwords, database URLs, API base URLs, provider endpoints, or model channel details.
- Do not run live assistant chat, model ping, provider doctor, or credentialed Legal RAG QA/contract-review flows.
- Regenerate `public/status/site-status.json` only from low-sensitive artifacts.
- If artifacts change, run `npm.cmd run status:contract` and record the low-sensitive result.

## Acceptance Criteria

- [x] Credential-free synthetic commands complete or preserve existing reports without exposing secrets.
- [x] `npm.cmd run site:status` completes after synthetic refresh.
- [x] `npm.cmd run status:contract` passes.
- [x] Manual gates remain for Legal RAG credentialed demo, ERP login/plugin/sync, Xunqiu backend URL/APK approval.

## Notes

- This task may produce no code change if local production base URLs are not configured and existing reports are preserved.

## Completion Notes

- `erp:synthetic` preserved the existing report because `ERP_SYNTHETIC_API_BASE_URL` was not configured in this local session.
- `legal-rag:synthetic` preserved the existing report because `LEGAL_RAG_API_BASE_URL` was not configured; this run explicitly cleared Legal RAG synthetic credentials.
- `xunqiu:synthetic` preserved the existing report because API base URL and artifact roots were not configured.
- `site:status` refreshed public entry reachability evidence.
- `status:contract` passed.
