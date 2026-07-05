# AI 日报与内容工作台实施计划

## Phase 0. Current-State Audit

- [x] 记录当前公开博客数据生成链路：
  - `src/data/blog.ts`
  - `src/data/blogContent.ts`
  - `src/data/blogCuration.ts`
  - `src/data/blog-posts/*.ts`
- [x] 记录当前后端部署和 Prisma 迁移方式。
- [x] 检查 `/assistant/admin` 的认证方式是否可复用到 `/studio`。
- [x] 确认 `blog:check` 对导出产物的要求。

验证：

```powershell
npm.cmd run prisma:validate
npm.cmd run server:build
npm.cmd run blog:check
```

审计落档：见 `audit.md`。

## Phase 1. Studio Shell And Auth Boundary

- [x] 新增 `/studio` 路由和页面框架。
- [x] 新增 Studio 导航：草稿、AI 日报、来源池、审核、发布。
- [x] 写入受保护 API 的前端 client，不在浏览器代码中硬编码 token。
- [x] 后端新增 `/studio/api/health` 和统一 auth guard。
- [x] 明确无权限状态：只提示需要配置/登录，不泄露后台信息。

验证：

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run server:build
```

## Phase 2. Content Draft Backend

- [x] 扩展 `prisma/schema.prisma`：
  - `ContentDraft`
  - `ContentReview`
  - `PublishExport`
- [x] 新增迁移。
- [x] 新增后端 CRUD：
  - 创建草稿
  - 读取草稿列表
  - 更新草稿
  - 标记 review 状态
  - 标记 approved
- [x] 后端校验：
  - slug 格式
  - column 合法性
  - 不允许保存明显 secret 字段
  - 未 approved 不允许导出

验证：

```powershell
npm.cmd run prisma:validate
npm.cmd run server:build
```

## Phase 3. Blog Quick Submit UI

- [x] `/studio` 草稿列表。
- [x] `/studio` 快速创建。
- [x] `/studio` 编辑当前草稿。
- [x] 字段覆盖：
  - 标题
  - slug
  - 栏目
  - 标签
  - 摘要
  - 日期
  - 阅读时间
  - 知识点
  - 关联项目
  - 正文块
  - 可见性
- [x] 预览区复用公开文章样式，尽量接近 `/blog/:slug`。
- [x] 审核 checklist 明确来源、敏感信息、栏目适配和公开风险。

验证：

```powershell
npm.cmd run lint
npm.cmd run build
```

2026-07-05：已新增 Studio 草稿公开预览组件，正文 textarea 支持段落、标题、列表、图片、Mermaid 和 source-card 的轻量文本格式；`check:ui` 已覆盖 `/studio`。

2026-07-05：`/studio` 已显式展示审核队列，按待审核、可导出、已拒绝汇总内容草稿，并可从队列直接选中草稿继续编辑或发布导出。

## Phase 4. Publish Export

- [x] 实现导出器：
  - approved draft -> `src/data/blog-posts/<slug>.ts`
  - 更新 `src/data/blog.ts`
  - 更新 `src/data/blogContent.ts`
  - 更新 `src/data/blogCuration.ts`
- [x] 导出前备份/冲突检测：
  - 目标 slug 已存在时必须明确覆盖策略。
  - 不覆盖用户未提交改动。
- [x] 导出后运行检查。
- [x] 记录 `PublishExport` 基础记录，保存导出目标和待本地导出状态。
- [x] 保存真实导出文件列表和检查结果。

验证：

```powershell
npm.cmd run blog:check
npm.cmd run lint
npm.cmd run build
git diff --check
```

2026-07-05：已新增 `npm.cmd run studio:export` 本地导出器，支持从 Studio API 或本地 JSON 读取 approved draft，默认拒绝覆盖已有 slug；`--run-checks` 可在写文件后执行 `blog:audit`、`blog:check`、`lint`、`build`，并通过 `--publish-export-id` 回写导出文件列表和检查状态。

2026-07-05：Studio 发布边界卡片已读取最近 PublishExport 记录，展示导出状态、关联草稿、安全文件列表和回写检查结果，方便确认本地/CI 导出是否真正完成。

## Phase 5. AI Daily Source Pool And Issue Workflow

- [x] 扩展 Prisma：
  - `SourceItem`
  - `AiDailyIssue`
- [x] `/studio` 来源池：
  - URL
  - 来源名
  - source tier
  - 语言
  - 发布时间
  - 摘要
  - 标签
- [x] `/studio` 单期列表。
- [x] `/studio/ai-daily/:issueId`：
  - 选择来源
  - 生成 issue brief 草稿
  - 进入审核
  - 转为博客草稿
- [x] 保持 `npm.cmd run ai-daily:draft` 可用，作为文件导入/兼容工具。

2026-07-05：已新增 AI Daily issue 详情页和后端详情/更新/转草稿接口。详情页支持从来源池添加/移除来源、编辑 issue brief JSON、进入 review-needed，并把一期 issue 转成 hidden + review-needed 的 `ai-daily` 内容草稿；转换不调用模型、不发布公开内容、不写 Git-tracked public data。离线 `ai-daily:draft` 样例命令已验证可用。

验证：

```powershell
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --force
npm.cmd run blog:check
npm.cmd run lint
npm.cmd run build
```

## Phase 6. Model-Assisted Steps

仅在用户批准具体内容任务时开启。

- [ ] strong profile：单条来源摘要或 issue 初稿。
- [ ] review profile：事实、结构和表达审查。
- [ ] Codex：最终事实、安全、站点集成检查。
- [ ] 记录 `aiAssistance`：
  - none
  - summary-assisted
  - draft-assisted
  - polish-assisted
- [ ] 不做 provider ping、doctor live 或单纯测活。

## Phase 7. Page Editing Extension

在博客/AI 日报跑通后再扩展。

- [x] 项目详情页编辑。
- [x] 项目配图、流程图、架构图块。
- [x] 资源分享页编辑。
- [x] 状态页说明编辑。
- [x] 页面级发布审核。

2026-07-05：Studio 编辑器已新增“项目详情模板”，可以从现有 `projects` 中选择目标项目，一键生成覆盖案例概览、工作台能力、实现与架构、质量与验证、当前边界和后续优化的 hidden 草稿；模板正文支持图片和 Mermaid 流程图草稿。新增 `npm.cmd run studio:project-detail-plan -- --sample <projectId>`，可把这类 Studio 草稿 dry-run 映射为 `Project.detailContent` 和 `assistantContext` 导出计划，但不会直接写入 `src/data/portfolio.ts`。

2026-07-05：Studio 编辑器已新增“资源分享模板”，支持填写资源名称、公开 URL 和资源类型，一键生成 `resources` 栏目的 hidden 草稿；模板覆盖资源定位、应用场景、使用方式、判断依据、注意事项、后续维护和关键收获，并默认 `aiAssistance: none`。模板会移除 URL 查询参数/锚点再写入正文，发布仍必须经过审核与 `studio:export` 导出 gate。

2026-07-05：Studio 编辑器已新增“状态说明模板”，可以从 `reliabilityProjects` 选择状态项目，一键生成 `build-log` 栏目的 hidden 草稿，覆盖当前状态说明、分层检查项、人工 gate、后续接入和更新计划。新增 `npm.cmd run studio:status-plan -- --sample <status-project-id>`，可把状态说明草稿 dry-run 映射为 `ReliabilityProject` 更新候选；命令只输出 JSON，不写 `src/data/statusTargets.ts` 或公开状态 JSON。

2026-07-05：Studio 发布边界卡片已新增“页面级发布审核”，会根据当前草稿识别普通博客、AI 日报、资源分享、项目详情计划和状态页说明计划，并展示对应的导出目标与人工审核清单。`POST /studio/api/content-drafts/:id/reviews` 的 `checklistJson` 现在保留 `pageKind`、`pageExportTarget` 和 `pageChecks`，但仍以 `sourceChecked`、`safetyChecked`、`publicReady` 三个基础布尔值作为兼容核心。

## Risk And Rollback

- Prisma migration 是主要风险点：先本地验证，再部署。
- 导出器是主要内容风险点：必须检查不覆盖用户未提交文件。
- `/studio` 权限是主要安全风险点：默认无 token 不开放写操作。
- 模型生成是主要内容质量风险点：默认关闭，只允许具体任务调用。

回滚方式：

- 数据库模型改动通过 Prisma migration 管理。
- 公开内容仍由 Git 管理，导出文件可通过常规 diff 审查。
- 如果 Studio 不稳定，公开站仍可继续读取现有静态内容。

## Human Gates

- 生产数据库连接：用户需要在 Render/部署平台填写真实 `DATABASE_URL`，代码里只保留环境变量读取。
- Content Studio 独立数据库：用户决定内部助手库与内容工作台库分开维护；Studio 服务应设置 `STUDIO_DATABASE_URL`，迁移用 `npm run prisma:migrate:studio`。
- Studio 管理密钥：用户需要设置 `ADMIN_TOKEN` 或后续专用 `STUDIO_ADMIN_TOKEN`；仓库不能保存真实 token。
- CORS 域名：用户需要确认公开站域名和后端 API 域名，并在部署平台设置 `CORS_ORIGIN`。
- 2026-07-05：用户已在生产配置中去除 `CORS_ORIGIN` 尾斜杠并确认 `/studio` 可以连接 Studio API；代码侧已增加尾斜杠规范化作为防呆。
- 生产迁移：第一次上线新增 Prisma 模型时，需要确认部署流程会执行 migration，或由用户手动在平台 shell 中执行。
- Studio 用户范围：第一版推荐仅站长管理员使用；如果要给小伙伴开放编辑，需要追加成员角色与权限 UI。
- 导出执行位置：第一版推荐本地/CI 导出公开内容文件；暂不让生产服务器直接写 Git 仓库。
- 第一次真实模型辅助 AI 日报任务：用户需要确认具体来源、模型渠道和是否允许本次调用；不做模型测活。
