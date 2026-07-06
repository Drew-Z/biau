# Project Detail Evidence And Visuals Design

## Boundary

This child task owns `blog-semi` project detail content quality and public-safe visual evidence. It can inspect related project repositories for evidence, but the first slice should avoid cross-repo edits unless a real content gap requires it.

## Baseline Finding

The current project catalog already has detail content and in-body visuals for every project, and an initial asset audit found no missing visual image paths. The useful next improvement is therefore a guardrail: prevent future project detail edits from regressing into top-image-only pages or broken visual references.

## Target Slice

Add a deterministic project-detail evidence check that verifies:

- every project has `detailContent`;
- each project has enough visitor-readable sections;
- every project has in-body visual evidence, not only a hero image;
- every referenced `/images/projects/...` visual exists under `public/`;
- visual metadata has useful title/description/alt text.

The check should be public-safe, offline, and avoid reading private related repos or generated screenshots. If it finds thin project content later, it should fail with actionable project ids and paths.

## Safety

Do not add fabricated screenshots or private evidence. If a future project lacks safe images, the check should point to the gap rather than inventing an asset.

