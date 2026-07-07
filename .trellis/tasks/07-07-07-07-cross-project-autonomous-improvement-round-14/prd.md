# Cross-project autonomous improvement round 14

## Goal

Continue local-verifiable improvements across BIAU Port main site and related project surfaces, prioritizing public showcase quality, internal assistant, AI Daily, project details, and reliability observation while recording cloud/credential/model/APK gates as manual tasks.

## Requirements

- R1. Continue local, verifiable improvements without waiting on cloud dashboards, production credentials, model live calls, or APK approvals.
- R2. Prioritize improvements that make BIAU Port more trustworthy as a public showcase: project detail evidence, static routes, internal assistant safety/quality, AI Daily workflow, and reliability/status checks.
- R3. Keep each child task small enough to verify and roll back independently.
- R4. Do not run live model/provider pings, paid tasks, credentialed production checks, cloud writes, or APK publication without explicit user approval.
- R5. Record new manual gates in this PRD instead of blocking local work.
- R6. Commit completed child tasks locally and archive them before archiving this parent task.

## Acceptance Criteria

- [ ] At least one child task is completed, verified, committed locally, and archived.
- [ ] Manual gates found during this round are recorded in this PRD before archiving.
- [ ] No secrets, production credentials, private URLs, model relay endpoints, or unapproved APK links are committed.
- [ ] Finished child tasks are archived before the parent is archived.

## Initial Task Map

- `studio-draft-deeplink-ui-guard`: strengthen `/studio?draft=<id>` route-level UI checks so assistant-created draft links remain usable.
- `ai-daily-studio-issue-contract-followup`: optionally strengthen AI Daily issue detail route/data checks if local gaps appear.
- `project-detail-visual-alt-density-followup`: optionally enforce richer visual captions/alt density for case-study images.
- `status-generated-json-drift-guard`: optionally check generated status JSON stays aligned with `statusTargets.ts` contracts.

## Manual Gates

- GitHub SSH host key verification still blocks pushing local commits.
- Cloudflare, Render, Aiven/Supabase, Qdrant, Prometheus/Grafana/ARMS, Umami/Plausible, Search Console, and scheduled monitors remain platform setup tasks.
- Live model prompts, provider diagnostics, production assistant checks, and AI Daily model-assisted generation remain opt-in real tasks only.
- Legal RAG / ERP / Xunqiu credentialed checks require approved low-privilege demo credentials or production tokens.
- Pet/Xunqiu APK/AAB signing, checksum publication, and public download approval remain release gates.
