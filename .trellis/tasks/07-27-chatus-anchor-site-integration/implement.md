# Chatus and Anchor site integration implementation

## Ordered Work

- [x] Rename the Anchor checkout and correct stale path/repository documentation.
- [x] Move the demo into the published tree and implement shared bilingual landing-page behavior.
- [x] Implement the three-dataset interactive demo, versioned progress, source tracing, and scripted tutor.
- [x] Add Anchor data/browser tests, capture desktop/tablet/mobile evidence, and deploy/verify Cloudflare Pages.
- [x] Add/correct main-site Chatus and Anchor portfolio, hero, status, SEO, sitemap, and assistant knowledge.
- [x] Produce privacy-reviewed runtime and architecture assets with PNG/WebP variants.
- [x] Write the eight technical-dossier files and at least 120 interview Q&A entries.
- [x] Add the documentation contract check and run the complete validation matrix.
- [x] Commit and push Anchor.
- [x] Commit and push the main site.

## Validation

### Anchor

- Static data/unit checks.
- Playwright flow checks at 1440x900, 768x1024, and 390x844.
- Verify locale persistence, all datasets/question kinds, citations, tutor, reset/recovery, keyboard operation, no overflow, and no external demo requests.
- Verify production `/`, `/app/`, and `/app/index.html` after deployment.

### Main Site

```bash
npm.cmd run assistant:index
npm.cmd run assistant:kg-check
npm.cmd run project-details:check
npm.cmd run sitemap:generate
npm.cmd run docs:project-notes-check
npm.cmd run status:contract
npm.cmd run public-links:check
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

## Production Validation Record

Recorded on 2026-07-27 against Anchor commit `3df49e00fac37bef169631b4c2f986f26df8ab4d` and the public URLs released by this task.

- Anchor `ANCHOR_BASE_URL=https://anchor.playlab.eu.cc npm.cmd run test:e2e`: 12 of 12 Playwright checks passed in Chromium after the final deployment. The suite covered persistent bilingual locale, all three datasets and twelve questions, answer/evidence/tutor flow, recovery/reset, keyboard and ARIA behavior, mobile navigation, nonblank desktop/tablet/mobile evidence, horizontal overflow, and off-origin requests.
- Anchor direct HTTP observation: `/` returned 200; `/app/` returned 200; `/app/index.html` returned a 308 canonical redirect and followed to `/app/` with 200. This proves the current route behavior, not continuous availability.
- Anchor deployed-asset observation: five key files matched the repository byte-for-byte by SHA-256: `/index.html`, `/scripts/i18n.js`, `/app/index.html`, `/app/scripts/app.js?v=20260727-2`, and `/app/scripts/data.js`. The versioned `app.js` URL is the URL referenced by the deployed Demo document.
- Anchor CI run `https://github.com/Drew-Z/anchor/actions/runs/30220235053` passed Analyze Code, Run Tests, Test Web Demo, and Build Android APK for commit `3df49e00fac37bef169631b4c2f986f26df8ab4d`.
- Anchor local final gate passed Dart formatting, `flutter analyze --no-fatal-infos` with 43 pre-existing info-level diagnostics and no errors or warnings, 345 Flutter tests, five Node tests, twelve local Playwright tests, and `git diff --check`.
- Chatus direct HTTP observation: the invitation-only root followed to `/react-chat/` and returned 200 HTML. No access code was supplied and no credentialed member, guest, provider, model, or operations capability was exercised.
- Main-site public-link observation before the Pet URL correction: all newly added Chatus and Anchor links passed. The unrelated ERP entry redirected cross-origin and ended at HTTP 403; it remains truthfully represented as degraded rather than allowlisted.

Final main-site validation on 2026-07-27:

- `docs:project-notes-check`: passed with 120 Q&A groups and 44 evidence rows.
- `project-details:check`: passed for 14 projects; Chatus and Anchor each include three in-body visuals.
- `assistant:kg-check`: passed with 29 documents, 58 chunks, 157 entities, and 220 relations.
- `status:contract`: passed for 8 reliability projects, 7 external targets, and 33 reliability checks.
- `lint`, `build`, and `server:build`: passed.
- `check:ui`: passed for 17 routes across desktop and mobile viewports at the local test origin.
- `public-links:check`: 42 of 43 links passed after correcting the stale Pet branch URL. All task-added Chatus and Anchor links passed; the sole residual failure is the existing ERP redirect ending at HTTP 403.
- `git diff --check`: passed.

## Guardrails

- Do not touch `.codex-patch-test` or unrelated user changes.
- Do not call an AI provider while validating Anchor or AI Daily documentation.
- Do not expose Chatus private repository URLs, access material, provider identities, member data, or raw operations details.
- Do not claim AI Daily production completion or Anchor full-web parity.
