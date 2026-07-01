# Implementation Plan

1. Read applicable specs:
   - `.trellis/spec/backend/blog-draft-workflow.md`
   - `.trellis/spec/backend/logging-guidelines.md`
   - `.trellis/spec/backend/quality-guidelines.md`
   - `.trellis/spec/guides/code-reuse-thinking-guide.md`
2. Add shared model config helpers under `scripts/`.
3. Refactor `scripts/generate-blog-draft.mjs` to use the shared helpers without
   changing existing command behavior.
4. Add `scripts/configure-blog-model.mjs` with:
   - argument parsing
   - smart-search-like subcommands: `setup`, `status`, `doctor`, `config path`
   - profile selection
   - masked config display
   - hidden API-key prompt
   - `.env.local` update/preservation
   - offline `status`
   - offline default `doctor` channel validation, with explicit `--live` for live checks
   - `--format json|markdown`
5. Add npm scripts:
   - `blog:model`
   - `blog:model:wizard`
   - `blog:model:check`
6. Update docs/specs with usage and safety notes.
7. Validate:
   - `npm.cmd run blog:model:wizard -- --help`
   - `npm.cmd run blog:model -- status --profile strong --format json`
   - `npm.cmd run blog:model -- config path --format json`
   - missing-key expected failure for `blog:model:check`
   - `npm.cmd run blog:plan`
   - `npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft`
   - `npm.cmd run blog:check`
   - `npm.cmd run lint`
   - `npm.cmd run build`
8. Commit, archive, journal, and push.
