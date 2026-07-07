# Cross-project autonomous improvement round 15

## Goal

Continue local-verifiable improvements across BIAU Port and related showcase surfaces after round 14, prioritizing items that improve visitor trust, editor workflow, assistant quality, and reliability evidence without requiring live cloud/model/credential actions.

## Requirements

- R1. Keep work local, reviewable, and independently verifiable.
- R2. Prefer small child tasks that improve a public or editorial surface: Studio, AI Daily, project detail pages, status/reliability checks, assistant diagnostics, or cross-project links.
- R3. Do not run live model/provider pings, paid prompts, credentialed production checks, cloud writes, or APK publication without explicit user approval.
- R4. Do not commit secrets, private URLs, production credentials, raw model relay endpoints, signed APKs, or unapproved download links.
- R5. Record any new manual gate here instead of blocking other local work.
- R6. Archive and commit each completed child task before archiving this parent.

## Acceptance Criteria

- [x] At least one child task is completed, verified, committed, and archived.
- [x] Manual gates found during this round are recorded before parent archive.
- [x] Required validation for each child task passes or the residual risk is documented.
- [x] Finished child tasks are archived before the parent is archived.

## Candidate Task Map

- `ai-daily-issue-route-determinism-followup`: strengthen AI Daily issue route checks around no-token/readiness behavior if more route-state gaps appear.
- `studio-token-state-ui-guards`: audit Studio routes that depend on stored tokens and add deterministic UI checks for empty-token states.
- `status-generated-json-drift-guard`: verify generated status JSON stays aligned with `statusTargets.ts` and detailed status routes.
- `project-detail-visual-alt-density-followup`: enforce richer alt/caption density for case-study body visuals.
- `assistant-studio-artifact-link-followup`: continue hardening assistant-created Studio draft links and diagnostics if local gaps appear.

## Manual Gates

- No new manual gates were introduced in this round.
- Cloudflare, Render, Aiven/Supabase, Qdrant, Prometheus/Grafana/ARMS, Umami/Plausible, Search Console, and scheduled monitors remain platform setup tasks.
- Live model prompts, provider diagnostics, production assistant checks, and AI Daily model-assisted generation remain opt-in real tasks only.
- Legal RAG / ERP / Xunqiu credentialed checks require approved low-privilege demo credentials or production tokens.
- Pet/Xunqiu APK/AAB signing, checksum publication, and public download approval remain release gates.
