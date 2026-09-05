# Codex Workflow

This project is developed with Codex. The main session owns planning,
implementation, final verification, and delivery.

## Project Entry Points

- `AGENTS.md`: primary project instructions.
- `.codex/config.toml` and `.codex/hooks.json`: project Codex configuration and workflow-state hook registration.
- `.agents/skills/`: shared project skills.
- `.trellis/config.yaml`, `.trellis/workflow.md`, `.trellis/tasks/`, and `.trellis/spec/`: execution mode, workflow, task records, and coding guidelines.

Trellis uses `codex.dispatch_mode: inline`. Load `trellis-before-dev`, implement
in the main session, and verify with the `trellis-check` skill. Optional
read-only exploration follows the user's sub-agent rules; implementation and
final verification stay with the main session. Claude Code runners, commands,
and cross-tool handoffs are retired for this project.

The old `.agent-work/` records and historical worktrees are reference material,
not current task pointers. Start from `task.py current --source` and the current
user request. Existing Logo Lab comparisons remain application assets.

## When to use the full flow

Use the full flow for new features, multi-file changes, refactors, data model changes, deployment-sensitive work, security-sensitive work, or vague requests.

For tiny fixes, skip the paperwork and do the smallest safe change after checking the relevant files.

## Phase 0: Clarify

Before writing code, make the goal explicit.

- Restate the user request in concrete terms.
- Identify unknowns, constraints, acceptance criteria, and risky assumptions.
- Ask the fewest useful questions. For vague product or UX work, use grill-me style questioning: one focused question at a time until the request is implementable.
- If a question can be answered from the repository, inspect the repository instead of asking the user.

## Starting A Session

Use PowerShell 7 in the canonical checkout. Inspect the existing work before
starting a new task:

```powershell
git status --short --branch
git worktree list --porcelain
python ./.trellis/scripts/task.py current --source
python ./.trellis/scripts/get_context.py
```

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

For project inventory, inspect `src/data/portfolio.ts`, route components, and
the relevant project specs. Resolve any source-project directory before reading
it and keep it read-only. Do not add `douyu`, `yihuan-helper`, or `ques` to the
showcase. Project details describe engineering; case studies describe the
business problem, approach, result, and public evidence.

## Phase 4: Validate

Use the smallest meaningful checks for the change.

Default validation order:

```powershell
npm.cmd run lint
npm.cmd run build
```

Other useful project commands:

```powershell
npm.cmd run verify
npm.cmd run check:ui
npm.cmd run blog:check
npm.cmd run assistant:kg-check
npm.cmd run server:build
npm.cmd run server:smoke
```

For documentation-only changes, validate file existence, links, structure, and the relevant diff. Do not claim runtime validation when no runtime command was run.

For UI work, use actual browser measurements and screenshots across desktop,
`320/390/430` widths, all three themes, and both language states. Review route
changes, keyboard focus, reduced motion, text fit, and control reachability.
Use a current local preview for browser checks and set `UI_CHECK_BASE` to its
origin. Keep public status snapshots read-only unless their explicit publishing
workflow is authorized.

For deployment preparation, verify `npm.cmd run build`, the `dist` output,
SPA fallback behavior, and the current deployment contract. Follow
`docs/deployment.md` for provider-specific details. A preparation check does
not itself publish anything.

## Phase 5: Finish

End with a concise Chinese summary:

- what changed
- why it fits this project
- what validation was run
- remaining risks, assumptions, or follow-ups

If the task produced reusable project knowledge, update `.trellis/spec/`, `CONTEXT.md`, `docs/adr/`, `docs/agents/`, or the active Trellis task directory instead of leaving the knowledge only in chat.
