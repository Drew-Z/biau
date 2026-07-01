# Implement

## Checklist

- [x] Confirm current audit baseline and legacy hidden list.
- [x] Generate `content-archive/legacy-blog/rewrite-queue.json` from the 87 hidden posts.
- [x] Move hidden post modules from `src/data/blog-posts/` to `content-archive/legacy-blog/posts/`.
- [x] Rewrite `src/data/blog.ts` so `blogPosts` contains only curated runtime posts.
- [x] Update `scripts/audit-blog-catalog.ts` for the new runtime/archive split.
- [x] Add `content-archive/legacy-blog/README.md` with archive policy and revival workflow.
- [x] Run validation commands and fix any issues.

## Validation

Run these after implementation:

```powershell
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run assistant:index
npm.cmd run sitemap:generate
npm.cmd run lint
npm.cmd run build
```

If public slugs change unexpectedly, stop and inspect `src/data/blog.ts`, `src/data/blogCuration.ts`, and `src/data/blogContent.ts` before continuing.

## Risk Points

- Moving files must not move any of the 10 featured article modules.
- `blogCuration` must not reference a slug missing from `blogPosts`.
- The archive must not be imported by frontend/runtime code.
- `blog:check` should scan public runtime posts and drafts, not legacy source material.

## Done Definition

The task is done when the runtime blog catalog contains only the curated public set, the legacy source material is preserved with a rewrite queue, and all listed validation commands pass.
