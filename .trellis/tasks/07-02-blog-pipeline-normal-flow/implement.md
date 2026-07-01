# Implement: Blog Model Wizard And Multi-Model Flow

## Phase 2 Checklist

1. Load project implementation guidelines through `trellis-before-dev` before
   editing runtime files.
2. Inspect current model scripts in full:
   - `scripts/configure-blog-model.mjs`
   - `scripts/blog-model-config.mjs`
   - `scripts/generate-blog-draft.mjs`
3. Refactor model profile metadata:
   - Add role labels and recommendations for `strong`, `review`, and `fast`.
   - Make temperature beginner-optional while preserving existing defaults.
   - Keep fallback/legacy resolution warnings.
4. Improve `blog:model setup` UX:
   - Beginner grouped wizard inspired by smart-search.
   - `--all`, `--advanced`, and `--non-interactive` flags.
   - Field examples before prompts.
   - Skip/keep/clear behavior remains explicit.
   - API key input hides safely or fails closed.
5. Improve status/doctor UX:
   - Support `--all` role summaries.
   - Keep offline default; no live request without `--live`.
   - Mask base URLs and API keys.
   - Surface fallback/legacy warnings per profile.
6. Update model-assisted content strategy docs:
   - `.agents/skills/blog-content-pipeline/SKILL.md`
   - `.agents/skills/blog-content-pipeline/references/usage.md`
   - `.agents/skills/blog-content-pipeline/references/review-and-prompts.md`
   - `content-drafts/README.md`
7. Update or add spec guidance if the implementation establishes a durable
   blog-draft workflow convention.
8. Run validation.
9. Continue the normal flow using the improved wizard/status/doctor, without
   running live model calls unless separately approved.

## Validation Commands

```powershell
npm.cmd run blog:model -- --help
npm.cmd run blog:model -- status --all --format markdown
npm.cmd run blog:model -- doctor --all --format markdown
npm.cmd run blog:model -- setup --non-interactive --profile strong --local-env .trellis/workspace/zhang/tmp-blog-model.env --base-url "https://relay.example.com" --api-key "test-key-placeholder" --model "glm-5.2" --provider "glm" --format markdown
npm.cmd run blog:model -- status --profile strong --local-env .trellis/workspace/zhang/tmp-blog-model.env --format markdown
npm.cmd run blog:model -- doctor --profile strong --local-env .trellis/workspace/zhang/tmp-blog-model.env --format markdown
npm.cmd run blog:check
npm.cmd run lint
npm.cmd run build
```

After using placeholder secrets in a temp env file, run a targeted scan to make
sure no placeholder value leaked into tracked files.

## Validation Notes

- `npm.cmd run blog:model -- --help` passed and shows three-profile setup,
  `--all`, `--advanced`, `--non-interactive`, and `--local-env`.
- `npm.cmd run blog:model -- setup --non-interactive --profile strong
  --local-env .trellis/workspace/zhang/tmp-blog-model.env ...` passed with
  placeholder values and did not print the placeholder API key.
- `npm.cmd run blog:model -- status --profile strong --local-env ...` reported
  `profile-specific: true` for the temporary profile.
- `npm.cmd run blog:model -- status --all --format markdown` and
  `npm.cmd run blog:model -- doctor --all --format markdown` passed offline and
  reported the real local profiles as `profile-specific: false` because they
  resolve through fallback/legacy values.
- Missing API key validation failed before network access as expected.
- `npm.cmd run blog:plan`, `npm.cmd run blog:check`, `npm.cmd run lint`, and
  `npm.cmd run build` passed. Build retained existing Vite
  `INEFFECTIVE_DYNAMIC_IMPORT` warnings.
- No live model request or draft generation was run.
- Temporary placeholder env file was deleted after validation.

## Risks And Rollback

- Risk: interactive hidden input differs between Windows terminals. Mitigation:
  fail closed when hiding cannot be guaranteed and validate non-interactive temp
  env flow.
- Risk: `/v1` URL normalization breaks existing relays. Mitigation: preserve
  current behavior unless request generation path is explicitly changed and
  validated.
- Risk: multi-model strategy overcomplicates small posts. Mitigation: document
  single-profile generation as allowed for low-risk/simple drafts but not the
  recommended important-post path.

Rollback point: revert changes to `scripts/configure-blog-model.mjs`,
`scripts/blog-model-config.mjs`, docs, and specs; `.env.local` must never be
committed or modified by rollback.
