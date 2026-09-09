# 审计执行清单

1. Read the current parent assessment, remaining gates, language specs, SEO implementation, public route components, and typed data projections.
2. Build a field-level inventory for project, blog, AI Daily, public assistant, and shared SEO output; cite exact files and line numbers.
3. Reuse deterministic repository checks only where they answer an audit question: `blog:check`, `project-details:check`, `project-registry:check`, `assistant:public-api-check`, `assistant:public-conversation-check`, `assistant:public-browser-state-check`, `ai-daily:public-payload-check`, `analytics:check`, and `git diff --check`.
4. Do not run production readiness actions, model evaluation, publish, Feed/Cron, or network-dependent public-link mutation commands.
5. Write `audit.md` and `verification.md`; state whether a bounded implementation child is justified or which product/production decision blocks it.
6. Check `git status --short --branch`, ensure only this task's artifacts are staged, then commit and return to the parent task for reassessment.\n
