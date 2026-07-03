# Implement

## Steps

- [x] Read relevant frontend specs before editing.
- [x] Confirm current homepage route uses `HeroSplit` and not legacy `Hero`.
- [x] Remove `src/components/Hero.tsx`.
- [x] Remove `src/styles/hero-reference.css` import from `src/index.css`.
- [x] Delete `src/styles/hero-reference.css` if no remaining references exist.
- [x] Re-run `rg` for old class/component names.
- [ ] Run validation:
  - [x] `npm.cmd run lint`
  - [x] `npm.cmd run build`
  - [x] `npm.cmd run check:ui`
  - [x] `git diff --check`
  - [x] sensitive scan over changed files.
- [ ] Commit, push, archive, and record session.

## Rollback

Restore `Hero.tsx`, `hero-reference.css`, and the `index.css` import if current homepage rendering depends on any removed selector.
