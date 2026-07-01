# Implement

## Checklist

- [x] Read `trellis-before-dev` before editing.
- [x] Update `.agents/skills/blog-content-pipeline/SKILL.md`:
  - [x] task routing
  - [x] input protocol
  - [x] model strategy
  - [x] model channel configuration protocol
  - [x] legacy rewrite path
  - [x] publish/stage commands
- [x] Expand `.agents/skills/blog-content-pipeline/references/templates.md` with column-level evidence and review gates.
- [x] Add `.agents/skills/blog-content-pipeline/references/review-and-prompts.md` for reusable prompts/checklists if useful.
- [x] Update `.agents/skills/blog-content-pipeline/agents/openai.yaml`.
- [x] Update `.env.example` with public-safe `BLOG_DRAFT_*` placeholders.
- [x] Update `scripts/generate-blog-draft.mjs` so `--generate` reads `BLOG_DRAFT_*` first and falls back to `GEMINI_*`.
- [x] Run validation:
  - [x] frontmatter/reference existence check
  - [x] `npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft --force`
  - [x] `npm.cmd run blog:check`
  - [x] `npm.cmd run lint`
  - [x] `npm.cmd run build`
- [ ] Commit, archive task, journal, and push.

## Notes

- Do not publish or generate a new article in this task.
- Keep `SKILL.md` concise; move long templates into references.
- Keep all model provider details generic. Do not record relay URLs, keys, or private deployment details.
- Do not run `blog:draft -- --generate` as part of validation unless the user explicitly wants to test a private local channel in this session.
- `quick_validate.py` was attempted but the active Python environment lacked `yaml`; the task used a local Node frontmatter/reference check instead.
