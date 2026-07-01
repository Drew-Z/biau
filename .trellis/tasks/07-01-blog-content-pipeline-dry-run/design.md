# Design

## Approach

This is a validation task, not a publishing task. The pipeline under test is:

1. Codex verifies evidence and task constraints.
2. The repository script calls one configured strong model profile.
3. Codex reviews the generated draft and records visible issues.
4. The task ends with a dry-run report and no public blog promotion.

## Artifacts

- `content-drafts/07-blog-content-system-build-log-draft.md`: target draft that
  may be overwritten by the dry run.
- `content-drafts/blog-content-system-build-log-draft.skill-dry-run.md`: dry-run
  report created by this task.

## Safety Boundary

- The command may load private model configuration internally.
- The assistant must not inspect or quote `.env.local`.
- Reports may mention profile/provider/model labels shown by commands, but must
  redact secrets and real relay details.
- Runtime public blog data and curation files are out of scope.

## Readiness Decision

The skill is considered ready for controlled use if:

- the command path is understandable and reproducible;
- failures, if any, are visible and actionable;
- the draft stays evidence-grounded and safe;
- review gates clearly explain whether a human can continue editing from the
  result.
