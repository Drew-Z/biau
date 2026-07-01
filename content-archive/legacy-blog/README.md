# Legacy Blog Archive

This directory preserves generated or draft-like blog material that is no longer part of the runtime public blog catalog.

## Why These Posts Are Archived

The public blog now favors curated, evidence-backed articles. These legacy posts were hidden before this cleanup and mostly came from bulk-generated knowledge material with similar dates, repeated series, and uneven public-readiness. Keeping them in `src/data/blog.ts` and `src/data/blog-posts/` made the runtime catalog noisy, even though they were not public.

Archiving keeps the source material available without exposing it through the website, assistant knowledge base, sitemap, or public article loader.

## Current Contract

- Runtime blog summaries live in `src/data/blog.ts`.
- Runtime article modules live in `src/data/blog-posts/`.
- This archive is not imported by the app.
- `rewrite-queue.json` is the source list for future review and rewrite work.

## Revival Workflow

To bring a legacy topic back:

1. Pick one entry from `rewrite-queue.json`.
2. Build a fresh evidence pack from current project code, docs, screenshots, Trellis notes, and safe public facts.
3. Rewrite the article through the `blog-content-pipeline` workflow.
4. Check that the article does not duplicate a project detail page.
5. Add the final article back to `src/data/blog.ts`, `src/data/blog-posts/`, `src/data/blogContent.ts`, and `src/data/blogCuration.ts` if it should be public.
6. Run `npm.cmd run blog:audit`, `npm.cmd run blog:check`, `npm.cmd run assistant:index`, `npm.cmd run sitemap:generate`, `npm.cmd run lint`, and `npm.cmd run build`.

Do not publish archive material directly without rewriting and review.
