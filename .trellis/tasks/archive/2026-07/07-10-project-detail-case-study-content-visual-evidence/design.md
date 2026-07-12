# Project Detail Case Study Content And Visual Evidence Design

## Data Boundary

The canonical project detail model remains `src/data/portfolio.ts`:

- `Project.detailContent` owns visitor-readable case-study sections.
- `ProjectVisualBlock` owns in-body visual metadata.
- `Project.assistantContext` owns public assistant facts.
- `getProjectAssistantSummary()` and `getProjectAssistantTags()` remain shared projection helpers.

Do not hard-code project-specific case-study body in `ProjectDetailPage.tsx`. Rendering should stay generic.

## Visual Strategy

Use this priority order:

1. Real public-safe runtime screenshots already under `public/images/projects/showcase/`.
2. New public-safe screenshots captured from deployed or local static pages with private data absent.
3. Public-safe SVG workflow/architecture diagrams that explain existing implementation boundaries.
4. Manual gate note when a real screenshot requires credentials, private data, APK approval, or cloud access.

Raster images must be parseable and keep WebP sidecars where required by `project-details:check`.

## Content Strategy

Each project detail improvement should strengthen at least one of:

- workflow: how a visitor or operator uses the product;
- architecture: the implementation/data/deployment shape;
- quality: tests, smoke checks, evals, synthetic checks, or status contracts;
- limitations: honest current gaps and manual gates;
- roadmap: concrete follow-up directions.

Avoid generic marketing copy. Prefer specific facts such as script names, route names, public-safe module names, status categories, release gates, or local validation results.

## Assistant Sync

After changing public project facts:

```powershell
npm.cmd run assistant:index
npm.cmd run assistant:kg-check
```

Generated files:

- `server/data/public-knowledge.json`
- `server/data/public-knowledge-v2.json`

These generated files should be committed with the source data change.

## Validation

Minimum local checks:

```powershell
npm.cmd run project-details:check
npm.cmd run assistant:index
npm.cmd run assistant:kg-check
npm.cmd run lint
npm.cmd run build
git diff --check
```

Run `check:ui` if:

- visual metadata changes;
- screenshots or captions change;
- project detail rendering is touched;
- a project page might wrap/overflow differently.

Run `public-links:check` if project links change.

## Manual Gate Handling

Manual gates are not failures. They should be recorded when evidence cannot be produced locally without:

- real credentials;
- production accounts;
- cloud dashboard actions;
- paid model calls or live model tasks;
- APK/AAB signing and release approval;
- screenshots containing private or sensitive data.
