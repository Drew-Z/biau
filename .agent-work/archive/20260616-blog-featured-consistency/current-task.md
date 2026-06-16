# Current Task

Date: 2026-06-16
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Codex direct small fix

## Goal

Fix the blog featured card so the visible title, metadata, summary, index, and button target all refer to the same `featuredPost`.

## Scope

- Update `BlogView` featured card rendering in `src/App.tsx`.
- Keep the existing `featuredPost = blogPosts[0]` selection.
- Do not add, remove, or rewrite blog posts.

## Non-goals

- Do not redesign the blog page.
- Do not change routing or article content.
- Do not edit reference project directories.

## Allowed Paths

- src/App.tsx
- .agent-work/current-task.md
- .agent-work/cc-plan.md
- .agent-work/codex-review.md
- .agent-work/verification.md

## Acceptance Criteria

- [x] Previous task artifacts are archived.
- [x] Featured card metadata uses `featuredPost.tag` and `featuredPost.date`.
- [x] Featured card title and summary match `featuredPost`.
- [x] Featured card index uses the selected post sections.
- [x] `/blogs` button opens the same article shown in the featured card.
- [x] `npm run lint` and `npm run build` pass.
- [x] Local and production `/blogs` QA pass.
