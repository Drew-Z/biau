# Current Task

Date: 2026-06-14
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Claude Code

## Goal

Generate a read-only first-round implementation plan for improving blog-semi with the project-agent-workflow process.

The plan should focus on project/case detail completeness, routing clarity, desensitized public-facing content, and visual distinction between list pages and detail pages. Use `D:\workspace4Codex\ques\fanhui.txt` only as reference context, not as a binding decision record.

## Current State Summary

- New project / in-progress project: in-progress project
- Adoption audit reviewed: .agent-work/adoption-audit.md
- Baseline failures: unknown; no lint/build run in this workflow round yet

## Non-goals

- Do not implement code changes in this planning round.
- Do not redesign the entire site before the plan is reviewed.
- Do not modify `/home/zhang/workspace/reference-projects`.
- Do not add `douyu`, `yihuan-helper`, or `ques`.
- Do not expose real IPs, accounts, keys, database URLs, cloud API URLs, order numbers, signatures, or private deployment details.

## Allowed Paths

- Read: `/home/zhang/workspace/blog-semi`
- Read: `/home/zhang/workspace/reference-projects`
- Read: `/mnt/d/workspace4Codex/ques/fanhui.txt`
- Write in this round: `.agent-work/cc-plan.md` only

## Protected Paths

- `/home/zhang/workspace/reference-projects`
- Any secrets, local env files, credentials, signing files, private keys, production config, real deployment endpoints
- `src/` and project source files during this planning-only round

## Acceptance Criteria

- [ ] `.agent-work/cc-plan.md` contains a concrete first-round plan.
- [ ] The plan separates content work, UI/layout work, and code refactor work.
- [ ] The plan identifies one narrow first implementation slice.
- [ ] The plan includes desensitization checks for Ozon ERP, Pet Workspace, and xunqiu.
- [ ] The plan treats `fanhui.txt` as reference, not as the only source of truth.
- [ ] The plan lists verification commands and UI QA expectations.

## Risks

- Claude Code may over-expand into broad UI refactor.
- Claude Code may treat fanhui.txt as authoritative and ignore current repo state.
- Content derived from reference projects may accidentally include sensitive data.
- Details pages may remain visually too similar to list pages if UI scope is not clearly separated.

## Existing Work To Preserve

- `.claude/`, `.mcp.example.json`, and `CLAUDE.md` are existing uncommitted setup files.
- Existing routing and detail page framework should be treated as current project state, not rewritten blindly.

## Verification Plan

- [ ] Review `.agent-work/cc-plan.md` manually.
- [ ] Confirm no files except `.agent-work/cc-plan.md` changed during CC planning.
- [ ] If implementation is later approved: run `npm run lint` and `npm run build`.
- [ ] For UI changes later: run browser/screenshot QA on affected routes.

## Human Decisions Needed

- Approve the first implementation slice after Codex reviews the CC plan.
