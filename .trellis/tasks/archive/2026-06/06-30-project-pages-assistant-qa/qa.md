# Project Pages Assistant QA Notes

## Coverage Matrix

- Major case-study pages with `detailContent` and `assistantContext`: `legal-rag`, `pet-workspace`, `ozon-erp`, `biau-playlab`, `xunqiu`.
- Individual game entries with concise `assistantContext` plus external detail/play links: `game-first-tetris`, `game-next-spacewar`, `intespace`, `raiden-prototype`, `space-war`, `spacewar-ii`.
- Generated knowledge parity after `npm.cmd run assistant:index`: all focused project entries exist in `server/data/public-knowledge.json`, and their summaries/tags match `src/data/portfolio.ts`.

## Issues Found And Fixed

- `server/src/knowledge.ts` loaded `../../data/public-knowledge.json`, which points to repository-root `data/` from both `server/src` and `server/dist`; the generated file lives under `server/data/`. Fixed to `../data/public-knowledge.json`.
- Natural Chinese project questions did not reliably match because search split only on whitespace. Added explicit public-site keywords, common project aliases, id/title/tag/summary scoring, project/article intent weighting, and site-overview weighting to both frontend local fallback and backend search.
- `server/scripts/smoke.ts` only required `citations` to be an array, so an empty/fallback knowledge result passed. Added a Legal RAG citation assertion for the `RAG 项目` smoke query.
- Project generated tags only exposed category/status codes such as `ai` and `main`. Added Chinese category/status labels such as `AI 应用` and `重点展示` through `getProjectAssistantTags`.

## Representative Queries

- `请介绍一下这个站点里主要展示了哪些能力和项目方向。` -> `site:intro`, project entries.
- `这个站里有哪些和 RAG、知识库或者合同审查相关的项目或文章？` -> `project:legal-rag`, Legal RAG articles.
- `帮我快速看看这个站点里的互动体验和游戏项目有什么特色。` -> `project:biau-playlab`, game entries.
- `Legal RAG 怎么实现的？` -> `project:legal-rag`, implementation articles.
- `pet 项目现在完成到什么程度？` -> `project:pet-workspace`, WIP-related article context.
- `Ozon ERP 的架构是什么？` -> `project:ozon-erp`, architecture article.
- `寻球后续优化方向是什么？` -> `project:xunqiu`, Xunqiu article context.
- `游戏项目是否已经部署？` -> `project:biau-playlab`, game entries.
- `Biau Playlab 有哪些游戏？` -> `project:biau-playlab`, game content.
- `你们做过哪些 AI 项目？` -> `project:pet-workspace`, `project:legal-rag`, related AI articles.
