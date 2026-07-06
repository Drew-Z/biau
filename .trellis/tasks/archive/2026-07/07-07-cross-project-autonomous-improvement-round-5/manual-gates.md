# Manual Gates

Use this file for user/platform actions that cannot be safely completed from the repo.

## Current Queue

- Legal RAG public workbench sometimes times out. Check Render service health, cold-start, paused/suspended state, recent deploy status, and route health from the platform dashboard.
- Legal RAG protected QA, contract review, and quality panel synthetic checks require low-permission demo credentials through environment variables only.
- Pet APK public download requires signed release APK/AAB, version notes, checksum, scan/regression evidence, rollback note, and explicit approval.
- Xunqiu APK public download requires signed release evidence, version notes, checksum, scan/regression evidence, rollback note, and explicit approval.
- Studio / AI Daily production flow requires platform variable verification, database migration confirmation, `/studio/api/health` verification with a Studio token, and first real issue-to-hidden-draft review.
- ERP login smoke requires a low-permission, rotatable demo account through environment variables; plugin/sync smoke requires a desensitized fixture or dedicated demo shop.
- Cloudflare, Render, Aiven, Qdrant, Supabase, Grafana, Umami/Plausible, Search Console, and ARMS configuration changes require user/platform action and must not be written into Git.
- Any real model call must be attached to a meaningful business task, not a liveness probe.

## Resolved Gates

- Main-site status contracts now guard ERP registration, Pet APK release, and Legal RAG credentialed protected checks, so these gates are visible and locally enforceable even while platform actions remain pending.
