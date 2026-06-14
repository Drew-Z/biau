# Current Task

Date: 2026-06-14
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Codex

## Goal

Add one desensitized business case page for the existing `xunqiu` project.

The user has explicitly approved relaxing the previous "do not add cases" rule for this one item only. The project already exists in `projects[]`; this task only adds a matching `caseStudies[]` entry so `/cases/xunqiu` and the xunqiu project-to-case path work consistently.

## Scope

- Add one `caseStudies[]` object with `id: 'xunqiu'` and `projectId: 'xunqiu'`.
- Keep the content business-facing: historical mobile system takeover, Android 64-bit rebuild, service API reuse, staged verification.
- Use only desensitized, concept-level wording.
- Do not change project routes, styles, or data architecture.

## Non-goals

- Do not add new projects.
- Do not add blog posts.
- Do not add screenshots or media.
- Do not modify `/home/zhang/workspace/reference-projects`.
- Do not copy real accounts, tokens, server IPs, database config, SQL details, signing files, APK hashes, release package paths, real media URLs, or test data.
- Do not split `App.tsx` or refactor `caseStudies`.

## Allowed Paths

- `src/App.tsx`
- `.agent-work/*`

## Acceptance Criteria

- [ ] `/cases/xunqiu` resolves to a real case detail entry.
- [ ] `/projects/xunqiu` can show the business case button via `getCaseStudyForProject`.
- [ ] The new case uses the same `CaseStudy` fields as existing cases.
- [ ] The content clearly differs from project technical detail: it tells the business/portfolio story.
- [ ] Sensitive terms are not introduced.
- [ ] `npm run lint` and `npm run build` pass.

## Verification Plan

- Run `npm run lint`.
- Run `npm run build`.
- Run sensitive scans over `src/App.tsx` and `src/data/portfolio.ts`.
- Check built assets contain `寻球移动端业务系统重构案例` or the final case title.
