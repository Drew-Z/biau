# Manual Gates

Use this file for user/platform actions that cannot be safely completed from the repo.

## Current Queue

- Xunqiu APK public download requires signed release evidence, version notes, checksum, scan/regression evidence, rollback note, and explicit approval.
- Xunqiu backend production URL, health route behavior, database/service variables, and platform logs require user/platform confirmation if local evidence is insufficient.
- Xunqiu local synthetic currently preserves the existing report because `XUNQIU_SYNTHETIC_API_BASE_URL` and local artifact roots are not configured in this session.
- Playlab/game public links require confirmation if an external host is down, private, or blocked by platform configuration.
- Legal RAG public workbench returned timeout during Round 6 `site:status` even after bounded retry; platform-side Render health/cold-start/paused-service status still needs manual review.
- Pet APK public download remains gated on signed release artifact, checksum, regression evidence, and explicit approval.
- Legal RAG protected QA, contract review, and quality panel synthetic checks require low-permission demo credentials through environment variables only.
- ERP production demo login and plugin/sync smoke require low-permission demo account or desensitized fixtures.
- Studio / AI Daily production flow requires platform variable verification, migration confirmation, Studio token health check, and first real issue-to-hidden-draft review.
- Cloudflare, Render, Aiven, Qdrant, Supabase, Grafana, Umami/Plausible, Search Console, and ARMS configuration changes require user/platform action and must not be written into Git.
- Any real model call must be attached to a meaningful business task, not a liveness probe.

## Resolved Gates

- None yet for Round 6.
