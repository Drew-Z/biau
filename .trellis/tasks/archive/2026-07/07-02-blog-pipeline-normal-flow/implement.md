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
npm.cmd run blog:model -- setup --non-interactive --profile strong --local-env .trellis/workspace/zhang/tmp-blog-model.env --base-url "https://relay.example.com" --api-key "placeholder-key" --model "glm-5.2" --provider "glm" --format markdown
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
- After the user completed real setup, `npm.cmd run blog:model -- status --all
  --format markdown` and `npm.cmd run blog:model -- doctor --all --format
  markdown` passed offline with `strong`, `review`, and `fast` all reporting
  `profile-specific: true`. The default doctor remained offline and sent no
  model request.
- Missing API key validation failed before network access as expected.
- One approved `strong` live generation ran for `chunk-strategy-public`. The
  model body was readable, but it omitted required evidence/review headings.
  `scripts/generate-blog-draft.mjs` now wraps generated bodies in the
  evidence-first scaffold under `## Draft Body` instead of relying on the model
  to reproduce safety headings.
- One approved `review` live polish pass ran with
  `npm.cmd run blog:draft -- --slug chunk-strategy-public --polish-from
  content-drafts/02-chunk-strategy-public.md --profile review`. It preserved
  the evidence scaffold and replaced only `## Draft Body`.
- The polish path initially surfaced a false-positive old-slug warning because
  it validated frontmatter as public body text. The script now validates the
  polished content after stripping frontmatter, matching the normal draft path.
- `npm.cmd run blog:check` passed after the generated and polished draft.
- `node --check scripts/generate-blog-draft.mjs` passed.
- `git diff --check` passed with CRLF warnings only.
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
