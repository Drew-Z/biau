# Claude Code Project Configuration

This directory stores project-level Claude Code commands for `blog-semi`.

- `commands/project-inventory.md`: inventory project material from `../reference-projects`.
- `commands/verify-build.md`: install dependencies and run lint/build checks.
- `commands/deploy-check.md`: check Cloudflare Pages deployment readiness.
- `commands/ui-review.md`: review layout, theme, responsive behavior, and route clarity.

Local permissions live in `.claude/settings.local.json`; it is intentionally ignored by Git through the existing `*.local` rule.

User-level plugins currently expected in the WSL Claude Code environment:

- `frontend-design@claude-plugins-official`
- `code-review@claude-plugins-official`
- `commit-commands@claude-plugins-official`
- `claude-code-setup@claude-plugins-official`
- `context7@claude-plugins-official`
- `playwright@claude-plugins-official`
