# 知识积累博客草稿证据包

## Goal

为“知识积累”和“构建手记”准备可审核的博客草稿证据包，先保证事实、结构和安全边界，再决定是否使用模型润色或发布。

## Requirements

- 不自动发布到公开博客，不删除旧博客，不把 draft 注册进 runtime public selectors。
- 优先候选：
  - `rag-overview-public`
  - `chunk-strategy-public`
  - `embedding-vector-search-public`
  - `blog-content-system-build-log-draft`
- 每篇草稿先写 evidence pack：
  - 当前仓库证据。
  - 适用栏目。
  - 文章目标读者。
  - 不应重复项目详情页的内容。
  - 必须人工审核的事实或素材。
- 模型策略：
  - Codex 负责证据包、结构、审查和最终安全把关。
  - `strong` 只在明确授权的单篇草稿中串行生成长文草稿。
  - `review` 只在证据比对后用于润色。
  - 不并发打同一个中转，不显示 API key，不做无意义测活。

## Acceptance Criteria

- [x] 至少完成一篇 draft-only evidence pack。
- [x] 运行 `npm.cmd run blog:check`；如触碰 curation 或 runtime 数据，还需运行 `blog:audit`、`assistant:index` 和 `sitemap:generate`。
- [x] 人工审核 gate 清晰列出，且无草稿被自动发布。

## Notes

- 启动时必须使用 `blog-content-pipeline` skill。
- 本轮完成 `content-drafts/03-embedding-vector-search-public.md`，模式为 `Codex-only scaffold/review`，模型渠道为 `none`。
- 本轮只改草稿和任务记录，没有修改 `src/data/blog*`、`blogCuration`、assistant index 或 sitemap。
- 验证已运行：`npm.cmd run blog:check`、`git diff --check`、草稿与任务目录敏感信息扫描。敏感扫描仅命中禁写说明和非敏感 metadata 字段名。
