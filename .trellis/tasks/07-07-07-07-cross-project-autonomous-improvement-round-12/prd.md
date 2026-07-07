# Cross-project autonomous improvement round 12

## Goal

Continue the long-running BIAU Port improvement goal with local-verifiable work across public showcase, internal assistant, AI Daily, project details, and reliability observation. Record manual gates for cloud, credentials, model live calls, and APK publication without blocking other progress.

## Background

- The long-running user goal is to keep improving `blog-semi` and related project surfaces while the user is away.
- Round 11 finished deterministic project-detail evidence gates and assistant/RAG offline gates.
- The repository is clean, `main` is ahead of `origin/main`, and pushing remains blocked by the GitHub SSH host-key manual gate.
- This round should continue with small, independently verifiable child tasks rather than opening broad, unverifiable rewrites.

## Requirements

- R1. Continue local, verifiable improvements without waiting for user input unless a true manual gate appears.
- R2. Prioritize work that improves public showcase quality, AI Daily / Content Studio workflow quality, internal assistant trust, project detail evidence, or reliability observation.
- R3. Do not run model/provider live pings, credentialed production checks, paid tasks, cloud dashboard changes, or APK release publication without explicit user approval.
- R4. Record manual gates instead of blocking other local work.
- R5. Keep each child task independently verifiable, small enough to roll back, and backed by deterministic scripts, lint/build, docs, or local smoke checks.

## Acceptance Criteria

- [ ] At least one child task is completed, verified, committed locally, and archived.
- [ ] Manual gates found during this round are recorded in this PRD before archiving.
- [ ] No secrets, production credentials, private URLs, model relay endpoints, or unapproved APK links are committed.
- [ ] Finished child tasks are archived before the parent is archived.

## Initial Task Map

- `ai-daily-studio-quality-gate`: strengthen deterministic validation around AI Daily issue/detail data or Content Studio draft metadata so public content stays evidence-rich and publishable.
- `reliability-status-contract-gate`: strengthen status/reliability checks and docs around stale, unchecked, planned, degraded, and gated states.
- `public-content-manual-gate-ledger`: consolidate manual gates for cloud, credentials, live model calls, production registration, Legal RAG, and APK publication into a clearer repo-visible checklist if existing docs are fragmented.

## Manual Gates

- GitHub SSH host key verification still blocks pushing local commits.
- Cloudflare, Render, Aiven/Supabase, Prometheus/Grafana/ARMS, Umami/Plausible, Search Console, and scheduled monitors remain platform setup tasks.
- Live model prompts, provider diagnostics, production assistant checks, and AI Daily model-assisted generation remain opt-in real tasks only.
- Legal RAG / ERP / Xunqiu credentialed checks require approved low-privilege demo credentials or production tokens.
- Pet/Xunqiu APK/AAB signing, checksum publication, and public download approval remain release gates.
