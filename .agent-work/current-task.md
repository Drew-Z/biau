# Current Task

Date: 2026-06-16
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Claude Code via `cc`

## Goal

Polish remaining public-facing copy that still reads like a draft, example page, or internal backlog item, especially on the blog and case discovery surfaces.

## Scope

- Review public copy in `src/App.tsx` and `src/data/portfolio.ts`.
- Replace visible “示例”, “待补图”, “待整理”, and “补...” wording where it weakens the production-style site presentation.
- Keep legitimate roadmap language when it describes real future engineering work.
- Keep all content in Simplified Chinese.

## Non-goals

- Do not redesign layout or component structure.
- Do not add new projects, cases, posts, or screenshots.
- Do not edit reference project directories.
- Do not remove accurate roadmap items such as real Godot Web package integration.
- Do not publish private paths, accounts, service addresses, release package paths, or sensitive operational data.

## Allowed Paths

- src/App.tsx
- src/data/portfolio.ts
- .agent-work/current-task.md
- .agent-work/cc-plan.md
- .agent-work/codex-review.md
- .agent-work/verification.md

## Acceptance Criteria

- [x] Previous task artifacts are archived.
- [x] `cc` is asked for a read-only plan using provider order `a -> b -> c -> d`.
- [x] Codex records a narrowed review before implementation.
- [x] Public blog and discovery surfaces no longer present the main content as “示例”.
- [x] Public cards/lists avoid internal backlog labels such as “待补图” and “待整理”.
- [x] Existing real roadmap items remain accurate.
- [x] Sensitive/public wording scan is reviewed.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.
- [x] Browser QA checks affected routes at desktop and mobile widths.
- [x] Changes are committed, pushed, and production QA is recorded.

## Verification Plan

- Run targeted `rg` scans for draft/example/internal-backlog wording.
- Run sensitive/private wording scan over changed public files.
- Run `npm run lint`.
- Run `npm run build`.
- Browser-check `/`, `/cases`, and `/blogs` locally at desktop and mobile widths.
- After push and Cloudflare deployment, verify production routes and record the result.
