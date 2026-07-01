# Implement

## Checklist

- [ ] Read `trellis-before-dev` before editing.
- [ ] Create `D:/workspace4Cursor/blog-content-pipeline`.
- [ ] Copy current `.agents/skills/blog-content-pipeline` contents into the standalone repo.
- [ ] Add `references/usage.md` with:
  - [ ] installation/sync notes
  - [ ] model profile setup
  - [ ] usage routes and commands
  - [ ] image generation policy
- [ ] Update `SKILL.md` to point to `references/usage.md`.
- [ ] Update `agents/openai.yaml` if wording needs to mention setup/profile guidance.
- [ ] Sync standalone skill changes back to `.agents/skills/blog-content-pipeline`.
- [ ] Initialize standalone Git repo, set `origin` to `git@github.com:Drew-Z/blog-content-pipeline.git`, commit, and push.
- [ ] Run validation:
  - [ ] standalone skill structure check
  - [ ] in-project skill structure check
  - [ ] current project `git status`
- [ ] Commit any current-project sync changes.
- [ ] Archive Trellis task, journal, and push current project if changed.

## Notes

- Do not include real model relay URLs or API keys.
- Do not convert current project skill to submodule in this task.
- Do not generate blog content or images in this task.
