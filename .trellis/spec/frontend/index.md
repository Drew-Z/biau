# Frontend Development Guidelines

These guidelines describe the actual React/Vite/Semi Design frontend in this repository. Read them before changing `src/`, public UI assets, route structure, or static content data.

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Frontend module ownership, route/data/style layout, naming | Filled |
| [Component Guidelines](./component-guidelines.md) | Semi Design usage, component shape, props, styling, accessibility | Filled |
| [Hook Guidelines](./hook-guidelines.md) | Custom hook patterns, browser API guards, effect cleanup | Filled |
| [State Management](./state-management.md) | Local state, route-derived state, persistent UI state, static data | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Lint/build gates, UI rules, public data safety | Filled |
| [Type Safety](./type-safety.md) | Type organization, literal unions, runtime checks | Filled |

## Pre-Development Checklist

Before frontend edits:

- Read [Directory Structure](./directory-structure.md) for where the change belongs.
- Read [Component Guidelines](./component-guidelines.md) for `.tsx` UI work.
- Read [State Management](./state-management.md) when touching theme, language, harbor scene, routing, or derived catalog data.
- Read [Hook Guidelines](./hook-guidelines.md) before adding or editing `src/hooks/*`.
- Read [Type Safety](./type-safety.md) before changing `src/data/*`, API payloads, or unions/records.
- Read [Quality Guidelines](./quality-guidelines.md) before declaring the work complete.

## Local Rules Imported

These specs incorporate rules from `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/semi-ui.mdc`, `.cursor/rules/data-safety.mdc`, and `.cursor/rules/verify.mdc`.

## Core Project Rules

- Communicate with the developer in Simplified Chinese, while code, commands, paths, and errors may remain English.
- Treat this as a product website / solution showcase, not a personal portfolio.
- Prefer Semi Design v19 packages: `@douyinfe/semi-ui-19` and `@douyinfe/semi-icons`.
- Keep public content sanitized; anything committed to the repository should be considered public.
- Run `npm.cmd run lint` then `npm.cmd run build` for `src/` or config changes.
