# 首页公共界面语言

## Goal

Localize the remaining fixed public Home interface labels and accessible status copy so the selected site language is coherent on `/`, while preserving authored hero content, project facts, motion, carousel state, navigation, and analytics contracts.

## Requirements

- Use the existing `SiteLanguage` context and a small typed Home UI copy record; do not add a second preference state or make language a dependency of the hero motion effects.
- Translate only fixed interface text: the system status labels/values and the hero title's action name. Keep the authored hero body and poem title/subtitle text Chinese with explicit `lang="zh-CN"` semantics.
- Project panel copy and project action labels remain owned by the existing `projectInterfaceCopy` and publication projection; this task must not duplicate or change them.
- The Home root language marker must reflect the selected language for localized UI, while authored Home content keeps its own Chinese marker; leave the global App fallback unchanged for remaining Chinese pages.
- Preserve title keyboard activation, pointer drag/rotation, carousel identity, status clock cadence, route history, theme behavior, and analytics payloads.
- Extend the existing language UI checker with deterministic Home status/name assertions across 320/390/430/1440 widths and morning/nature/stellar themes, without network or model calls.

## Constraints

- Owned code is limited to `src/components/HeroSplit.tsx`, a new Home copy module under `src/data/`, and the existing language checker/fixture records needed for this route.
- Do not modify authored poem/body data, project publication records, SEO output, route URLs, API clients, the protected status snapshot, or Public Assistant behavior.
- Follow the existing 44px/control containment and language-marker contracts; no layout redesign or new dependency.

## Acceptance Criteria

- [ ] English Home exposes English system status labels, a localized port-status value, and an English accessible title action; Chinese restores the existing Chinese UI copy.
- [ ] Authored poem and hero body snapshots remain byte/text identical across language switches and remain `:lang(zh-CN)`.
- [ ] `html.lang`, Home root semantics, keyboard title activation, theme, URL/history and carousel DOM identity remain correct after language changes and refresh.
- [ ] Home language checks pass for both languages, four widths and three themes with zero unexpected API/model requests and no overflow or control-size regression.
- [ ] `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run language:ui`, `npm.cmd run check:ui:smoke`, and `git diff --check` pass; no protected or unrelated files are changed.

## Notes

- The source audit found `LOCAL TIME`/`PORT STATUS` plus `入口状态公开可见` and the title action `切换下一条泊岸题句` hardcoded in `HeroSplit.tsx`; the app wrapper remains a deliberate Chinese fallback for pages outside this staged public scope.
- This is a bounded public UI projection task; authored Home copy and the larger Public Assistant surface remain separate assessment items.
