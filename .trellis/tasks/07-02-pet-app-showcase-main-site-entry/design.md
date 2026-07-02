# Pet App 展示页接入主站设计

## Boundaries

- `blog-semi` owns the public BIAU Port entry: `/pet-app-showcase/`, project data, assistant knowledge, and sitemap.
- `pet/gamer` owns the original app showcase source, deployment notes, community API changes, and Android build artifacts.
- APK binaries stay outside `blog-semi/public/` until the user explicitly approves public release.

## Static Showcase Shape

- Add a pure static page under `blog-semi/public/pet-app-showcase/`.
- Reuse already-public screenshots from `/images/projects/showcase/`.
- Keep the APK action disabled and phrase the state as “待公开构建 / gated”.
- Link back into the main Pet project detail page and keep the source showcase link as secondary evidence.

## Project Data Sync

- Update `src/data/portfolio.ts` so the Pet project has:
  - a direct public showcase link;
  - source showcase link retained as evidence;
  - detail and `assistantContext` text that matches the public static page.
- Update sitemap generation to include the static route explicitly.
- Regenerate assistant public knowledge and sitemap instead of hand-editing generated outputs.

## Pet Repo Cleanup

- Inspect dirty files before touching them.
- Treat pagination/source changes as potentially intentional work; validate with focused tests before commit.
- Treat standalone command output files as removable only after confirming they are not documentation or test fixtures.

## APK Artifact Handling

- Use existing Android/Gradle commands and current repository layout.
- If a local APK builds, record filename, non-public local path, size, SHA-256, and build command in repo-owned release notes or task notes.
- If build fails, record the failing command, error class, and the next concrete fix.
- Do not expose signing material, private artifact locations, or public download URLs.
