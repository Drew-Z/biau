# Legal RAG demo and monitoring implementation plan

## Checklist

- [x] Start the Trellis child task.
- [x] Load relevant BIAU Port specs before editing synthetic/status files.
- [x] Read Legal RAG local rules and package scripts.
- [x] Run Legal RAG local API quality checks:
  - `npm.cmd --workspace apps/api run test:unit`
  - `npm.cmd --workspace apps/api run validate`
  - `npm.cmd --workspace apps/api run evaluate`
  - `npm.cmd --workspace apps/api run evaluate:review`
- [x] Verify public Web/API reachability with low-sensitive requests only.
- [x] Improve Legal RAG synthetic error classification and status mapping if current output leaks raw `fetch failed` or marks configured network failures as `unchecked`.
- [x] Regenerate `legal-rag-synthetic.json` and `site-status.json`.
- [x] Update parent manual gates and status copy if needed.
- [x] Run final BIAU Port checks: `legal-rag:synthetic`, `site:status`, `lint`, `build`, `check:ui`, `git diff --check`, sensitive scan.
- [ ] Commit and push BIAU Port changes on `main`.
- [ ] Archive the child task after verification.

## Manual Gates

- Platform owner should verify Render Web/API service health, paused/suspended status, cold-start behavior, and redeploy state when public API health cannot be confirmed.
- Credentialed Legal RAG synthetic requires a low-permission, public-safe, rotatable demo account supplied via environment variables. Do not put the password in project pages or blog posts.
- Prometheus/Grafana/LLM tracing or external uptime checks require platform configuration and low-sensitive label review.
