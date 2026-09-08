# 盘点公开页面语言与键盘交互

## Goal

Audit public language coverage, preference persistence and keyboard navigation with source anchors and local browser evidence; separate mechanical fixes from translation and product decisions.

## Background

- `src/App.tsx:70-123` owns `language: 'zh' | 'en'`, but the value is passed only to `Navigation`; public page components and `SiteFooter` do not receive it.
- `src/components/Navigation.tsx:29-149` has bilingual primary labels and theme controls, while navigation aria labels, footer copy, catalog filters, empty states, status content and public assistant copy are mostly Chinese or mixed bilingual strings.
- `src/utils/appearance.ts:28-77` and `index.html:9-25` provide a separate, versioned theme persistence and migration contract. Language currently has no storage key or reload contract.
- Existing full UI checks exercise selected language values in navigation and several keyboard/focus paths, but there is no bounded report that inventories public copy coverage or checks language behavior across refresh and route transitions.

## Requirements

- R1: Produce a source-backed inventory of language consumers across public shell, `/`, `/projects`, `/blog`, detail routes, `/status`, `/ai-daily`, footer and public assistant. Record whether each visible/accessible string is Chinese, English, bilingual, or data-authored, with `file:line` anchors.
- R2: Verify current language toggle behavior at desktop and mobile: visible labels, active route, focus order, touch target, `aria-label`, and whether the selected language survives a route transition or refresh. Do not infer full-site translation support from navigation alone.
- R3: Verify keyboard access for public discovery and reading controls: top navigation, language/theme controls, blog search/filter/pagination, project group controls, detail reading guide, status section selector, public assistant open/close, and representative card/detail actions. Capture failures with the exact control and route.
- R4: Classify findings into (a) directly repairable mechanical issues within existing contracts, (b) translation/product decisions requiring user input, and (c) external or production-gated items. This audit must not invent translations, alter public content facts, or enable production behavior.
- R5: Use local Chromium and existing fixture/network-guard conventions. The audit must make zero model calls, avoid real business API requests, preserve `public/status/blog-semi-synthetic.json`, and leave source/public data unchanged unless a separately scoped mechanical fix is proven necessary.
- R6: Save a concise audit report and machine-readable evidence under this child task. If no safe implementation can be selected from repository evidence, finish as an assessment child and return the precise next decision to the parent.

## Acceptance Criteria

- [x] Source inventory covers all public route families and the shared shell with file/line anchors and clear language classification.
- [x] Browser evidence covers 320/390/430/1440 where relevant, at least Morning and Stellar themes, both language toggle states, route transition and refresh behavior, and the bounded keyboard controls listed in R3.
- [x] Every finding has observed behavior, impact, reproducible scope, and a classification; unresolved translation scope is explicitly marked as a product decision rather than silently implemented.
- [x] No public content, generated knowledge, status snapshot, production configuration, model/provider call, or dependency is modified.
- [x] `git diff --check` and task validation pass; the parent task is updated with the evidence-backed next action.

## Out Of Scope

- Full bilingual rewrite of public pages, data-authored project/article copy, or a new translation resource system.
- New analytics, accessibility libraries, backend endpoints, model calls, deployment, Feed/Cron, or production verification.
- Broad visual redesign or changes to the already-verified URL, reading-navigation, assistant route-recovery, and status contracts.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
