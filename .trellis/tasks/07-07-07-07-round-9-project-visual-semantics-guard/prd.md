# Round 9 project visual semantics guard

## Goal

Improve project detail visual evidence so each public case page has both runtime screenshot evidence and a structural workflow/architecture visual, starting with Space War and enforcing the pattern through project-details:check.

## Requirements

- R1. Audit current project detail visual types from `src/data/portfolio.ts` and identify semantic gaps.
- R2. Add or improve public-safe visual evidence for at least one project whose details lack a structural workflow/architecture/data-flow visual.
- R3. Do not fabricate runtime screenshots. If a new image is needed for structure, use a clearly labeled diagram SVG/asset that explains current public-safe behavior.
- R4. Strengthen `project-details:check` so each project detail has both at least one screenshot and at least one structural visual type.
- R5. Update showcase asset tracking docs when adding a new public asset.
- R6. Run focused and broad validation.

## Acceptance Criteria

- [x] Space War or another identified weak project gains a public-safe structural visual in its detail content.
- [x] `project-details:check` fails if a project has only screenshots or only structural visuals.
- [x] New asset paths exist under `public/images/projects/` and are listed in `docs/showcase-assets.md`.
- [x] `project-details:check`, `lint`, `build`, and `verify` pass.
- [x] Manual gates and push limitation are recorded.
- [x] Changes are committed locally; push remains deferred until SSH host key verification is resolved.

## Notes

- Initial audit found `space-war` has two body visuals, both runtime/status screenshots, and lacks an explicit workflow/architecture/data-flow diagram.

## Result

- Added `public/images/projects/showcase/space-war-loop.svg`, a public-safe playable-loop diagram.
- Added a `workflow` visual to Space War's architecture section while keeping existing gameplay/result screenshots.
- Strengthened `project-details:check` so every project detail requires at least one in-body screenshot and one structural visual (`workflow`, `architecture`, `data-flow`, or `diagram`).
- Updated `docs/showcase-assets.md` and frontend quality spec with the visual composition rule.

## Validation

- `npm.cmd run project-details:check`
- `npm.cmd run lint`
- `git diff --check`
- `npm.cmd run build`
- `npm.cmd run verify`
- Targeted sensitive scan over `portfolio.ts`, the project detail check, docs, task files, and the SVG: only expected public boundary wording / regex patterns appeared.

## Manual Gates

- GitHub SSH host key verification still blocks pushing local commits.
- Replacing screenshots with fresher captures from related projects remains a future manual/asset task if it requires running those apps.
