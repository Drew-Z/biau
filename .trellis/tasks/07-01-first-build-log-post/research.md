# External Research Notes

## Question

有没有类似的内容生成 / 博客生成 skill、工作流或项目可以借鉴，帮助本站后续生成更精致的博客内容？

## Sources Checked

- Smart Search doctor confirmed the local research stack was usable.
- `smart-search search "open source AI blog generation workflow markdown frontmatter content pipeline"` produced candidate workflows and references.
- Fetched evidence:
  - `https://github.com/ikramhasan/AutoBlog-AI-Blog-Generator`
  - `https://frontmatter.codes/`
  - `https://blog.devgenius.io/automating-markdown-based-blogs-with-github-actions-and-ai-28d14c695335`
  - `https://adityakarnam.com/ai-blog-generator-n8n-results/`
  - `https://github.com/langchain-ai/local-deep-researcher`
  - `https://developers.google.com/search/docs/fundamentals/creating-helpful-content`

## Findings

- **AutoBlog-AI-Blog-Generator** is useful as a small local reference for topic -> generated markdown -> local files. It is not enough for this site by itself because its value is bulk generation, while this site needs evidence-first, curated, public-safe writing.
- **Front Matter CMS** is useful as an editorial/content-management reference for Markdown/frontmatter sites: content types, media dashboard, preview, SEO checks, and editor-native workflow. It is less directly useful right now because this repo stores blog posts as typed TypeScript modules instead of Markdown files.
- **GitHub Actions + AI markdown workflow** is useful as an automation pattern: analyze existing posts, generate a candidate post, create cover image, commit to a branch, and open a PR for human review. The important part to borrow is PR-based review, not automatic publishing.
- **n8n RSS + Gemini MDX pipeline** is useful for future `AI 日报`: ingest multiple sources, synthesize with a low-temperature model, extract structured fields, and publish MDX/frontmatter. Its own retrospective also warns that large batches of AI summaries can increase impressions while producing weak clicks; original experience and specific technical insight remain the durable value.
- **Local Deep Researcher** is useful as a research sub-flow, not a blog writer: iterative search, gap reflection, source collection, and final markdown summaries with citations. This maps well to the evidence-pack stage of `blog-content-pipeline`.
- **Google Search Central helpful content guidance** supports the current direction: prioritize people-first, reliable, original content; disclose or explain automation when relevant; avoid mass low-value automation and shallow summaries.

## Recommendation For This Site

- Keep `blog-content-pipeline` as the main skill. Do not replace it with a bulk autoblog tool.
- For project/knowledge/build-log articles: use Codex to collect evidence from local projects and one strong content model to draft or rewrite, then Codex reviews and ingests.
- For `AI 日报`: later build a separate source-driven workflow inspired by the n8n pattern, but keep posts in draft until sources and review pass.
- For resources: keep them manually curated because the column needs personal judgment, not scraped link collections.
- If automation is added, make it create draft branches/PRs only. Public visibility should still go through `blogCuration`.

## Practical Next Step

Add a future task for a `blog draft generator` command that outputs a typed draft or markdown scratch file from an evidence pack, then optionally converts it into the current `BlogPost` TypeScript shape after review.
