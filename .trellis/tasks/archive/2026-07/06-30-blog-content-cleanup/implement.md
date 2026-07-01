# Blog content cleanup implementation plan

## Checklist

1. Add blog curation types and selectors.
   - Create `src/data/blogCuration.ts`.
   - Keep raw `blogPosts` unchanged as the canonical content list.
   - Add selector helpers for featured, public, project-related and related posts.

2. Seed first-pass curation.
   - Mark a small set of visitor-facing entries as `featured`.
   - Current public set: Legal RAG review, Legal RAG production upgrade, Ozon ERP architecture, Pet Workspace pipeline, Xunqiu rebuild, game showcase standard, content modeling, public content governance, static site release verification.
   - Attach `projectIds` for `legal-rag`, `pet-workspace`, `ozon-erp`, `biau-playlab`, `blog-semi`, and `xunqiu`.
   - Leave the rest as `hidden` until they are rewritten into visitor-readable blog posts.

3. Update blog index.
   - Default view shows only public curated posts.
   - Preserve search, category filtering and pagination within the public set.
   - Keep layout close to the current page and avoid a large redesign.

4. Update blog detail.
   - Replace same-category-only related posts with selector-based related posts.
   - Add associated project links when a post has `projectIds`.
   - Block direct access to hidden blog slugs by returning the existing missing-article state.
   - Keep `src/data/blogContent.ts` loaders limited to public posts so hidden article chunks are not part of the public runtime bundle.

5. Update project detail.
   - Add an “延展阅读” section driven by `getProjectBlogPosts(project.id)`.
   - Avoid duplicating links already present in `project.links` unless they serve different UI positions.

6. Update public assistant knowledge.
   - Build blog knowledge from public visible posts rather than all raw posts.
   - Preserve project-first scoring for project questions.
   - Optionally add curation role/featured tags to improve retrieval.

7. Add audit/check coverage.
   - Add `scripts/audit-blog-catalog.ts` or extend `scripts/check-public-blog.mjs`.
   - Add package script such as `blog:audit`.
   - Ensure checks fail on invalid project IDs, missing featured metadata and hidden content leaking into public selectors.
   - Ensure generated assistant knowledge, SEO and sitemap use public selectors rather than all raw posts.

8. Verify.
   - `npm run blog:audit`
   - `npm run blog:check`
   - `npm run assistant:index`
   - `npm run sitemap:generate`
   - `npm run lint`
   - `npm run build`

## Risk Notes

- `src/data/blog.ts` is large; avoid broad formatting changes.
- `src/data/assistant.ts` search behavior recently changed, so keep scoring edits minimal and verify project-focused queries still return project citations first.
- Project detail pages already have content sections and links; the reading section should be additive and not disrupt existing case-study structure.
- If styling is needed, keep changes scoped to existing blog/project detail classes.

## Rollback Points

- Curation selectors can gradually reopen hidden posts after rewriting.
- Blog page can return to a larger public archive by changing selected posts from `hidden` to `archive` or `featured`.
- Assistant can return to mapping `blogPosts` directly if retrieval quality regresses.
