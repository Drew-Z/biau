# Round 11 project detail evidence gate

## Goal

Strengthen the deterministic project detail evidence gate so public project case pages keep complete case-study structure, safe hero/link evidence, non-thin section content, and meaningful in-body visuals instead of regressing to sparse text or a single hero image.

## Requirements

- R1. Extend the existing `npm.cmd run project-details:check` script rather than creating a second project-detail validator.
- R2. Keep the check deterministic and local; it must not call live sites, live model providers, cloud dashboards, or private project services.
- R3. Validate public-safe project surfaces beyond body visuals, including hero images, project/detail links, required case-study groups, section density, visual IDs, and accidental body-visual reuse.
- R4. Preserve the existing public data contract in `src/data/portfolio.ts`; do not rewrite project copy or fabricate new screenshots in this task.
- R5. Update docs/spec notes so future project-detail edits understand the stronger gate.

## Acceptance Criteria

- [x] `npm.cmd run project-details:check` fails on missing required case-study groups, unsafe/missing hero images, unsafe project links, duplicate visual IDs, too-thin sections, and all-body-visuals-reuse-hero regressions.
- [x] Existing project catalog passes the strengthened gate.
- [x] Relevant docs/spec mention the new gate coverage.
- [x] `npm.cmd run lint` and `npm.cmd run build` pass.
- [x] No secrets, private URLs, model relay endpoints, production credentials, or unapproved APK links are added.

## Results

- Extended `scripts/check-project-detail-evidence.ts` to validate required case-study groups, hero image assets, project/detail/section links, duplicate visual IDs, repeated body visual images, hero-only body visual regressions, public-safe text patterns, and minimum section density.
- Updated `docs/showcase-assets.md` and `.trellis/spec/frontend/quality-guidelines.md` with the stronger gate coverage.
- Verified with `npm.cmd run project-details:check`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run verify`, `git diff --check`, and a targeted sensitive-pattern scan over changed diffs.

## Manual Gates

- Real screenshots, public release APK/AAB links, live site checks, and credentialed demo validation remain separate manual-approved work.
