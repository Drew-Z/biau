# Blog model fallback channels implementation plan

## Preconditions

- User reviewed the plan and approved implementation.
- `task.py start` has moved this task to `in_progress`.
- Inline Codex workflow: do not dispatch sub-agents.
- Before editing implementation files in Phase 2, load `trellis-before-dev`.
- Do not read or print private `.env.local` values except through existing
  masked tooling.

## Implementation Checklist

1. Update shared config helpers in `scripts/blog-model-config.mjs`.
   - Add fallback key helpers and env discovery.
   - Add channel list parsing while preserving `readDraftModelConfig`.
   - Add per-channel validation/status helpers.
   - Keep redaction rules strict.

2. Update model setup/status/doctor in `scripts/configure-blog-model.mjs`.
   - Parse `--fallback` and `--fallback-index`.
   - Add interactive fallback prompts after each primary profile in beginner
     setup, defaulting to no.
   - Add later guided fallback setup:
     `blog:model setup --profile review --fallback`.
   - Add non-interactive fallback setup:
     `blog:model setup --non-interactive --profile review --fallback --fallback-index 1 ...`.
   - Update markdown/json status to show primary plus fallback channels.
   - Keep default doctor offline and masked.

3. Update draft/polish generation in `scripts/generate-blog-draft.mjs`.
   - Use channel list instead of one config.
   - Try primary first, then same-profile fallback channels in numeric order.
   - Aggregate redacted attempt diagnostics.
   - Record winning channel label in `generatedBy`.
   - Do not cross-fallback between `strong`, `review`, and `fast`.

4. Update public-safe env/docs.
   - `.env.example`
   - `.agents/skills/blog-content-pipeline/SKILL.md`
   - `.agents/skills/blog-content-pipeline/references/usage.md`
   - `.agents/skills/blog-content-pipeline/references/review-and-prompts.md`
   - `.trellis/spec/backend/blog-draft-workflow.md`
   - Optional `content-drafts/README.md` and
     `content-drafts/blog-rewrite-workflow.md` if references become stale.

5. Validate with offline config commands.
   - `npm.cmd run blog:model -- status --all --format markdown`
   - `npm.cmd run blog:model -- doctor --all --format markdown`
   - `npm.cmd run blog:model -- setup --non-interactive --profile review --fallback --fallback-index 1 --base-url "https://relay.example.com" --api-key "placeholder" --model "deepseek-v4-pro" --provider "deepseek-backup" --local-env <temp-env>`
   - `npm.cmd run blog:model -- status --profile review --format json --local-env <temp-env>`
   - `npm.cmd run blog:model -- doctor --profile review --format markdown --local-env <temp-env>`

6. Validate fallback generation with a local mock server, not a real model.
   - Start a temporary local HTTP server that returns 500 for the primary mock
     endpoint and a valid OpenAI-compatible `choices[0].message.content` for the
     fallback endpoint.
   - Run `blog:draft -- --slug agentic-rag-frontier-2026 --polish-from <temp-copy> --profile review`
     with process env variables pointing to the mock primary/fallback channels.
   - Confirm the temp copy was written, `generatedBy` records `fallback-1`, and
     no real model/provider was contacted.
   - Remove temp files/server after validation.

7. Run repository checks.
   - `npm.cmd run blog:plan`
   - `npm.cmd run blog:check`
   - `npm.cmd run lint`
   - `npm.cmd run build`

8. Review git diff for safety.
   - Confirm no real keys, relay URLs, account names, database URLs, or private
     paths are committed.
   - Confirm `.env.local` remains untracked and unread in final reporting.

## Risky Files

- `scripts/blog-model-config.mjs`: env parsing and fallback compatibility.
- `scripts/configure-blog-model.mjs`: interactive secret prompts and masked
  output.
- `scripts/generate-blog-draft.mjs`: real model request path and draft writes.
- `.agents/skills/blog-content-pipeline/SKILL.md`: future Codex behavior depends
  on concise, accurate instructions.

## Rollback Points

- After shared config changes: run status/doctor before touching generation.
- After CLI setup changes: validate with temp env before model-generation path.
- After generation fallback changes: validate with a mock server before any real
  model-assisted blog command.

## Start Gate

- [x] User approved automatic same-profile serial fallback.
- [x] User approved this PRD/design/implementation plan.
- [x] `python ./.trellis/scripts/task.py start ./.trellis/tasks/07-04-blog-model-fallback-channels`
      completed successfully.
