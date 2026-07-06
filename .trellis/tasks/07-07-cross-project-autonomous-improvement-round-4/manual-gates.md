# Manual Gates

Use this file for user/platform actions that cannot be safely performed from the repo.

## Current Queue

- Render/Cloudflare/Aiven/Qdrant/Supabase variables: verify only by low-sensitive health and synthetic checks; never persist values.
- Public demo credentials: only low-privilege, public-safe, rotatable credentials may appear in public UI; real admin passwords stay private.
- APK release: Pet and Xunqiu downloads require signed release artifact, version notes, checksum, scan/regression evidence, rollback note, and user approval.
- Model calls: no liveness pings; only meaningful business tasks with safe prompts.
- Metrics/observability: enabling `/metrics`, Grafana, ARMS, Plausible/Umami, Cloudflare analytics, or tracing requires platform configuration and public-safe label review.
- Legal RAG public workbench entry: `site:status` currently reports a low-sensitive `network_error` / `timeout` class for `legal-rag-entry`; user/platform side should verify Render service health, region connectivity, and whether the public web service is sleeping, paused, or redeploying. Existing credentialed `legal-rag-synthetic.json` still records the protected functional flow as online, so do not rotate demo credentials solely from this entry reachability failure.

## Resolved Gates

- None yet for round 4.
