# Cross-project autonomous improvement round 11

## Goal

Continue autonomous local improvements for BIAU Port and related project surfaces, prioritizing visitor-readable project detail quality, evidence-backed content, deterministic quality gates, assistant reliability, and operational visibility while recording cloud, credential, live model, and release gates as manual follow-ups.

## Requirements

- R1. Continue local, verifiable improvements without waiting for user input unless a true manual gate appears.
- R2. Prefer changes that improve public project details, inline screenshots/diagrams, status reliability, Studio/AI Daily workflow quality, or assistant answer trust.
- R3. Do not run live model/provider pings, credentialed production checks, paid tasks, cloud dashboard changes, or APK release publication without explicit user approval.
- R4. Record manual gates instead of blocking further local work.
- R5. Keep each child task independently verifiable, small enough to roll back, and backed by deterministic scripts, lint/build, or documented manual evidence.

## Acceptance Criteria

- [ ] At least one child task is completed, verified, committed locally, and archived.
- [ ] Manual gates are recorded in task notes.
- [ ] No secrets, production credentials, private URLs, model relay endpoints, or unapproved APK links are committed.
- [ ] Finished child tasks are archived before the parent is archived.

## Initial Task Map

- `project-detail-evidence-gate`: add a deterministic quality check that prevents project detail pages from regressing to thin text, single-hero-only media, or mismatched evidence.

## Manual Gates

- GitHub SSH host key verification still blocks pushing local commits.
- Cloudflare, Render, Aiven/Supabase, Prometheus/Grafana/ARMS, Umami/Plausible, Search Console, and scheduled monitors remain platform setup tasks.
- Live model prompts, provider diagnostics, production assistant checks, and AI Daily model-assisted generation remain opt-in real tasks only.
- Legal RAG / ERP / Xunqiu credentialed checks require approved low-privilege demo credentials or production tokens.
- Pet/Xunqiu APK/AAB signing, checksum publication, and public download approval remain release gates.
