# Implement

## Checklist

1. Read applicable Trellis specs through `trellis-before-dev`.
2. Add `scripts/check-legal-rag-synthetic.mjs`.
3. Add `legal-rag:synthetic` package script.
4. Update `scripts/generate-site-status.ts` to merge Legal RAG synthetic output.
5. Update docs/task notes with env usage and validation.
6. Run validation and sensitive scan.
7. Commit, push, archive, journal.

## Validation Commands

- `npm.cmd run legal-rag:synthetic`
- `npm.cmd run site:status`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- Sensitive scan over changed and untracked files.

## Human Gates

- Do not add real Legal RAG email/password to repo.
- Do not enable scheduled production checks or alerting.
- Do not expose demo credentials on `/status`.

## Rollback

- Remove `scripts/check-legal-rag-synthetic.mjs`.
- Remove `legal-rag:synthetic` script.
- Revert status merge changes and regenerate `public/status/site-status.json`.
