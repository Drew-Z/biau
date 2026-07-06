# Project Visual Semantics Guard Design

## Scope

Target files:

- `src/data/portfolio.ts`
- `scripts/check-project-detail-evidence.ts`
- `docs/showcase-assets.md`
- `public/images/projects/showcase/<new-asset>.svg`
- optionally `.trellis/spec/frontend/quality-guidelines.md` if the visual composition rule should be preserved.

## Design Direction

Project detail pages already require detail content and at least two in-body visuals. The next quality step is semantic composition:

- runtime evidence: at least one `screenshot` visual;
- structural evidence: at least one `workflow`, `architecture`, or `data-flow` visual.

This keeps a case page from becoming only screenshots without explanation, or only diagrams without runtime proof.

For Space War, add a small public-safe SVG workflow diagram that explains the current playable loop:

```text
Menu -> Web playable scene -> Combat loop -> Result page -> Back to project/showcase
```

The diagram must avoid private URLs, build paths, user data, analytics, or unapproved release claims.

## Compatibility

- Keep `ProjectVisualBlock.type` unchanged.
- Add a new visual section or replace the less informative status screenshot only if the page stays readable.
- The check should use existing type literals and keep current asset existence/source checks.

## Validation

- `npm.cmd run project-details:check`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`
- Targeted sensitive scan over changed files and the new SVG.
