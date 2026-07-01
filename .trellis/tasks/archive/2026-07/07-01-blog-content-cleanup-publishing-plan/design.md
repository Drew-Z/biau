# Design

## Current Shape

The public blog is already gated by `src/data/blogCuration.ts` and `src/data/blogContent.ts`: only 10 curated posts are public and loadable. The remaining 87 posts still exist in two runtime places:

- summaries inside `src/data/blog.ts`
- full article modules under `src/data/blog-posts/`

Because those files remain in the runtime data directories, every future audit, rewrite, check, and content search has to distinguish public content from old generated material. That distinction is correct for a short transition period, but it is now unnecessary noise.

## Target Shape

Use a two-tier content layout:

- `src/data/blog.ts` and `src/data/blog-posts/`: curated runtime content only.
- `content-archive/legacy-blog/`: old generated source material, not imported by the app.

The archive will contain:

- `posts/`: moved legacy article modules, preserved as source material.
- `rewrite-queue.json`: machine-readable queue with metadata and recommended handling.
- `README.md`: human-readable policy and rewrite workflow.

## Runtime Contracts

- `blogPosts` is the runtime catalog. After cleanup it contains only the 10 curated posts.
- `blogCuration` remains the source of truth for public role, priority, and project relation.
- `blogContent.ts` remains the only runtime loader registry and continues to load only public posts.
- Public surfaces keep using selectors from `blogCuration.ts`, not raw archive files.

## Audit Changes

`scripts/audit-blog-catalog.ts` should continue to validate runtime consistency and also report legacy archive counts:

- runtime summaries
- public content loaders
- runtime content files
- legacy archived files
- legacy rewrite queue entries
- curation slugs not in runtime summaries
- runtime files without summaries
- public posts missing loaders

The old "hidden count must be non-zero" check should be removed because hidden runtime posts are no longer the target state. If a new draft belongs in runtime later, it can still use `visibility: 'hidden'`, but the audit should not require bulk hidden content to remain.

## Rewrite Flow

Future article revival should use `blog-content-pipeline`:

1. Pick one legacy entry from `content-archive/legacy-blog/rewrite-queue.json`.
2. Build a fresh evidence pack from project code, docs, current implementation, and safe public facts.
3. Rewrite into Markdown or typed `BlogPost` shape.
4. Review for factuality, duplication with project pages, and sensitive details.
5. Add the curated article back to `src/data/blog.ts`, `src/data/blog-posts/`, `blogContent.ts`, and optionally `blogCuration.ts`.
6. Regenerate assistant knowledge and sitemap if public visibility changes.

## Rollback

The cleanup is reversible because the old article modules are moved, not deleted. If needed, a specific article can be restored by moving its module from `content-archive/legacy-blog/posts/` back to `src/data/blog-posts/`, adding its summary to `src/data/blog.ts`, and registering curation/loader entries.
