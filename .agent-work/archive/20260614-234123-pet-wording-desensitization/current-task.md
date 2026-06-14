# Current Task

Date: 2026-06-14
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Claude Code

## Goal

Generate a read-only second-slice plan for content calibration and desensitization hardening across the existing Ozon ERP, Pet Workspace, and xunqiu project/case pages.

This slice should compare the current public site content against the real project directories and identify only the smallest useful content corrections. It must not redesign the site or expand the project catalog.

## Current State Summary

- First navigation wording slice has been committed and pushed as `1cdf9b4 Refine project navigation workflow`.
- Existing project/case detail framework is already present in `src/App.tsx`.
- Ozon ERP, Pet Workspace, xunqiu, and Godot showcase content already exists and should be calibrated, not rewritten from scratch.
- Workflow artifacts from the first slice were archived under `.agent-work/archive/20260614-225146-navigation-wording-slice/`.

## Non-goals

- Do not implement source changes in this planning round.
- Do not add new projects, cases, or blog posts.
- Do not add or expand `douyu`, `yihuan-helper`, or `ques`.
- Do not split `App.tsx`, move data files, or refactor routing.
- Do not redesign the UI or introduce new dependencies.
- Do not modify `/home/zhang/workspace/reference-projects`.
- Do not expose real IPs, accounts, keys, database URLs, cloud API URLs, order numbers, signatures, signing file paths, production deployment details, or private task payloads.

## Allowed Paths

- Read: `/home/zhang/workspace/blog-semi`
- Read: `/home/zhang/workspace/reference-projects/erp`
- Read: `/home/zhang/workspace/reference-projects/pet`
- Read: `/home/zhang/workspace/reference-projects/xunqiu`
- Read: `/mnt/d/workspace4Codex/ques/fanhui.txt`
- Write in this planning round: `.agent-work/cc-plan.md` only

## Protected Paths

- `/home/zhang/workspace/reference-projects`
- Any `.env`, credential, signing, private key, database, deployment, backup, tmp payload, or production config files
- `src/` during this planning-only round

## Acceptance Criteria

- [ ] `.agent-work/cc-plan.md` contains a second-slice plan, not a repeat of the first slice.
- [ ] The plan lists current content that is already good enough and should not be rewritten.
- [ ] The plan identifies the smallest content corrections for Ozon ERP, Pet Workspace, and xunqiu.
- [ ] The plan separates project-detail technical content from case-detail business content.
- [ ] The plan includes a desensitization checklist for each of the three projects.
- [ ] The plan proposes one narrow first implementation slice.
- [ ] The plan lists verification commands and UI/content QA expectations.

## Risks

- The builder may treat existing content as missing and rewrite too much.
- Reference projects contain tmp files, deployment docs, local payloads, and real operational traces that must not be copied.
- Pet Workspace and xunqiu may contain multiple subprojects; the public narrative should simplify without inventing details.
- Ozon ERP details can accidentally reveal real operational concepts too concretely if copied from deployment or tmp files.

## Existing Work To Preserve

- Existing project/case routes and detail page structure.
- Current project catalog count and categories.
- First-slice navigation wording.
- Workflow files committed in `1cdf9b4`.

## Verification Plan

- [ ] Review `.agent-work/cc-plan.md` manually.
- [ ] Confirm no files except `.agent-work/cc-plan.md` changed during CC planning.
- [ ] If implementation is later approved: run `npm run lint` and `npm run build`.
- [ ] For content changes later: check `/projects/ozon-erp`, `/cases/ozon-erp`, `/projects/pet-workspace`, `/cases/pet-workspace`, and `/projects/xunqiu`.
- [ ] Run a sensitive-term scan before commit.

## Human Decisions Needed

- Approve the first content-calibration implementation slice after Codex reviews the CC plan.
