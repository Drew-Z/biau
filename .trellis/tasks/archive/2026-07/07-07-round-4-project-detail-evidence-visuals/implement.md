# Project Detail Evidence And Visuals Implementation Plan

## Steps

1. Load relevant frontend data/content specs.
2. Audit `src/data/portfolio.ts` and `public/images/projects/showcase`.
3. Add a deterministic project detail content check script.
4. Add an npm script for the check.
5. Run:
   - the new project detail check;
   - `npm.cmd run assistant:index`;
   - `npm.cmd run lint`;
   - `npm.cmd run build`;
   - `npm.cmd run check:ui`;
   - `git diff --check`;
   - sensitive scan over changed files.
6. Record check results in this task.

## Stop / Switch Rules

- If the audit finds a project that needs new real screenshots from another repo, record that asset as a manual/follow-up gate unless safe existing assets are already available.
- Do not use generated/fake screenshots as project evidence.

