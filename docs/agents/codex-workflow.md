# Codex Workflow

This file adapts the Cursor workflow notes into a Codex-friendly project workflow. Use it as a practical operating guide, not as ceremony for every small edit.

## When to use the full flow

Use the full flow for new features, multi-file changes, refactors, data model changes, deployment-sensitive work, security-sensitive work, or vague requests.

For tiny fixes, skip the paperwork and do the smallest safe change after checking the relevant files.

## Phase 0: Clarify

Before writing code, make the goal explicit.

- Restate the user request in concrete terms.
- Identify unknowns, constraints, acceptance criteria, and risky assumptions.
- Ask the fewest useful questions. For vague product or UX work, use grill-me style questioning: one focused question at a time until the request is implementable.
- If a question can be answered from the repository, inspect the repository instead of asking the user.

## Phase 1: Gather Evidence

Prefer local evidence before external knowledge.

- Read `AGENTS.md`, relevant README files, `CONTEXT.md` if present, and `docs/adr/` if present.
- Use `rg` or direct file reads to find existing patterns, data structures, components, routes, scripts, tests, and styles.
- Use terminal commands for real validation evidence, such as lint, build, tests, type checks, or smoke checks.
- For current external facts, framework behavior, cloud platform details, or API docs, check official or reliable sources and cite them in the final answer when they matter.

## Phase 2: Plan

For substantial tasks, create or update a Trellis task under `.trellis/tasks/<task-slug>/`.

Recommended files:

- `prd.md`: user goal, scope, constraints, acceptance criteria, non-goals.
- `design.md`: affected areas, data flow, UI behavior, tradeoffs, risks.
- `implement.md`: ordered steps, validation commands, rollback points.
- `implement.jsonl` and `check.jsonl`: curated spec/research context for Trellis implement/check flows when needed.

Do not create planning files for small, obvious edits unless the user asks or the Trellis workflow state requires it. Legacy `.scratch/` files may still exist, but new multi-step work should use Trellis tasks.

## Phase 3: Implement

Keep changes narrow and project-native.

- Reuse existing components, design tokens, Lucide icons, data files, utilities, styles, and route patterns.
- Keep product language aligned with a production website or solution showcase, not a personal portfolio tone.
- Put structured business/content data under `src/data/` unless the current architecture clearly says otherwise.
- Avoid new dependencies, broad abstractions, file moves, or opportunistic rewrites unless they are necessary.
- Never expose secrets or hard-code private infrastructure details.

## Phase 4: Validate

Use the smallest meaningful checks for the change.

Default validation order:

```bash
npm.cmd run lint
npm.cmd run build
```

Other useful project commands:

```bash
npm.cmd run verify
npm.cmd run check:ui
npm.cmd run blog:check
npm.cmd run assistant:kg-check
npm.cmd run server:build
npm.cmd run server:smoke
```

For documentation-only changes, validate file existence, links, structure, and the relevant diff. Do not claim runtime validation when no runtime command was run.

## Phase 5: Finish

End with a concise Chinese summary:

- what changed
- why it fits this project
- what validation was run
- remaining risks, assumptions, or follow-ups

If the task produced reusable project knowledge, update `.trellis/spec/`, `CONTEXT.md`, `docs/adr/`, `docs/agents/`, or the active Trellis task directory instead of leaving the knowledge only in chat.
