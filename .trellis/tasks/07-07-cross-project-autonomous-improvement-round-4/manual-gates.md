# Manual Gates

Use this file for user/platform actions that cannot be safely performed from the repo.

## Current Queue

- Render/Cloudflare/Aiven/Qdrant/Supabase variables: verify only by low-sensitive health and synthetic checks; never persist values.
- Public demo credentials: only low-privilege, public-safe, rotatable credentials may appear in public UI; real admin passwords stay private.
- APK release: Pet and Xunqiu downloads require signed release artifact, version notes, checksum, scan/regression evidence, rollback note, and user approval.
- Model calls: no liveness pings; only meaningful business tasks with safe prompts.
- Metrics/observability: enabling `/metrics`, Grafana, ARMS, Plausible/Umami, Cloudflare analytics, or tracing requires platform configuration and public-safe label review.
- Legal RAG demo: latest checks show API health can recover, but the public workbench entry has also fluctuated between online and low-sensitive `network_error`/timeout during this round. Protected legal QA, contract review, and quality panel synthetic remain credential-gated. Provide a low-permission, rotatable demo account only through `LEGAL_RAG_SYNTHETIC_EMAIL` / `LEGAL_RAG_SYNTHETIC_PASSWORD` before rerunning credentialed checks; if Web/API entry fails again, verify Render service health, cold-start, paused/suspended state, and redeploy status from the platform dashboard.
- Pet APK release: latest Pet synthetic reports showcase online, screenshots reachable, and `apkGate.status=debug-only`; only debug APK artifacts were found locally. Public download still requires signed release APK/AAB, version notes, checksum, scan/regression evidence, rollback note, and explicit approval.
- Xunqiu backend/APK: latest Xunqiu synthetic has no production API base configured, so backend health and compatibility APIs remain unchecked. `apkGate.status=stage-apk-found` confirms a stage APK artifact exists, but formal public release still requires signed release evidence, version notes, checksum, scan/regression evidence, rollback note, and explicit approval.
- Playlab/Game release: latest Playlab synthetic confirms the public entry, 6/6 playable pages, 36/36 discovered resources, and 5/5 mobile/control hint terms. Publishing any new playable build, domain, CDN, upload, or release-host change still needs explicit approval and version notes.
- Studio / AI Daily production: user/platform side still needs to verify Render `biau-content-studio-api` variables, run `prisma:migrate:studio`, confirm `/studio/api/health` with a Studio token, and perform the first real AI Daily issue -> hidden review draft conversion. The safe local gate `studio:smoke` passes without live model calls.
- ERP demo: latest public bootstrap synthetic confirms `registrationEnabled=true` and API health is online. To verify the login path, create or confirm a low-privilege, rotatable demo account and provide it only through environment variables for `ERP_SYNTHETIC_USERNAME` / `ERP_SYNTHETIC_PASSWORD`; plugin/sync smoke still needs a desensitized fixture or dedicated demo shop, never real store credentials.

## Resolved Gates

- None yet for round 4.
