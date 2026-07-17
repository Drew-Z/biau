# Fresh open-source AI Daily review

Research date: 2026-07-17.

The review did not assume `learn`, Zhipu, Exa, or any other provider was configured. Broad model search returned an empty result, so the comparison used fetched GitHub repository metadata, README files, source trees, project APIs, and the HotDaily discussion page.

## HotDaily / Done-0 hotdaily-skill

Sources:

- https://linux.do/t/topic/2474361
- https://github.com/Done-0/hotdaily-skill
- https://api.hotdaily.top/v1/digests/today
- https://api.hotdaily.top/v1/trends/today

Verified:

- The Skill repository is a thin read-only API consumer with examples.
- It does not contain collectors, schedulers, prompts, ranking, clustering, database schema, tests, or deployment code.
- The public product exposes useful reader-facing fields: read/qualified/selected counts, source links, summaries, editorial reasons, value verdicts, confidence, reading time, and evidence-bound trend items.
- The live API also shows why BIAU needs stricter validation: some editorial reasons are mechanically mapped to AI engineering relevance, trend evidence can contain only one item, and numeric confidence/score definitions are not public.

Borrow:

- selection funnel
- fact summary versus editorial value judgment
- trend-to-evidence binding
- daily/history/trend/item-detail separation

Do not borrow:

- treating a thin Skill as the production architecture
- uncalibrated numeric confidence
- single-source items presented as trends
- AI value judgments without original-page and relevance validation

## NewsPrism

Source: https://github.com/moguiyu/NewsPrism

Useful evidence:

- explicit `collect -> tag/dedup -> cluster -> assess -> summarize -> render/publish` stages
- event-level grouping across sources
- source tiers and framing analysis
- LLM clustering with embedding fallback
- configurable schedules, thresholds, editorial weights, replay, and editor feedback
- single-host Docker/SQLite deployment

Borrow event identity, source tiers, replay, and editorial feedback. Avoid importing its entire multilingual/LLM/embedding/search stack into BIAU.

## CondenseIt

Source: https://github.com/wildlifechorus/condenseit

Useful evidence:

- broad but modular source registry
- admin scheduling and budget controls
- transparent named ranking signals and "Why ranked here?"
- provider-neutral Ollama/OpenRouter/OpenAI-compatible composition
- optional embeddings and rerank rather than mandatory AI ranking

Borrow source management, score transparency, scheduling, and budgets. Personalized reader learning is not the primary BIAU editorial goal.

## ReadEverything

Source: https://github.com/berleary/read-everything

Useful evidence:

- small per-source fetcher contract
- thin RSS entries follow original links for full text
- trafilatura extraction with optional Playwright path
- hourly fetch and separate indexing cadence
- explicit warning that unsanitized source HTML is unsafe for public exposure

Borrow adapter boundaries and extraction fallback design. Do not require Gmail, Qdrant, or universal browser rendering.

## Other useful projects

- Horizon: https://github.com/Thysrael/Horizon
  - clear fetch/dedup/score/enrich/summarize/output stages and static publishing.
- AI Dispatch: https://github.com/Yifannnnnnnnw/ai-dispatch
  - lightweight RSS, model analysis, GitHub Actions scheduling; useful simplicity reference but limited original-page evidence.
- RSSDigest: https://github.com/banana2556/rssdigest
  - minimal reliable RSS/Atom fallback with optional theme overview; weak dedupe/ranking.
- TrendRadar: https://github.com/sansan0/TrendRadar
  - configuration and deployment breadth; more of a trend radar than an editorial evidence workflow.

## Conclusion

The best BIAU design is a composition of patterns:

- ReadEverything-style source adapters
- NewsPrism-style event dedupe/grouping and replay
- CondenseIt-style transparent ranking and source management
- HotDaily-style reader-facing selection funnel and evidence-bound trend presentation
- BIAU's existing Studio review and static Publish Export as the approval boundary

The critical quality boundary is not the number of models or feeds. It is whether selected claims have original evidence, whether repeated coverage is grouped as one event, and whether a human can inspect and correct every editorial decision before publication.
