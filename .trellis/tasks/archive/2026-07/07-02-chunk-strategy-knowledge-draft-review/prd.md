# Chunk strategy knowledge draft review

## Goal

以 `Codex-only scaffold/review` 模式刷新 `content-drafts/02-chunk-strategy-public.md`，让 RAG chunk 策略草稿更准确体现 Legal RAG 当前 section-aware splitter、metadata、citation quote 和前端溯源闭环，但不进入公开博客发布。

## Requirements

- 写作模式：Codex-only scaffold/review。
- Model channel: none，不调用 live model、不运行 `blog:draft -- --generate`。
- 基于 Legal RAG 当前 splitter、text helpers、citation、RAG service、QaView 和 validate 证据刷新草稿。
- 草稿保持 `status: draft`，不修改 runtime blog、blog curation、assistant index 或 sitemap。
- 强化实用检查清单，尤其是 page 估算、section/citation、diagnostics、引用点击定位。
- 不写入真实模型中转站、数据库连接、演示账号、客户合同或线上健康结论。

## Acceptance Criteria

- [ ] Evidence Pack 记录 writing mode、model channel、最新源码证据。
- [ ] Safe/uncertain facts 明确 `page` 是估算，不包装成真实 PDF 页码能力。
- [ ] Draft Body 补充 citation quote、diagnostics、前端定位的实用检查。
- [ ] Review Gates 明确仍需 human review 才能发布。
- [ ] `npm.cmd run blog:check` 通过。
- [ ] `git diff --check` 和 changed-file sensitive scan 通过。

## Notes

- 本任务不发布博客，只提升草稿质量。
