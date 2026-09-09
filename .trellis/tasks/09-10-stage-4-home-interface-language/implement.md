# 首页公共界面语言实施计划

1. Add typed `homeInterfaceCopy` with Chinese defaults and English fixed labels;
   keep the copy limited to status and accessibility UI.
2. Update `HeroSplit.tsx` to consume the active language, mark the Home root and
   fixed labels correctly, and keep authored poem/body content Chinese.
3. Extend `scripts/check-site-language-ui.mjs` with Home status, language marker,
   authored-content immutability, title keyboard and layout assertions. Reuse
   the existing page fixture, theme/width matrix and local network guard.
4. Run the old-build negative assertion for the new English Home contract, then
   run `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run language:ui`,
   `npm.cmd run check:ui:smoke`, and `git diff --check`.
5. Review representative Home screenshots at mobile and desktop widths, inspect
   the exact staged file list, commit locally with signing disabled, archive this
   child with `--no-commit`, update the parent loop, and preserve all unrelated
   files.

## Owned files

- `src/components/HeroSplit.tsx`
- `src/data/homeInterfaceCopy.ts`
- `scripts/check-site-language-ui.mjs`
- this child task's records and the parent assessment/remaining-gates records

## Forbidden files

- `src/data/hero.ts`, `src/data/portfolio.ts`, `src/data/projectPublication.ts`
- `src/components/RightScrollCards.tsx` and project interface copy/projection
- `src/components/PublicAssistantWidget.tsx`
- `src/utils/seo.ts`, API/decoder modules, `public/status/blog-semi-synthetic.json`
- dependencies, production workflows, deployment or scheduler configuration
