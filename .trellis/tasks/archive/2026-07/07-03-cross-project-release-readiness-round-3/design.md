# 跨项目部署与可靠性收尾第三轮 Design

## Boundaries

This is a parent coordination task. It owns cross-project release-readiness rules and child-task ordering, but it should not directly change application code.

Child tasks own implementation and verification:

- `07-03-erp-production-registration-live-verify`
- `07-03-legal-rag-demo-access-qa-closure`
- `07-03-pet-apk-public-release-closure`
- `07-03-cross-project-scheduled-reliability-observability`
- `07-03-ai-daily-content-pipeline-phase-1`

Archived public-assistant GLM deployment closure is no longer an active child.
Current public-assistant frontier work is tracked by
`07-04-public-assistant-kg-lite` under the long-running continuous-improvement
parent task.

## Evidence Model

Use three evidence classes:

- Code-ready: local code, docs, tests, and scripts support the behavior.
- Deploy-ready: platform variables, branch configuration, and build/deploy routes are documented and ready for the user to enable.
- Live-verified: public URL, health endpoint, synthetic check, or screenshot proves the behavior is online.

Do not collapse these classes. A feature can be code-ready without being live-verified.

## Security Model

Secrets and credentials remain outside Git. Public demo credentials must be limited, revocable, and explicitly marked as demo-only. Model relay keys belong only in server-side platform environment variables.

## Rollout Shape

Each child task should follow this pattern:

1. Inspect current code, docs, task history, and deployment notes.
2. Identify manual gates and safe automation candidates.
3. Make the smallest code/doc/script changes needed for verifiability.
4. Run local checks.
5. If platform access is required, record exact manual instructions and a verification command.
6. Commit, push, archive the child task, and update this parent task summary if needed.

## Cross-Project Notes

Some sibling repositories are on non-main branches. Before claiming live deployment, compare the deployment platform branch with the branch containing the latest work.
