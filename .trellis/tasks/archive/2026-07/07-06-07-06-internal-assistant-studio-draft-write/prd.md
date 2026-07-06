# Internal Assistant Controlled Studio Draft Write

## Goal

把内部助手 Agentic Workspace 的 `studio.draft` 工具，从“只返回草稿计划文本”升级为 **受控创建 Studio 草稿**：当内部成员明确要求生成文章、项目总结、状态说明、资源分享或 AI 日报草稿时，Agent 可以在 `draft-write` 权限边界内创建 `hidden + review-needed` 的 `ContentDraft`，并在回答和工具轨迹中显示“已创建草稿 / 待审核”状态。

这不是发布能力。它只是把内部助手从“会建议你去 Studio 写草稿”推进到“能替你把待审核草稿放进 Studio 草稿箱”。

## User Value

- 内部成员可以在同一个助手会话里完成“提需求 → 生成草稿 → 去 Studio 审核”的闭环。
- 草稿进入 Studio 后仍走现有 review/export gate，不会绕过博客 curation、项目详情页、状态页或静态导出审查。
- Agent 工具轨迹能清楚显示 draft-write 的结果，用户不需要猜测“刚才到底有没有真的创建东西”。

## Confirmed Facts

- 当前任务基于上一轮已落地的 Agentic Workflow Runtime：
  - `server/src/agentTools.ts` 里已有 `studio.draft` 工具，但当前实现只返回计划文本。
  - `server/src/agentOrchestrator.ts` 会在写作/项目/状态/知识类请求中选择 `studio.draft`。
  - `ChatResponse.meta.tools` 已能返回安全工具轨迹。
  - `/assistant` 已展示 Agent 状态、工具轨迹和 guardrail。
- Studio 后端已有 `POST /studio/api/content-drafts`，其字段合同来自 `server/src/studioRoutes.ts`：
  - `slug`, `title`, `column`, `tag`, `detail`, `readTime`, `bodyJson`, `knowledgePoints`, `projectIds`, `visibility`, `aiAssistance`, `createdBy`, `updatedBy`。
  - 新草稿默认可设置为 `status: REVIEW_NEEDED`，`visibility: HIDDEN`。
  - `readDraftInput()` 已有敏感内容扫描、slug 校验、column 校验、duplicate slug 处理。
- Studio 数据库边界在 `server/src/db.ts`：
  - `getStudioPrisma()` / `requireStudioDatabase()` 使用 `STUDIO_DATABASE_URL`，缺省时可回落到 `DATABASE_URL` 的项目约定已写入 backend spec。
- 前端草稿正文 parser 在 `src/utils/studioDraftBody.ts`：
  - `bodyJsonFromText()` 可把 markdown-ish 文本转换成 Studio `bodyJson`。
- 已有 Studio 模板工具：
  - `createProjectDetailDraftTemplate(project)`。
  - `createResourceDraftTemplate(input)`。
  - `createStatusDraftTemplate(project)`。
- 确认产品边界：
  - normal chat 只允许 `read` 和 `draft-write`。
  - 不允许 publish、deploy、admin/member/channel/invite mutation、external-live diagnostics。
  - 不做模型测活；测试使用 mock/no-live。

## Requirements

- R1. `studio.draft` must create a Studio `ContentDraft` when all of these are true:
  - the Agent selected `studio.draft`;
  - the request is explicitly draft-like, such as “生成草稿 / 写文章 / 项目总结 / 状态说明 / 资源分享 / AI 日报”;
  - Studio database is configured through `getStudioPrisma()`;
  - generated draft payload passes the same safety rules as Studio API drafts.
- R2. Created drafts must be safe-by-default:
  - `status = REVIEW_NEEDED`;
  - `visibility = HIDDEN`;
  - `aiAssistance = "agentic-workspace"`;
  - `createdBy` / `updatedBy` identify the internal member in low-sensitive form.
- R3. The tool must never publish, create `PublishExport`, approve reviews, mutate public `src/data/*`, or call external providers.
- R4. If Studio DB is missing or draft creation fails safely, `studio.draft` must degrade to the current plan-only behavior with a clear safe summary and trace status.
- R5. Tool trace/meta must include a safe draft artifact summary when creation succeeds:
  - draft id;
  - slug;
  - title;
  - column;
  - status;
  - visibility;
  - reviewRequired;
  - safe Studio href.
- R6. `/assistant` must render the created draft status in the tool trace area without raw JSON dumps.
- R7. Draft generation should reuse existing templates and shared body parsing where possible:
  - project-related request → `project-notes` draft, related project id if inferable.
  - status/reliability request → `build-log` draft.
  - resource request → `resources` draft.
  - AI Daily request → `ai-daily` draft scaffold.
  - general knowledge article → `knowledge` draft scaffold.
- R8. Slug generation must be deterministic enough to read, but collision-safe. Duplicate slugs must not crash normal chat; use a bounded suffix when needed.
- R9. Sensitive scan must prevent draft body/detail from storing keys, tokens, DB URLs, private provider URLs, invite codes, raw prompts, or hidden deployment details.

## Acceptance Criteria

- [ ] `studio.draft` creates a `ContentDraft` in Studio DB for explicit draft requests and returns a safe artifact summary in `ChatResponse.meta.tools`.
- [ ] Created drafts are `review-needed`, `hidden`, and `aiAssistance: "agentic-workspace"`.
- [ ] Missing Studio DB or duplicate slug causes a safe degraded plan/fallback, not a 500 from `/chat/internal`.
- [ ] `/assistant` shows a created draft item such as “草稿已创建：<title> · review-needed · hidden”.
- [ ] No publish/export/review/admin/member/model-channel mutation is reachable from normal chat.
- [ ] Existing service-mode isolation remains intact.
- [ ] No live model/provider checks are introduced.
- [ ] Validation passes for the relevant set: `prisma:validate`, `server:build`, `server:smoke`, `assistant:service-modes-smoke`, `studio:smoke`, `lint`, `build`, `check:ui`, `git diff --check`.
- [ ] Sensitive scan finds no real secrets, endpoints, database URLs, tokens, raw prompts, or private document bodies in changed files.

## Out Of Scope

- Publishing or exporting public blog/project/status content from chat.
- Creating Studio review approvals or `PublishExport` records.
- Editing `src/data/blog.ts`, `src/data/portfolio.ts`, `src/data/statusTargets.ts`, sitemap, or public content files.
- Connecting browser `/assistant` directly to Studio API with `STUDIO_ADMIN_TOKEN`.
- Running live model calls, production synthetic checks, or external provider diagnostics.
- Long-term memory writes beyond the existing draft-write boundary.

## Open Questions

None blocking. Default decision: allow automatic Studio draft creation only for explicit draft-like user requests selected by `studio.draft`; all outputs remain hidden and review-needed.
