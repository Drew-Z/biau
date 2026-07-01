# Create project notes draft evidence packs

## Goal

为下一阶段“访客可读的技术案例页 / 项目总结博客”准备第一批 `项目总结 / Project Notes` 草稿证据包。

这一步不公开新文章，也不直接改项目详情页；它的价值是先把每个项目可公开表达的事实、待核验点、禁写内容、文章角度和后续优化方向沉淀到 `content-drafts/`。后续再基于这些草稿逐篇审稿、补证据、决定进入项目详情页还是博客。

## Background

- 用户已指定项目来源目录：
  - `D:\workspace4Codex\xunqiu`
  - `D:\workspace4Codex\xunqiu-backend-modern`
  - `D:\workspace4Cursor\erp`
  - `D:\workspace4Cursor\game`
  - `D:\workspace4Cursor\legal-rag`
  - `D:\workspace4Cursor\pet`
- 用户要求项目内容不能只看 README，因为 README 可能过时。
- 当前主站 `src/data/portfolio.ts` 已有访客可读项目详情与 assistantContext，可作为公开表达参考，但不能替代项目源码证据。
- 上一任务已升级 `blog:draft`，支持 `project-notes` 栏目、evidence pack、禁写边界、模型策略和审稿门禁。

## Requirements

- R1: 生成第一批项目总结草稿，不发布公开文章。
- R2: 每个草稿必须使用 `column: "project-notes"`。
- R3: 第一批至少覆盖这些代表项目：
  - Legal RAG
  - Ozon ERP
  - 寻球移动端 / 现代后端
  - Playlab 游戏集合
  - Pet Workspace
  - blog-semi 主站内容系统
- R4: 每个草稿必须记录证据来源，来源应优先来自项目源码、配置、测试、脚本、数据和当前主站项目详情；不能只依赖 README。
- R5: 每个草稿必须列出：
  - Safe Public Facts
  - Uncertain Or Stale Facts
  - Forbidden / Private Details
  - Draft Brief
  - Article Outline
  - Review Gates
  - Promotion Checklist
- R6: 对已部署项目，可以写“已部署/已有线上入口”这类公开事实，但不能写真实密钥、账号、后台、私有域名、IP、连接串、敏感指标或客户信息。
- R7: Pet 项目必须明确是 WIP / 当前工作状态展示，不包装成完全体。
- R8: 只修改草稿计划、草稿文件和任务文档；不修改 `src/data/blog.ts`、`src/data/blogContent.ts`、`src/data/blogCuration.ts`、`server/data/public-knowledge.json` 或 `public/sitemap.xml`。

## Out Of Scope

- 不把草稿转为正式 `BlogPost`。
- 不新增公开 blog curation。
- 不重写项目详情页。
- 不运行外部模型生成长文。
- 不改动无关脏文件：`AGENTS.md`、`.agents/skills/trellis-*`、`.codex/`、`docs/agents/codex-workflow.md`。

## Acceptance Criteria

- [ ] `scripts/blog-rewrite-plan.json` 新增或更新第一批 `project-notes` 计划条目。
- [ ] `npm.cmd run blog:plan` 能显示新增 project-notes 条目和栏目。
- [ ] `npm.cmd run blog:draft -- --slug <project-note-slug> --force` 能为每个代表项目生成草稿。
- [ ] 生成的 `content-drafts/*.md` 均包含 `column: "project-notes"`、证据包、禁写边界、待核验事实和后续优化方向。
- [ ] `npm.cmd run blog:check` 通过。
- [ ] `npm.cmd run lint` 和 `npm.cmd run build` 通过。
- [ ] 确认没有改动公开博客数据、助手索引或 sitemap。
