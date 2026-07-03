# Implement

## Steps

- [x] Read main-site data files and locate existing ERP, Legal RAG, Playlab, xunqiu, and Pet entries.
- [x] Patch missing visible brand shell gaps in external ERP and Playlab frontends.
- [x] Patch Pet static showcase title/favicon in `public/pet-app-showcase/index.html`.
- [x] Update `src/data/portfolio.ts` project detail sections and assistant contexts.
- [x] Update `src/data/statusTargets.ts` reliability gates/next actions.
- [x] Update `src/data/assistant.ts` public knowledge if needed.
- [x] Run external validation:
  - [x] ERP `npm.cmd run build --workspace @erp/web`
  - [x] Playlab `npm.cmd run build`
- [x] Run generation scripts:
  - [x] `npm.cmd run assistant:index`
  - [x] `npm.cmd run sitemap:generate`
  - [x] `npm.cmd run blog:check`
- [x] Run validation:
  - [x] `npm.cmd run lint`
  - [x] `npm.cmd run build`
  - [x] `git diff --check`
  - [x] sensitive scan over changed files.
- [ ] Update task checkboxes and archive after commit/push.

## Notes

If a generated artifact changes only timestamps or ordering unrelated to this task, inspect before committing.
