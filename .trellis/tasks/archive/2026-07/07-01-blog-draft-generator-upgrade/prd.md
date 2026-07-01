# Upgrade blog draft generator

## Goal

升级现有 `npm run blog:plan` / `npm run blog:draft` 草稿流程，让它从旧的“批量知识点重写 + Gemini 固定生成”变成符合当前 `BlogColumn` 与 `blog-content-pipeline` 的证据优先草稿入口。

这个任务不发布新公开文章。目标是先建立一个可审稿、可复用、可验证的草稿层：后续写项目总结、知识积累、资源分享、AI 日报或构建手记时，先生成带证据包、禁写边界、栏目模板、模型策略和审稿清单的 Markdown 草稿，再决定是否调用模型改写、是否转成正式 `BlogPost`。

## Background

- 当前博客已迁移到 `BlogColumn = knowledge | project-notes | resources | ai-daily | build-log`。
- `blog-content-pipeline` 已规定流程：先选栏目、做 evidence pack、选择模型策略、起草、审稿，再发布或暂存。
- 当前仓库已有 `scripts/generate-blog-draft.mjs`、`scripts/blog-rewrite-plan.json`、`content-drafts/README.md` 和 `blog:plan` / `blog:draft` 命令。
- 现有脚本仍偏旧流程：固定 Gemini、固定“技术科普博客”结构、依赖旧 rewrite plan，没有把新栏目模板、证据包、禁写内容、模型策略和人工审稿作为一等字段。
- 上一任务的外部研究结论：不要直接采用 bulk autoblog；应借鉴“证据包 -> 草稿 -> 人审/PR -> 验证”的流程。

## Requirements

- R1: 保留现有命令入口 `npm run blog:plan` 和 `npm run blog:draft`，避免破坏已有工作流。
- R2: `blog:plan` 应展示新栏目感知的草稿主题，至少能显示 slug、column、title、status/priority 或等价信息。
- R3: `blog:draft` 默认应生成或更新 Markdown 草稿文件，而不是直接发布到 `src/data/blog.ts`、`src/data/blog-posts/`、`blogContent.ts` 或 `blogCuration.ts`。
- R4: 草稿 frontmatter 必须包含 `slug`、`title`、`column`、`status: "draft"`、`generatedBy`、`generatedAt`、`modelStrategy` 或等价模型策略字段。
- R5: 草稿正文必须包含结构化审稿材料：
  - Evidence Pack
  - Safe Public Facts
  - Uncertain Or Stale Facts
  - Forbidden / Private Details
  - Draft Brief
  - Article Outline
  - Review Gates
  - Promotion Checklist
- R6: 草稿结构要按 `BlogColumn` 选择栏目模板。至少支持全部五个栏目：`knowledge`、`project-notes`、`resources`、`ai-daily`、`build-log`。
- R7: 对 `project-notes` 和其他项目相关草稿，必须提示“不只看 README，必须读代码、数据、部署脚本、测试、截图、Trellis 任务等证据”。
- R8: 模型策略默认是串行：Codex 取证 + 一个强内容模型生成/改写 + Codex 审稿入库。只有显式说明时才建议多模型对照。
- R9: 草稿检查器 `npm run blog:check` 应适配新草稿结构；不能强制所有草稿都使用旧的八个固定标题。
- R10: 不读取或暴露 `.env.local` 中的具体密钥值。若保留模型调用能力，也只能读取配置用于请求，不输出密钥。

## Out Of Scope

- 不生成并公开新的正式文章。
- 不接入新的 CMS 或数据库。
- 不实现完整 AI 日报采集器、RSS 管线或多模型并发系统。
- 不删除旧草稿文件，除非验证必须调整并且改动可控。
- 不修改无关脏文件：`AGENTS.md`、`.agents/skills/trellis-*`、`.codex/`、`docs/agents/codex-workflow.md`。

## Acceptance Criteria

- [ ] `npm.cmd run blog:plan` 能列出新草稿计划，并包含栏目维度。
- [ ] `npm.cmd run blog:draft -- --slug <sample> --force` 能生成一个 `content-drafts/*.md` 草稿，包含新 frontmatter 与证据包/审稿结构。
- [ ] 生成的草稿没有写入公开博客数据文件，也不会自动进入 `blogCuration`。
- [ ] `npm.cmd run blog:check` 能通过，并能检查新草稿必备结构。
- [ ] `npm.cmd run lint` 和 `npm.cmd run build` 通过。
- [ ] 若脚本改动较广，尝试 `npm.cmd run verify`。
- [ ] 任务文档记录设计取舍和验证结果。
