# Plan: xunqiu Business Case

## Read-only Findings

- `xunqiu` already exists in `projects[]`, `getProjectStructure()`, and `getProjectDetailContent()`.
- `caseStudies[]` currently contains Legal RAG, Ozon ERP, Pet Workspace, and Godot showcase, but no `xunqiu` case.
- `getCaseStudyForProject(project.id)` drives the project page business-case button, so adding one case entry is enough to connect `/projects/xunqiu` to `/cases/xunqiu`.

## Approved Scope

Add exactly one `caseStudies[]` entry for the existing xunqiu project.

## Content Shape

- Positioning: mobile business system takeover and Android 64-bit rebuild.
- Business problem: historical multi-end system, old Android migration, service API reuse, release verification.
- Solution: new 64-bit Android client skeleton, module-by-module restoration, service API wrapper, staged verification.
- Results: login/session path, feed/video/schedule/profile modules, no legacy 32-bit native libraries, staged build and emulator verification.
- Evidence: directory structure, module map, migration docs, release verification notes. Keep evidence abstract.

## Desensitization

Do not mention real test accounts, tokens, server IPs, database configuration, SQL content, signing files, APK hashes, package paths, real media URLs, or generated test data.

## Files Expected To Change

- `src/App.tsx`
- `.agent-work/verification.md`

## Verification

- `npm run lint`
- `npm run build`
- Sensitive scan for account/IP/token/key/hash/server/path terms in public source.

## Non-actions

- Do not add projects, blog posts, screenshots, media, dependencies, or CSS.
- Do not modify reference projects.
