# Blog Content Templates

Use these as writing structures, not mandatory headings. Keep public copy concrete, sanitized, and visitor-readable.

## 知识积累 / Knowledge Notes

- Goal: preserve reusable technical understanding, engineering methods, or AI application practice.
- Good topics: RAG quality, citation design, agent permissions, deployment verification, content governance.
- Required evidence: external papers, official docs, public technical references, public examples, constraints, and failure cases. Use project code or docs only when the article makes project-specific claims.
- Structure: knowledge boundary; definitions; core mechanisms; why the mechanism exists; tradeoffs; failure modes; scenario fit; practical checklist; optional short application note.
- Common failures: generic tutorial prose, project-first framing, broad claims without evidence, copying tool docs, treating a project roadmap as the main article.
- Review gate: the article remains useful even if a single project changes. Project application notes should usually stay near the end and take no more than about 10%-15% of the article.

## 项目总结 / Project Notes

- Goal: record project stage review, architecture tradeoffs, gaps, and next iteration direction.
- Good topics: project milestone review, refactor result, productionization plan, bug lessons, migration story.
- Required evidence: code, data modules, tests, deployment scripts, screenshots, project detail page, Trellis notes. Do not rely only on README files.
- Structure: project stage and goal; what changed or was built; architecture/workflow choice; constraints or tradeoffs; what still lacks; next iteration.
- Common failures: repeating the project detail page, over-claiming maturity, hiding WIP state, listing tech stack without lesson.
- Review gate: stable facts stay on the project page; the blog explains judgment, process, tradeoff, or iteration.

## 资源分享 / Resource Picks

- Goal: share resources the author actually recommends with usage context and judgment.
- Good topics: tools, articles, repositories, models, courses, templates, assets.
- Required evidence: source link or saved resource, reason for recommendation, applicable scenarios, caveats.
- Structure: what it is; why I recommend it; best-fit scenarios; how I would use it; limitations; alternatives.
- Common failures: raw link lists, auto-generated resource bundles, no personal judgment, affiliate-like tone.
- Review gate: readers can tell why this resource is worth saving and when not to use it.

## AI 日报 / AI Daily

- Goal: capture high-frequency AI model/tool/product signals with source-backed claims.
- Good topics: model releases, tool changes, industry cases, experiments worth trying.
- Required evidence: current sources and dates for every news-like claim.
- Structure: highlights; what changed; why it matters; what to try; sources to revisit; open questions.
- Common failures: unsourced news, stale claims, long-term methodology disguised as daily news, hype without testable value.
- Review gate: if sources are weak or not current, keep as draft.

## 构建手记 / Build Log

- Goal: record site, workflow, assistant, content-system, and release process evolution.
- Good topics: Trellis workflow changes, blog governance, assistant indexing, release verification, automation cleanup.
- Required evidence: changed files, task notes, commands run, verification output, before/after behavior.
- Structure: starting point; decision made; implementation path; verification; what became easier; follow-up work.
- Common failures: internal diary tone, no verification, too much process without outcome, duplicating docs.
- Review gate: the post teaches a reusable workflow lesson while staying safe for public readers.

## Evidence Pack Checklist

- Source paths or URLs read.
- Facts safe to publish.
- Facts that are uncertain or stale.
- Details that must be omitted.
- Target column.
- Intended reader and value.
- Model channel used, if any.
- Review status.

## Promotion Checklist

- Draft has passed fact, safety, column-fit, and duplication review.
- Final article is converted into `BlogPost` shape.
- Summary metadata is added to `src/data/blog.ts`.
- Runtime article module is added under `src/data/blog-posts/`.
- Loader is added in `src/data/blogContent.ts` only when the post should be loadable.
- `blogCuration` is updated only when ready for public visibility.
- Assistant index and sitemap are regenerated after public changes.
