# Project Detail Case Study Content And Visual Evidence Implementation Plan

## Phase 1: Planning

- [x] Create Trellis task.
- [x] Write PRD with requirements, first slice, and acceptance criteria.
- [x] Write design with data, visual, assistant sync, validation, and manual gate boundaries.

## Phase 2: First Slice - Evidence Refresh Audit

- [x] Load `trellis-before-dev`.
- [x] Inspect current project detail data and checks:
   - `src/data/portfolio.ts`
   - `scripts/check-project-detail-evidence.ts`
   - `scripts/check-ui.mjs`
   - `docs/manual-gates.md`
- [x] Run or inspect current outputs from:
   - `npm.cmd run project-details:check`
   - `npm.cmd run public-links:check` if links are involved
- [x] Choose one project with a meaningful local improvement opportunity.
- [x] Update public-safe project facts:
   - `detailContent`
   - `assistantContext`
   - visual captions or diagram metadata if needed
- [x] Regenerate assistant knowledge:
   - `npm.cmd run assistant:index`
- [x] Run validation and update this file with results.

### First Slice Result

- Selected `pet-workspace` because the site already has public-safe Android emulator screenshots and the release/APK boundary is important to present honestly.
- Added an in-body project detail screenshot section for the Android hatch flow.
- Added an in-body workflow screenshot for the Android community/feed surface.
- Updated public assistant context so the assistant can explain that these screenshots are display evidence, while public APK download remains release-gated.
- Regenerated public assistant knowledge indexes.

## Phase 3: Validation

Minimum:

```powershell
npm.cmd run project-details:check
npm.cmd run assistant:index
npm.cmd run assistant:kg-check
npm.cmd run lint
npm.cmd run build
git diff --check
```

Current first-slice results:

- [x] `npm.cmd run project-details:check`
- [x] `npm.cmd run public-links:check`
- [x] `npm.cmd run assistant:index`
- [x] `npm.cmd run assistant:kg-check`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `npm.cmd run check:ui`
- [x] `git diff --check`

## Phase 4: Mobile Home Interaction And Trust Slice

- [x] Resolve compact-navigation overlap by moving route and language actions
  into a mobile menu while preserving brand and theme access.
- [x] Keep the document as the vertical-scroll owner on touch devices.
- [x] Preserve poem interaction through tap and direction-locked horizontal
  gestures without intercepting vertical page movement.
- [x] Replace the desktop Port pointer-drag loop with a native horizontal
  `scroll-snap` rail on mobile, showing one project set and a partial next card.
- [x] Add a full-width trust footer with project nature, privacy, disclaimer,
  and public contact information.
- [x] Add UI regression coverage for `320`, `390`, and `430` pixel home-page
  viewports, including navigation layering and gesture CSS contracts.

### Mobile Slice Result

- Desktop poem elasticity and vertical infinite Port scrolling remain active.
- Mobile visitors can scroll the page vertically from the title or project
  rail, tap or swipe horizontally to change the poem, and swipe the Port rail
  horizontally using browser-native momentum and snapping.
- The mobile header now exposes Logo, theme, and menu without overlap; language
  switching and primary navigation remain available in the menu.
- The public footer now explains site ownership boundaries and links contact to
  the repository issue tracker without exposing private contact details.

Validation completed for this slice:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run public-links:check
npm.cmd run check:ui
git diff --check
```

`check:ui` passed 14 routes across desktop/mobile route checks and the dedicated
`320 / 390 / 430px` home-page regression loop.

## Phase 5: Mobile First-Load Performance And Intro Reliability

- [x] Measure the deployed mobile cold-load resource chain and animation state.
- [x] Remove the unused full Semi UI stylesheet from the public entry.
- [x] Remove the render-blocking Google Fonts stylesheet and use system font
  stacks for Chinese/Latin UI and display text.
- [x] Split the public assistant, Assistant workspace, admin, Studio, status,
  project-detail, blog-detail, and missing-page code from the home entry where
  route UX permits.
- [x] Add Cloudflare Pages immutable cache headers for hashed assets and bounded
  cache headers for public images/favicon.
- [x] Upgrade the intro completion marker to `v2` and persist it only after the
  animation veil completes.
- [x] Add a build performance budget and mobile first-entry animation regression.

### Performance Slice Result

- Deployed pre-fix trace: mobile FCP was about `5.7s`; the blocking Google Fonts
  stylesheet transferred about `217KB`, and the intro could only mount after the
  React entry finished loading.
- Entry CSS changed from about `836KB` raw / `108KB` gzip to `181KB` raw /
  `30KB` gzip.
- Entry JavaScript changed from about `485KB` raw / `149KB` gzip to `385KB` raw /
  `126KB` gzip; non-critical product surfaces now have separate chunks.
- Simulated mobile 4G plus 4x CPU slowdown on the new local build produced first
  paint around `0.7s`, FCP around `1.87s`, intro mount at DOM readiness, and
  completed docking around `4.5s`.
- Production still needs a deployment before the new bundle and `_headers`
  behavior can be observed on the public domain.

Validation completed for this slice:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run performance:check
$env:UI_CHECK_BASE='http://127.0.0.1:5196'; npm.cmd run check:ui
git diff --check
```

Conditional:

```powershell
npm.cmd run check:ui
npm.cmd run public-links:check
npm.cmd run status:contract
```

## Candidate Projects

- `blog-semi`: recently changed Agent productization facts; good for verifying project page and assistant sync.
- `pet-workspace`: still release-gated; good for honest APK/manual gate handling, but avoid claiming public download.
- `xunqiu`: deployed static showcase and staged APK; good for release boundary wording.
- `legal-rag`: rich case study already, but credentialed demo remains manual gate.

## Manual Gates

Record but do not block on:

- new screenshots requiring protected dashboards or accounts;
- production synthetic credentials;
- release APK/AAB signing and public download approval;
- external cloud/status dashboards;
- real model quality tasks.
