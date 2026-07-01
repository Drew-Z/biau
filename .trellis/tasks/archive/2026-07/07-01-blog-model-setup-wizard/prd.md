# Blog model setup wizard

## Goal

Add a secrets-safe CLI wizard for configuring and checking blog draft model
profiles, so the author can set `strong`, `fast`, and `review` channels without
asking Codex to read or print private `.env.local` values.

## Background

- The blog draft generator already supports profile-specific variables such as
  `BLOG_DRAFT_STRONG_MODEL` and `BLOG_DRAFT_STRONG_API_KEY`.
- The previous dry run reached a configured `strong` channel but failed with a
  model routing error before a draft was written.
- The next useful step is setup and channel validation, not fallback logic.

## Requirements

- R1: Provide an npm command for an interactive model setup wizard.
- R2: Follow the `smart-search` style where practical: a setup command, a
  status/doctor command, parseable output formats, and clear recovery guidance.
- R3: Provide a non-draft-overwriting channel check command for a selected
  profile.
- R4: Support at least `default`, `strong`, `fast`, and `review` profiles.
- R5: Preserve `.env.local` as the private storage target and keep real values
  out of tracked files, logs, reports, and assistant responses.
- R6: Mask or omit existing secret values when showing current configuration.
- R7: Reuse the same profile resolution rules as `blog:draft`: profile-specific
  keys first, then default `BLOG_DRAFT_*`, then legacy `GEMINI_*`.
- R8: Missing API keys must fail before network access with a clear message.
- R9: Invalid temperatures should be handled safely and predictably.
- R10: `status` and default `doctor` should be safe and offline; `doctor --live`
  may perform an explicit minimal request to validate routing.
- R11: Documentation should explain how to run the wizard, how to check a
  channel, and why fallback is still out of scope.

## Out Of Scope

- Do not publish or regenerate blog drafts as part of setup.
- Do not add multi-model fallback in this task.
- Do not store API keys in tracked files.
- Do not inspect or quote existing `.env.local` contents in task notes.

## Acceptance Criteria

- [x] `package.json` exposes `blog:model`, a wizard alias, and a check alias.
- [x] A `blog:model` CLI supports `setup`, `status`, `doctor`, and `config path`
      style commands.
- [x] The wizard can update a selected profile in `.env.local`.
- [x] The doctor/check command validates the selected profile without writing any
      draft.
- [x] Current config display masks secrets and does not print real relay URLs.
- [x] `status` and `doctor` support agent-readable JSON and human-readable
      Markdown output.
- [x] The blog draft generator and wizard share profile/config resolution logic.
- [x] Missing-key behavior is tested with intentionally empty env overrides.
- [x] Relevant docs/specs are updated.
- [x] `npm.cmd run blog:check`, `npm.cmd run lint`, and relevant script checks pass.
