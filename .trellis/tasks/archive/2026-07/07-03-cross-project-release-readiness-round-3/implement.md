# 跨项目部署与可靠性收尾第三轮 Implement

## Execution Checklist

- [ ] Keep this parent task in planning until child tasks have enough PRD coverage.
- [ ] Fill child PRDs with goal, requirements, manual gates, acceptance criteria, and recommended first implementation step.
- [ ] Start only one child task at a time unless the work is read-only or platform-independent.
- [ ] Before editing code in a child task, load `trellis-before-dev`.
- [ ] After code changes, run the smallest relevant checks first, then broader checks before commit.
- [ ] Push successful commits on `blog-semi/main` unless the user says not to push.
- [ ] For sibling repositories, confirm the current branch and deployment branch before claiming online availability.

## Recommended Order

1. `07-03-erp-production-registration-live-verify`
2. `07-03-legal-rag-demo-access-qa-closure`
3. `07-03-cross-project-scheduled-reliability-observability`
4. `07-03-pet-apk-public-release-closure`
5. `07-03-ai-daily-content-pipeline-phase-1`

Note: `07-03-public-assistant-glm-live-closure` is archived. Current public
assistant Agentic Hybrid RAG work is tracked by
`07-04-public-assistant-kg-lite`.

## Validation Commands

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:ui`
- `npm.cmd run main-site:synthetic`
- `npm.cmd run cf-assistant:smoke`
- `npm.cmd run erp:synthetic` when ERP URL is configured.
- `npm.cmd run legal-rag:synthetic` when Legal RAG URL and demo credentials are configured.
- `npm.cmd run pet-showcase:synthetic`

Use only the commands relevant to the child task. Do not run live checks without required public URLs and safe demo credentials.

## Rollback Points

- Revert only the current child task changes, never unrelated user changes.
- If deployment variables are wrong, fix platform configuration rather than committing secrets.
- If a public URL fails due to cold start or platform outage, mark the check degraded and record evidence instead of rewriting content as online.
