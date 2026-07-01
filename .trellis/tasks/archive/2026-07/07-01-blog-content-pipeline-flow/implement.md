# Implementation Plan

1. Start the Trellis task.
2. Load applicable pre-development guidance.
3. Record whether this run uses the built-in column template or a user-specified
   template.
4. Inspect topic metadata and existing draft.
5. Build an evidence pack from repository files and prior task notes.
6. Decide whether the existing draft should be refreshed.
7. If refreshing, update only the selected draft under `content-drafts/`.
8. Run review gates from `references/review-and-prompts.md`.
9. Run `npm.cmd run blog:check`.
10. Summarize whether the skill is ready for normal use and what remains before
   public promotion.

## Validation

- `npm.cmd run blog:model -- doctor --profile strong --format markdown`
- `npm.cmd run blog:plan`
- `npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft`
- `npm.cmd run blog:check`

No live model validation is part of this plan.
