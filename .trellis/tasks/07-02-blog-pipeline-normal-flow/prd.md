# Run blog content pipeline normal flow

## Goal

Run one normal `blog-content-pipeline` session from the correct entry point so
the workflow proves it starts with task consent, a writing-mode gate, model
setup confirmation, and an understandable model-assisted generation strategy
before any draft generation.

The immediate value is operational confidence: future blog work should no
longer skip model setup, expose secrets in an unsafe prompt, hide required
field formats, or silently fall back to an underpowered single-model flow when
the user expects a model-assisted drafting pipeline.

## Confirmed Facts

- The repository is clean on `main` before this task starts.
- `package.json` exposes `blog:plan`, `blog:draft`, `blog:model`,
  `blog:model:wizard`, `blog:model:check`, and `blog:check`.
- `content-drafts/README.md` requires each run to start by choosing one writing
  mode: `Codex-only scaffold/review`, `model-assisted draft/rewrite`,
  `review-only`, or `publish reviewed content`.
- The `blog-content-pipeline` skill requires `model-assisted` runs to set or
  confirm a model profile before generation, normally `strong`, then run masked
  offline `status` and `doctor`.
- `scripts/configure-blog-model.mjs` shows `setup` requires an interactive
  terminal and writes private values to `.env.local`; offline `status` and
  `doctor` load local env values but mask sensitive output.
- Current setup prompts ask for raw fields directly and do not show a
  smart-search-style beginner guide with recommended model roles or examples.
- Current setup asks for `TEMPERATURE`, although many OpenAI-compatible relays
  either ignore it or do not require users to configure it explicitly.
- Current draft generation supports one model profile per `--generate` command;
  `review-and-prompts.md` currently says to use one strong content model by
  default and reserves `review` for optional secondary review.
- Live model checks, `doctor --live`, and `blog:draft -- --generate` require
  explicit user approval for that small model task.
- The user selected `model-assisted draft/rewrite` for this normal run.
- The user selected `strong` as the target model profile.
- The user selected interactive setup for the `strong` profile before offline
  checks or generation.
- The user wants Codex to be treated as one drafting/reviewing participant, plus
  at least one configured generation model and one configured polishing model.
- The user explicitly approved borrowing the smart-search setup style and noted
  that smart-search also uses a three-model setup pattern.
- Implementation added a smart-search-style guided setup for `strong`, `review`,
  and `fast`, plus `status --all`, `doctor --all`, and `profile-specific`
  reporting.
- Earlier offline checks showed the local `.env.local` values were usable but
  still resolved through fallback/legacy values, which correctly blocked
  generation until real profile-specific setup was completed.
- After user setup, masked offline `status --all` and `doctor --all` showed
  `strong`, `review`, and `fast` are all `profile-specific: true`.
- One approved live generation was run for `chunk-strategy-public` using the
  `strong` profile. The first model body was readable but missed review-gate
  headings, so the generator now wraps model output in the evidence-first
  scaffold and stores the generated body under `## Draft Body`.
- One approved `review` profile polish pass was run against
  `content-drafts/02-chunk-strategy-public.md`. The script now supports
  `--polish-from` so the polishing model rewrites the existing `## Draft Body`
  while preserving evidence, safety, and promotion sections.

## Requirements

- R1. The run must begin with an explicit writing-mode choice and record the
  chosen mode in the task notes or resulting draft evidence.
- R2. If the chosen mode is `model-assisted draft/rewrite`, the flow must ask
  the user to set or confirm the model profile before generation.
- R3. Offline masked model checks may be run after setup/confirmation, but live
  checks and generation must not be run unless separately approved.
- R4. The run should use existing repository scripts and skill references,
  without inventing a parallel manual workflow.
- R5. The model setup wizard should show recommended model roles, field formats,
  and concrete safe examples before asking for values.
- R6. The API key input must not echo in the terminal and must not be printed by
  status, doctor, errors, draft metadata, or committed files.
- R7. Temperature should be optional rather than a required beginner setup
  field; the workflow may keep a default value internally when the relay accepts
  it.
- R8. The recommended generation strategy should be upgraded from single-model
  drafting to a staged flow: Codex evidence/scaffold, configured generation
  model draft, configured polishing model rewrite, then Codex final review and
  ingestion.
- R9. The output of this task may be a draft scaffold, model setup verification
  notes, or a review-only result depending on the selected mode.

## Out Of Scope

- Publishing a public blog post.
- Running live model requests without explicit approval.
- Changing runtime blog data unless the user later chooses a publish flow.
- Publishing or committing real model credentials.

## Acceptance Criteria

- [x] The chosen writing mode is recorded: `model-assisted draft/rewrite`.
- [x] The selected model strategy and model channel/profile is recorded:
      `strong` for model-assisted draft/rewrite.
- [x] If `model-assisted` is chosen, setup/confirmation is selected before any
      generation command.
- [x] If `model-assisted` is chosen, real setup/confirmation happens before any
      generation command.
- [x] The setup wizard presents recommended model roles and field examples
      before prompting for secrets.
- [x] API key entry is hidden or the command refuses to collect it in an unsafe
      terminal.
- [x] Temperature is optional for beginner setup.
- [x] The model-assisted strategy records Codex + generation model + polishing
      model roles.
- [x] Any fallback or legacy model profile warning is surfaced instead of
      treated as fully configured.
- [x] No live model request is sent unless the user explicitly approves it.
- [x] The final result states what was run, what was not run, and what remains
      for the next blog step.

## Decisions

- D1. Before continuing the normal model-assisted run, this task should first
  improve the model setup wizard and staged multi-model strategy.
- D2. The improved wizard should borrow smart-search's setup pattern: grouped
  beginner flow, examples before prompts, optional advanced fields,
  non-interactive setup flags, masked output, and explicit next-step commands.

