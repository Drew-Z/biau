# Implementation Plan

1. Start the Trellis task.
2. Read required skill references:
   - `.agents/skills/blog-content-pipeline/references/templates.md`
   - `.agents/skills/blog-content-pipeline/references/review-and-prompts.md`
   - `.agents/skills/blog-content-pipeline/references/usage.md`
3. Inspect the current draft and evidence paths named by the draft.
4. Create a dry-run report with pending stages.
5. Run:
   `npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft --force --generate --profile strong`
6. Inspect the generated draft for:
   - evidence support
   - private/sensitive detail leakage
   - structure and column fit
   - overlap with project/detail pages
   - image requirements and source policy
   - promotion readiness
7. Run `npm.cmd run blog:check` and `npm.cmd run lint`; run broader checks only
   if runtime files are touched.
8. Update the report with results, blockers, and follow-up recommendations.
9. Commit and push the task artifacts and report.
