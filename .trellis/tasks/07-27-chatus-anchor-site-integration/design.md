# Chatus and Anchor site integration design

## Repository Boundaries

- `D:/workspace4Cursor/learn/anchor`: Anchor rename, landing page, static demo, tests, and Cloudflare Pages deployment.
- `D:/workspace4Cursor/chatus`: read-only evidence and privacy-reviewed fixture screenshots; no tracked or production changes.
- `D:/workspace4Cursor/blog-semi`: Trellis task, portfolio/home/status data, public assets, assistant knowledge, sitemap, documentation, and validation.

Each repository is committed independently. Anchor production is verified before the main-site link is finalized.

## Anchor Web Architecture

Cloudflare Pages continues publishing `web/landing`. The demo moves under `web/landing/app/`; landing links use the stable `/app/` surface and direct `/app/index.html` remains valid.

Shared locale behavior uses `anchor.locale`, browser-language fallback, and `zh` / `en` dictionaries. Demo progress uses the versioned `anchor.demo.progress.v1` key and discards malformed or incompatible state.

The demo data contract is:

`Dataset -> Question -> Options -> Explanation -> Citations -> TutorHints`

Question kinds are `single`, `multiple`, and `boolean`. Tutor content is bundled and explicitly labeled as scripted. No question flow invokes a provider or backend.

## Main-Site Projection

- Reuse the existing `Project`, `HeroProject`, and `SiteStatusTarget` contracts.
- Keep `anchor-learning`; add `chatus`.
- Chatus uses a `login-gated` status expectation and an invite-only CTA. Anchor uses a `static-site` expectation and online-demo CTA.
- Portfolio `assistantContext` is the public knowledge source; private Chatus implementation identifiers and operational configuration remain excluded.
- Project assets include a cover and at least three in-body visuals with alt text, captions, PNG, and WebP.

## Documentation Contract

`docs/project-notes/` contains `README.md`, four project dossiers, cross-project patterns, `interview-question-bank.md`, and an evidence register. Claims are marked `source-verified`, `production-observed`, `documented-design`, or `portfolio-claim`. Cross-repository evidence uses repository, commit SHA, path, and symbol/section rather than local absolute paths.

A deterministic documentation check enforces required files/headings, evidence labels, link integrity, sensitive-pattern exclusions, and the Q&A floor.

## Rollback

- Anchor: redeploy the previous Cloudflare Pages release and revert its isolated commit; the local folder can be renamed back without data migration.
- Main site: revert its isolated content/assets/docs commit.
- Chatus: no rollback because no change is made.
