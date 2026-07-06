# Project detail visual regression guard

## Goal

Prevent project detail pages from regressing into hero-image-only case pages by
adding automated UI coverage for body-level visual blocks.

The current `portfolio.ts` project data already contains multiple
`detailContent` sections with `visual` blocks. The gap is that `check:ui`
does not assert that those body visuals render across project detail routes, so
a future component/style/data regression could silently make the pages look
like they only have the top hero image.

## Requirements

- Add a UI regression check that visits project detail routes backed by
  `projects` data and compares rendered `.project-visual` figures with the
  expected `detailContent` visual count.
- Assert every project detail page with `detailContent` renders at least two
  body-level visual figures.
- For rendered visual images, assert the image loads, has non-zero natural
  dimensions, and does not create horizontal viewport overflow.
- Keep checks data-driven from `src/data/portfolio.ts`; do not hard-code only
  Legal RAG or Xunqiu.
- Do not add or change public project claims, external links, screenshots, or
  related-repository files in this slice.

## Acceptance Criteria

- [x] `scripts/check-ui.mjs` validates body-level project visuals for all
      detail pages with `detailContent`.
- [x] `npm.cmd run check:ui` passes.
- [x] `npm.cmd run lint` passes.
- [x] `npm.cmd run build` passes.
- [x] `git diff --check` passes.

## Notes

- Parent task: `07-04-biau-port-continuous-improvement`.
- This is a test/guard slice only; it should not require manual gates.
