# Improve blog content generation skill

## Goal

强化现有 `.agents/skills/blog-content-pipeline`，让它从“原则性流程说明”升级成可复用的博客内容生成/重写 SOP：能指导 Codex 从选题、证据包、模型协作、草稿、审稿、legacy 重写到发布验证，全程保持 evidence-first 和公开安全边界。

本任务不批量生成新博客，也不发布新文章；只改 skill 与必要的参考模板/元数据，让后续单篇博客任务能稳定复用。

## Background

- 现有 skill 位于 `.agents/skills/blog-content-pipeline/`，包含 `SKILL.md`、`references/templates.md`、`agents/openai.yaml`。
- 现有 `SKILL.md` 已包含核心流程：选栏目、建证据包、选择模型策略、起草、审稿、发布或暂存。
- 现有 `references/templates.md` 已覆盖五个栏目：`knowledge`、`project-notes`、`resources`、`ai-daily`、`build-log`。
- `scripts/generate-blog-draft.mjs` 已提供 evidence-first scaffold 和显式 `--generate` 模型辅助入口；默认不会发布公开文章。
- `content-archive/legacy-blog/rewrite-queue.json` 已保存 87 篇 legacy 旧文的重写队列。
- `content-drafts/README.md` 和 `content-drafts/blog-rewrite-workflow.md` 已记录草稿层规则，但 skill 本身还没有把这些入口串成清晰执行路径。

## Requirements

- R1: 保留现有 skill 名称 `blog-content-pipeline`，不新建平行 skill。
- R2: 更新 `SKILL.md`，明确四类入口：
  - 新文章规划/草稿
  - legacy 旧文重写
  - 已有草稿审稿
  - 公开发布/入库
- R3: 将“内容生成输入协议”写清楚：栏目、目标读者、证据来源、安全事实、待核验事实、禁写内容、模型策略、发布意图。
- R4: 将模型协作策略写成可执行规则：默认串行、Codex 取证、一个强内容模型起草/改写、Codex 审稿；多模型只用于重要或风格不确定内容。
- R5: 将 legacy 重写流程串到 `content-archive/legacy-blog/rewrite-queue.json`，强调旧文只能作为素材，不能直接发布。
- R6: 将草稿生成脚本和验证脚本写进 skill：`blog:plan`、`blog:draft`、`blog:check`、`blog:audit`、`assistant:index`、`sitemap:generate`、`lint`、`build`。
- R7: 更新模板参考文件，让五个栏目都包含写作目标、适合题材、必备证据、推荐结构、常见失败和发布门禁。
- R8: 如需要，新增一个小型 reference 文件承载模型提示词/审稿清单，保持 `SKILL.md` 简洁。
- R9: 更新 `agents/openai.yaml`，让 UI 文案与增强后的 skill 能力一致。
- R10: 不写死任何真实模型中转地址、API key、私有 URL 或本地秘密路径。
- R11: 设计并落地公开安全的模型渠道配置协议：仓库只提交环境变量占位、模型角色建议和串行/并发规则；真实中转站地址、API key 和账号只放本地 `.env.local` 或外部配置。
- R12: 现有 `scripts/generate-blog-draft.mjs` 只支持 `GEMINI_*`。实现阶段应优先补一个向后兼容的通用草稿模型配置层，例如 `BLOG_DRAFT_BASE_URL`、`BLOG_DRAFT_API_KEY`、`BLOG_DRAFT_MODEL`、`BLOG_DRAFT_TEMPERATURE`，并继续 fallback 到 `GEMINI_*`，避免破坏现有命令。
- R13: skill 需要明确推荐渠道分工：强内容模型用于长文起草/重写，快模型用于大纲/批量检查，Codex 负责取证、审稿、脱敏和入库；多模型并发只在不同中转站/不同 relay profile 下显式启用。

## Acceptance Criteria

- [ ] `SKILL.md` 能独立指导一次博客内容任务，覆盖选题、取证、草稿、模型、审稿、发布或暂存。
- [ ] `references/templates.md` 或新增 reference 明确五个栏目模板与 review gates。
- [ ] skill 文档明确 legacy 旧文重写入口和禁止直接发布旧文。
- [ ] skill 文档明确模型默认串行和多模型使用条件。
- [ ] skill 文档和 `.env.example` 给出公开安全的模型渠道占位配置，不包含真实地址或密钥。
- [ ] `blog:draft -- --generate` 支持通用 `BLOG_DRAFT_*` 环境变量，并兼容现有 `GEMINI_*`。
- [ ] `agents/openai.yaml` 与 skill 新定位一致。
- [ ] 运行基础验证：skill frontmatter/文件结构检查、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`。

## Out Of Scope

- 不生成或发布正式博客文章。
- 不接入新的模型 API、图片生成 API、CMS 或数据库。
- 不配置真实模型账号、真实中转地址或真实 API key。
- 不重写 `scripts/generate-blog-draft.mjs` 的核心行为，除非是为了增加公开安全的通用模型渠道环境变量并保持旧 `GEMINI_*` 兼容。
- 不修改 legacy 旧文内容本身。
