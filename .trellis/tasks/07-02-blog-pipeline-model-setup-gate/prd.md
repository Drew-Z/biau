# Add model setup gate to blog pipeline

## Goal

Make the normal `blog-content-pipeline` workflow start with an explicit writing
mode and model setup gate, so a first-time or repeat user is not taken through a
"normal flow" without being asked whether to configure or use a model.

## User Value

- The user can tell whether the run is `Codex-only scaffold/review` or
  `model-assisted draft/rewrite` before any draft work starts.
- Model setup becomes part of the normal onboarding path, not a hidden optional
  footnote.
- Safe behavior remains intact: offline checks are allowed by default, but live
  model checks and generation still require explicit approval.

## Confirmed Facts

- `blog-content-pipeline` already documents model profiles and a setup CLI under
  `.agents/skills/blog-content-pipeline/references/usage.md`.
- `npm.cmd run blog:model -- setup --profile strong` exists as an interactive
  setup wizard.
- `npm.cmd run blog:model -- status --profile strong --format markdown` and
  `npm.cmd run blog:model -- doctor --profile strong --format markdown` are
  offline and masked.
- `doctor --live` and `blog:draft -- --generate` may contact a model provider
  and must not run unless the user explicitly approves a small model task.
- The previous normal-flow run skipped setup because it was scoped as an offline
  draft/review flow; that was safe, but incomplete for first-time skill usage.
- The `blog-draft-workflow` spec now records that custom article templates must
  preserve evidence scaffold headings and can place reader-facing content under
  `## Draft Body`.

## Requirements

- R1: Add a "mode gate" to the blog pipeline instructions: every new draft or
  rewrite run starts by choosing one of:
  - `Codex-only scaffold/review`
  - `model-assisted draft/rewrite`
  - `review-only`
  - `publish reviewed content`
- R2: For `model-assisted draft/rewrite`, instruct the agent to ask the user to
  set or confirm the target profile before generation, normally with
  `npm.cmd run blog:model -- setup --profile strong`.
- R3: Offline `status` / `doctor` checks should be part of the model-assisted
  preflight. If the selected profile resolves through fallback or legacy values,
  the workflow should surface that and recommend setup before generation.
- R4: `Codex-only scaffold/review` must remain valid and should record
  `model channel: none` or equivalent in the evidence pack instead of forcing
  model setup.
- R5: Do not run `doctor --live`, `blog:draft -- --generate`, or any live model
  request unless the user explicitly approves that small task.
- R6: Do not read, print, or commit real relay URLs, API keys, accounts, private
  endpoints, local secret paths, or private environment values.
- R7: Update the reusable skill docs and local workflow/spec docs so future runs
  cannot reasonably skip this decision point.

## Out Of Scope

- No live model test.
- No model generation.
- No credential editing by Codex.
- No fallback behavior implementation.
- No public blog publication.

## Acceptance Criteria

- [x] `blog-content-pipeline` skill instructions include an explicit mode gate.
- [x] Usage docs place model setup before model-assisted generation in the
      normal command flow.
- [x] Review/prompt protocol asks for the selected writing mode and model channel
      before drafting.
- [x] `.trellis/spec/backend/blog-draft-workflow.md` records the mode gate as an
      executable convention.
- [x] Validation commands run without live model use.
- [x] The task records that no live model call or credential read occurred.

## Validation Notes

- `npm.cmd run blog:model -- status --profile strong --format markdown` passed
  as an offline masked status check. It reported fallback/legacy resolution,
  which is now explicitly treated as a setup gap for model-assisted runs.
- `npm.cmd run blog:model -- doctor --profile strong --format markdown` passed
  offline and reported that no model request was sent.
- `npm.cmd run blog:check` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed with existing Vite dynamic-import warnings only.
- `git diff --check` reported only Windows line-ending warnings.
- Sensitive scan found placeholder env key names only; no real relay URL, API
  key, account, private endpoint, or local secret value was recorded.
- No `doctor --live`, `blog:draft -- --generate`, live model request, credential
  edit, or private environment value read was performed.