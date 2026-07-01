# RAG overview draft evidence review

## Goal

把 `content-drafts/01-rag-overview-public.md` 从旧式草稿整理成 evidence-first draft，让它具备证据包、禁写边界、模型策略、审稿门禁和发布清单，同时保留已有的通俗 RAG 入门正文。

## Requirements

- 必须使用 `blog-content-pipeline` skill。
- 写作模式为 `Codex-only scaffold/review`，模型渠道 `none`。
- 不调用 live model，不运行 `--generate` 或 `--polish-from`。
- 不发布到 runtime blog，不修改 `src/data/blog*`、`blogCuration`、assistant index 或 sitemap。
- 不删除旧博客。
- 证据来源至少覆盖：
  - `scripts/blog-rewrite-plan.json`
  - `src/data/blogShared.ts`
  - `content-drafts/02-chunk-strategy-public.md`
  - `content-drafts/03-embedding-vector-search-public.md`
  - `legal-rag/docs/architecture.md`
  - `legal-rag/apps/api/src/documents/ingestion-service.ts`
  - `legal-rag/apps/api/src/rag/rag-service.ts`
  - `legal-rag/apps/api/src/citations/citations.ts`
  - `legal-rag/apps/api/src/validate.ts`
- 保留或补充现有 RAG pipeline 图，不使用伪造产品截图或假数据图。

## Acceptance Criteria

- [x] 草稿包含 `Evidence Pack`、`Safe Public Facts`、`Uncertain Or Stale Facts`、`Forbidden / Private Details`、`Draft Brief`、`Article Outline`、`Model Strategy`、`Review Gates`、`Promotion Checklist`。
- [x] 已有正文进入 `Draft Body`，并移除未证实的项目成熟度/生产指标暗示。
- [x] 运行 `npm.cmd run blog:check`、`git diff --check` 和敏感信息扫描。
- [x] 人工审核 gate 清楚标明：是否发布、是否继续模型润色、是否替换/补充配图仍需单独决定。

## Notes

- 这是父任务的内容治理小步，不进入公开发布流程。
- Writing mode: `Codex-only scaffold/review`; model channel: `none`.
- 本轮没有调用 live model、`--generate`、`--polish-from` 或 `doctor --live`。
- 验证记录：
  - `rg -n "TODO|待作者|请在此处|model-generated placeholders|待核验" content-drafts\01-rag-overview-public.md .trellis\tasks\07-02-rag-overview-draft-evidence-review`：无命中。
  - `rg -n "(?i)(api[_-]?key|secret|token|password|passwd|sk-[A-Za-z0-9]|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|PRIVATE) KEY|postgres(ql)?://|mysql://|mongodb(\+srv)?://|redis://|jdbc:|Bearer\s+[A-Za-z0-9._-]+|[0-9]{1,3}(\.[0-9]{1,3}){3})" content-drafts\01-rag-overview-public.md .trellis\tasks\07-02-rag-overview-draft-evidence-review`：仅命中“禁止写入密钥/IP”等安全边界说明，无真实敏感值。
  - `git diff --check`：通过；仅提示 `content-drafts/01-rag-overview-public.md` 工作区 LF/CRLF 转换。
  - `npm.cmd run blog:check`：通过。
  - `npm.cmd run lint`：通过。
  - `npm.cmd run build`：通过；仅有现有 dynamic import chunk 提示。
- 人工 gate：公开发布、模型润色、配图替换/补充、runtime blog/assistant/sitemap 同步均未执行，需单独确认。
