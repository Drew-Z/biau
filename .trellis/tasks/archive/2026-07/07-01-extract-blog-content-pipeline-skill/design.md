# Design

## Repository Layout

Use a separate working directory:

```text
D:/workspace4Cursor/blog-content-pipeline/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── templates.md
    ├── review-and-prompts.md
    └── usage.md
```

This keeps the standalone repository itself as the skill folder. A consumer can copy or install the folder directly under `.agents/skills/blog-content-pipeline` or a Codex skills directory.

## Sync Strategy

For this task, use copy-sync rather than Git submodule or symlink:

- The standalone repo is the upstream source for future skill reuse.
- The current project keeps `.agents/skills/blog-content-pipeline` as a normal folder so skill discovery remains stable.
- After editing standalone files, copy the same files back into the current project skill folder.

Submodules are intentionally avoided in this first extraction because they add update friction and can make local AI skill discovery dependent on recursive checkout behavior.

## Documentation Strategy

Do not add a general README if the content can live inside skill resources. Add `references/usage.md` because it is directly consumed by Codex when users ask how to configure or use the skill.

`SKILL.md` should stay concise and point to:

- `references/templates.md` for column templates.
- `references/review-and-prompts.md` for prompts/review.
- `references/usage.md` for setup, model profile configuration, commands, and image generation policy.

## Model Channel Contract

Document public-safe placeholders only:

- `BLOG_DRAFT_PROFILE`
- `BLOG_DRAFT_BASE_URL`, `BLOG_DRAFT_API_KEY`, `BLOG_DRAFT_MODEL`, `BLOG_DRAFT_PROVIDER`, `BLOG_DRAFT_TEMPERATURE`
- `BLOG_DRAFT_STRONG_*`
- `BLOG_DRAFT_FAST_*`
- `BLOG_DRAFT_REVIEW_*`

Recommended role split:

- `strong`: GLM-5.2 / DeepSeek V4 Pro / Gemini 3.1 Pro or equivalent for long-form drafting and legacy rewrites.
- `fast`: Gemini 3.5 Flash or equivalent for outline, summaries, and low-risk checks.
- `review`: optional secondary review after Codex fact/safety review.

## Image Generation Policy

Generated images can help blog polish, but must not replace evidence.

Priority order:

1. Real project screenshots when the UI/state is safe to show.
2. Self-made diagrams for architecture, data flow, workflow, and decision trees.
3. Licensed or source-attributed images for resource/news context.
4. Generated images for covers or abstract concepts only.

Rules:

- Never generate fake product screenshots, fake dashboards, fake metrics, fake customer logos, or fake UI states.
- Do not imply a generated image is evidence.
- Every image needs source/type, purpose, alt text, and public-safety review.
- For project case pages or project-summary posts, prefer screenshots/diagrams over decorative generated covers.

## Validation

- Validate skill frontmatter and required references in both standalone repo and current project copy.
- Check standalone Git status and remote.
- Check current project Git status after sync.
- Push standalone repo first, then commit/sync current project changes if any.

## Rollback

- Standalone extraction can be rolled back by deleting `D:/workspace4Cursor/blog-content-pipeline`.
- Current project remains safe because the in-repo skill copy is preserved.
