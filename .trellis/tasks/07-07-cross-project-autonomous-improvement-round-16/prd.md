# Cross-project autonomous improvement round 16

## Goal

Continue local-verifiable improvements across BIAU Port and related showcase surfaces after round 15, with emphasis on making data quality gates visible in rendered pages and keeping assistant/status/project surfaces trustworthy.

## Requirements

- R1. Keep each child task small, local, reviewable, and independently verifiable.
- R2. Prefer improvements that connect data contracts to rendered UI, generated outputs, or regression checks.
- R3. Do not run live model/provider pings, paid prompts, credentialed production checks, cloud writes, or APK publication without explicit user approval.
- R4. Do not commit secrets, private URLs, production credentials, raw model relay endpoints, signed APKs, or unapproved download links.
- R5. Record any new manual gate here instead of blocking local work.
- R6. Archive and commit each completed child task before archiving this parent.

## Acceptance Criteria

- [ ] At least one child task is completed, verified, committed, and archived.
- [ ] Manual gates found during this round are recorded before parent archive.
- [ ] Required validation for each child task passes or residual risk is documented.
- [ ] Finished child tasks are archived before the parent is archived.

## Candidate Task Map

- `project-visual-rendered-caption-ui-guard`: ensure project-detail visual captions/alt-backed images are rendered and not just present in data.
- `studio-token-state-ui-guards`: audit Studio token-dependent empty states and make UI checks deterministic.
- `assistant-diagnostics-render-guard`: strengthen internal assistant diagnostics UI checks for sanitized model/retrieval fields.
- `status-detail-route-render-guard`: add rendered status detail checks that mirror source/generated status contract.

## Manual Gates

- Cloudflare, Render, Aiven/Supabase, Qdrant, Prometheus/Grafana/ARMS, Umami/Plausible, Search Console, and scheduled monitors remain platform setup tasks.
- Live model prompts, provider diagnostics, production assistant checks, and AI Daily model-assisted generation remain opt-in real tasks only.
- Legal RAG / ERP / Xunqiu credentialed checks require approved low-privilege demo credentials or production tokens.
- Pet/Xunqiu APK/AAB signing, checksum publication, and public download approval remain release gates.
