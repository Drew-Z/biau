# Production preflight evidence

## Source

- Release branch: `codex/public-assistant-productization`
- Remote comparison: zero commits behind and 19 commits ahead of `origin/main` at preflight time.
- Working tree was clean before this task was created.

## Render

- Public service deploys branch `main` with automatic deploy disabled.
- Build command generates knowledge and Prisma client, then builds the server.
- Start command runs `prisma migrate deploy` before the server.
- Current live deploy predates the release branch.
- Studio and RAG are separate service modes and are outside this rollout.

## Supabase

- Both known projects are healthy and contain the legacy public-assistant schema.
- The project named `biau-internal-assistant-db` contains 9 Sessions, 10 Turns, and 1 Feedback row at preflight; the Studio project contains zero public Sessions.
- Both report `20260726010000_public_assistant_product` as the latest successful Prisma migration.
- The immutable revision migration is pending.
- All 9 Sessions and 10 Turns were created during one testing window on 2026-07-26. Aggregate metadata reports 10 answers, no positive feedback, and one negative feedback.
- Official Supabase backup guidance says paid projects receive scheduled backups; free projects should regularly create logical dumps with the Supabase CLI or `pg_dump`.

Reference: https://supabase.com/docs/guides/platform/backups

## Cloudflare

- The connected Cloudflare account is healthy but lists only an unrelated Pages project.
- BIAU Pages deployment identity and rollback cannot be managed through the current connector.
- `https://biau.playlab.eu.cc/` currently responds with HTTP 200 behind Cloudflare.

## Safety conclusion

The user explicitly approved treating every current public-assistant record as disposable test data and skipping backup. The migration was applied and parity was verified before the migrated records were deleted. No conversation content was read or exported.

## Release evidence

- Cloudflare Pages deployment `0b1203f4-6468-4cfb-b823-081e03f06b15` completed successfully for release commit `793636d862d62760597fc138bcc696386627f493`.
- Render service `biau-public-assistant-api` (`srv-d96spq6q1p3s73fvb4j0`) deployed `dep-d9keenn10e5c73b1kvq0` and reached `live` for the same commit. The previous live deploy was retained as `dep-d9iv5p7aqgkc73ann930`.
- Supabase project `wkbyfxoawitbkitckipy` applied each of the three pending migrations exactly once: `20260727010000_public_assistant_session_history`, `20260728010000_public_assistant_idempotent_requests`, and `20260728020000_public_assistant_answer_revisions`.
- Post-migration parity: 9 Sessions, 10 Turns, 9 Branches, 10 Revisions, 1 Feedback, 0 Requests, and 4 Aggregates; all active branches, turn revisions, feedback revisions, and completed response projections were valid; legacy Turn answer columns were absent; all seven ownership/immutability triggers were present.
- Approved cleanup completed in one transaction. Remaining public-assistant counts are all zero for Session, Turn, Branch, Revision, Request, Feedback, and Aggregate.
- Supabase Security Advisor reported intentional backend-only `rls_enabled_no_policy` INFO notices and two `function_search_path_mutable` WARN notices for the new trigger functions. Performance Advisor reported mostly unused indexes on a fresh, empty test surface plus a small number of existing/uncovered foreign keys. No critical finding blocked this rollout; search-path hardening is a follow-up migration.
- Render `/health` returned HTTP 200 with readiness flags and no exact model/provider identity. The Cloudflare Branch proxy returned the expected bounded HTTP 400 for an invalid, non-model request. Render error logs were empty for the sampled window.
- Production Playwright smoke passed at desktop `1440x960` and mobile `390x844`: assistant open, history, new conversation, fullscreen, empty-history state, panel containment, message/composer separation, and mobile visible touch targets. No model, search, embedding, reranker, or vector request was issued.
