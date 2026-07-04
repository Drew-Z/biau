# Blog model fallback channels

## Goal

Update the blog content pipeline model tooling so each writing profile can have
one primary model channel plus one or more same-role fallback channels. The
workflow should let a user choose whether to configure fallback channels during
initial setup, add them later through the guided CLI, inspect them safely through
masked offline status/doctor commands, and use them during real draft/polish
generation without leaking secrets or silently changing writing roles.

## Background

- The current blog model contract has one main channel per profile:
  `BLOG_DRAFT_STRONG_*`, `BLOG_DRAFT_REVIEW_*`, and `BLOG_DRAFT_FAST_*`.
- `scripts/blog-model-config.mjs` resolves a selected profile through this
  order: profile-specific values, shared `BLOG_DRAFT_*`, legacy `GEMINI_*`,
  then hardcoded non-secret fallbacks.
- `scripts/configure-blog-model.mjs` currently configures, reports, and checks
  one channel per profile. `status` and default `doctor` are offline and must
  stay masked.
- `scripts/generate-blog-draft.mjs` currently sends one OpenAI-compatible
  request through `readDraftModelConfig(profile)`. If `fetch` fails, times out,
  returns non-OK, or returns empty content, the command fails immediately.
- The recent `review` polish attempt for
  `content-drafts/agentic-rag-frontier-2026-polished.md` failed twice: one
  command timeout and one `fetch failed`. The file was not modified, but the
  incident shows why same-role fallback channels are useful.
- The blog-content-pipeline skill and usage docs currently document the
  three-profile setup, but not per-profile fallback channel lists.

## Requirements

- Same-profile fallback is automatic during real generation/polish after a
  channel failure. Attempts are serial and deterministic: primary first, then
  fallback channels in numeric order.
- Users can keep the current single-channel setup with no fallback channels.
- Users can optionally configure fallback channels during beginner setup for
  each of `strong`, `review`, and `fast`.
- Users can add fallback channels later through an explicit guided command.
- Fallback channels must be same-role channels under the selected profile, not
  cross-role fallback from `review` to `strong` or `fast` unless the user runs a
  command with a different explicit `--profile`.
- Status output must show primary and fallback channel readiness using only
  non-secret provider/model labels plus set/missing flags for base URL and API
  key.
- Offline doctor must validate all configured primary/fallback channel shapes
  without sending model requests.
- Draft generation and polish must try the selected profile's primary channel
  first and then same-profile fallback channels in deterministic order when a
  channel fails to produce valid content.
- Command output must show which non-secret channel label succeeded, which
  channel attempts failed, and a redacted diagnostic reason without printing
  keys or real relay URLs.
- Existing `.env.local` values and old single-profile variables must remain
  compatible.
- Public examples may contain placeholder variable names and placeholder URLs
  only.
- The skill docs, usage reference, `.env.example`, and related draft workflow
  docs must describe the new contract.

## Acceptance Criteria

- [ ] `npm.cmd run blog:model -- setup` offers fallback configuration as an
      optional step for each recommended profile.
- [ ] A later setup path can add or update a fallback channel for one explicit
      profile without reconfiguring all profiles.
- [ ] `npm.cmd run blog:model -- status --all --format markdown` reports
      primary and fallback channel readiness without exposing real base URLs or
      API keys.
- [ ] `npm.cmd run blog:model -- doctor --all --format markdown` remains
      offline and checks primary/fallback channel completeness.
- [ ] A model-assisted `blog:draft -- --generate` or `--polish-from` tries
      same-profile fallback channels after retryable primary-channel failures
      and records the winning non-secret provider/model label.
- [ ] Missing fallback fields produce actionable setup guidance instead of
      silent fallback to unrelated roles.
- [ ] Existing single-channel `.env.local` configurations continue to work.
- [ ] `.env.example`, `SKILL.md`, `references/usage.md`,
      `references/review-and-prompts.md`, and the backend blog draft workflow
      spec are updated to match the new behavior.
- [ ] Validation commands cover plan parsing, masked status/doctor output,
      fallback parsing, dry-run/error paths, `blog:check`, `lint`, and `build`.

## Out Of Scope

- No casual live model diagnostics or provider health pings.
- No parallel model calls by default.
- No automatic cross-role fallback, such as using the `strong` generation model
  when `review` polishing fails.
- No public commits of real relay URLs, API keys, accounts, private endpoints,
  or exact upstream error bodies.
- No change to the blog article content itself except for validation fixtures or
  docs needed by this task.

## Decisions

- Same-profile fallback is automatic for real model-assisted draft/polish
  requests after a channel failure.
- Fallback is serial, not parallel.
- Fallback is limited to the selected profile. A failed `review` channel may use
  `review` fallback channels, but it will not use `strong` or `fast` unless the
  user explicitly runs the command with that profile.
