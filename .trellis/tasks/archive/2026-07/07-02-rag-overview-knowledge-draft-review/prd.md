# RAG overview knowledge draft review

## Goal

以 `Codex-only scaffold/review` 模式刷新 `content-drafts/01-rag-overview-public.md`，让 RAG 入门知识积累草稿更贴近 Legal RAG 当前实现、公开安全边界和后续发布门槛，但不进入公开博客发布。

## Requirements

- 写作模式：Codex-only scaffold/review。
- Model channel: none，不调用 live model、不运行 `blog:draft -- --generate`。
- 基于 Legal RAG 当前代码、架构文档和 smoke 脚本刷新 evidence pack。
- 草稿保持 `status: draft`，不修改 runtime blog、blog curation、assistant index 或 sitemap。
- 补充实用检查清单，减少泛泛科普感。
- 不写入真实模型中转站、数据库连接、登录凭据、私有语料、客户合同或线上健康结论。

## Acceptance Criteria

- [ ] Evidence Pack 记录 writing mode、model channel、最新源码/脚本证据。
- [ ] Draft Body 补充可复用 RAG 工程检查清单。
- [ ] Review Gates 明确仍需 human review 才能发布。
- [ ] `npm.cmd run blog:check` 通过。
- [ ] `git diff --check` 和 changed-file sensitive scan 通过。

## Notes

- 本任务不发布博客，只提升草稿质量。
