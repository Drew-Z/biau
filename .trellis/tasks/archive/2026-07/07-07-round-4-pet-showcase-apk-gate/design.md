# Pet showcase APK release gate design

## Scope

This task verifies and improves the public Pet App showcase and APK release gate. The BIAU Port repo owns public status data, synthetic scripts, project/status copy, and the deployed static entry. The Pet workspace is an evidence source with multiple prototype repos; do not treat the root folder as a single clean release repository.

## Boundaries

- Do not publish debug APKs, unsigned artifacts, local build paths, signing key paths, private worker links, tokens, or internal artifact URLs.
- Do not claim a public APK release unless a release build, signing policy, checksum, regression evidence, release notes, rollback note, and human approval are all present.
- Pet root `D:\workspace4Cursor\pet` has no top-level git repository. Subprojects such as `gamer`, `pet-clean`, `fantasy-pet-kmp`, and `pet-enterprise` own their own repositories and rules if edited.
- Prefer main-site status/script improvements first. Only edit Pet subprojects after reading that subproject's local rules and when the change clearly improves the public showcase or release gate.

## Current Evidence

- Public showcase source exists at `D:\workspace4Cursor\pet\gamer\pet-app-showcase-site`.
- The showcase page intentionally disables APK download and documents the release checklist.
- `public/status/pet-gamer-synthetic.json` currently reports `pet-showcase` online with 4/4 screenshots reachable.
- The latest APK gate report found one debug artifact and zero release candidates, so public download remains gated.

## Technical Design

1. Verify Pet showcase and artifact state:
   - Run `npm.cmd run pet:synthetic`.
   - Inspect generated `apkGate` metadata for sanitized artifact counts only.
   - Keep artifact paths out of `public/status/pet-gamer-synthetic.json`.

2. Improve public copy if evidence is stale or ambiguous:
   - `src/data/statusTargets.ts` should say debug-only/no-artifact states are not public releases.
   - Project/detail pages and status pages should point to the showcase without offering APK downloads.
   - Manual gates should list what the user must approve before a real APK link can be added.

3. Validate static page assets:
   - Synthetic checks the deployed page and screenshots.
   - If adding or changing references, verify files under `public/images/projects/showcase/` exist and no `.apk` href appears before approval.

## Rollback

- If synthetic incorrectly promotes a debug artifact, revert script/status changes and regenerate the report.
- If public entry goes offline due to a transient deploy issue, record it as entry reachability without opening APK gate.
- If a release candidate is discovered locally, keep `publicDownloadApproved=false` until the manual gate is explicitly satisfied.
