# Preserve Legal RAG synthetic evidence without env

## Goal

Prevent direct Legal RAG synthetic runs without API env from overwriting an existing live open-demo report; keep fresh-clone behavior available.

## Requirements

- Direct `npm.cmd run legal-rag:synthetic` runs without
  `LEGAL_RAG_API_BASE_URL` must not accidentally overwrite an existing
  credentialed/open-demo status report.
- Fresh clones without an existing report must still produce public-safe
  `unchecked` output and exit successfully.
- A deliberate override must exist for maintainers who really want to regenerate
  the unconfigured report.
- The report must not persist API bases, credentials, cookies, raw answers, raw
  citations, private provider endpoints, or model payload content.
- Update the observability spec so future synthetic scripts preserve existing
  evidence when env gaps are local runner configuration rather than product
  failures.

## Acceptance Criteria

- [x] Existing `public/status/legal-rag-synthetic.json` is preserved when the
      API base env is missing.
- [x] A fresh/no-report run still writes unchecked placeholders.
- [x] A force flag or env override can regenerate the unchecked report.
- [x] `npm.cmd run legal-rag:synthetic` passes without changing the current
      open-demo report in this workspace.
- [x] `npm.cmd run legal-rag:synthetic -- --force-unconfigured` passes and can
      be tested without leaving the forced report in the working tree.
- [x] `npm.cmd run reliability:check -- --timeout 12000 --strict` continues to
      summarize the preserved Legal RAG report.
- [x] `npm.cmd run site:status`, `npm.cmd run lint`, `npm.cmd run build`, and
      `git diff --check` pass.

## Notes

- This is a lightweight reliability hardening slice under the continuous
  improvement parent task.
- `npm.cmd run legal-rag:synthetic` preserved the existing `open-demo` report
  with unchanged SHA-256 `5BE2F36FA7EC71F0A97F7FAD0CD5D34D9167212F39992747AC09CB95457B1697`.
- A temp-file harness verified both no-report and `--force-unconfigured`
  unchecked-output paths, then restored the original report.
