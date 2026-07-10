# Project Detail Case Study Content And Visual Evidence

## Goal

把 BIAU Port 项目详情页继续从“项目资料卡”推进到访客可读的技术案例页：每个项目应能通过正文中的截图、流程图、架构图、质量验证和后续路线说明，清楚展示实现、架构、技术栈、当前不足与版本迭代方向。内容必须来自当前仓库、公开页面、公开安全截图或本地可验证证据；缺少真实素材、生产凭据、APK release、云平台配置或模型真实任务时，记录为 manual gate，不阻塞其他可推进项目。

## Background

当前 `src/data/portfolio.ts` 已有统一的 `detailContent`、`ProjectVisualBlock`、`assistantContext` 和项目详情 evidence check。`npm.cmd run project-details:check` 已能检查正文视觉块、截图/结构图、必备章节、公开安全链接、图片资产质量和 assistant projection。此前用户明确希望项目页偏“访客可读的技术案例页”，不能只看 README，也要在正文穿插示例图、流程图和架构图，并把发现的不足同步进后续优化。

## Requirements

### R1. Visitor-Readable Case Study Depth

- 标准项目详情页必须继续保持 `overview`、`workflow`、`architecture`、`quality`、`limitations`、`roadmap` 六类内容。
- 每个项目的正文不是只列技术栈，而要说明真实工作流、实现结构、验证方式、边界和后续优化。
- 新增内容要用当前代码、公开站点、静态资源、测试脚本、状态页或关联项目公开安全文件作为依据。

### R2. In-Body Visual Evidence

- 项目详情页正文应穿插真实截图、流程图、架构图、数据流图或状态图。
- 优先使用已存在、真实、公开安全的截图；没有真实截图时，可以使用公开安全的结构图说明实现边界。
- 不把含账号、token、私有后台、数据库 URL、模型 endpoint、签名路径、真实生产指标的截图或文字放进公开站点。

### R3. Assistant Knowledge Sync

- 更新项目详情时，同步更新 `assistantContext` 或相关公开知识投影。
- 运行 `assistant:index` 重新生成 `server/data/public-knowledge.json` 和 `public-knowledge-v2.json`。
- 公开助手只能回答低敏事实；内部凭据、生产账号、真实模型渠道、数据库连接和未批准 APK 不进入公开知识。

### R4. Evidence And Quality Gates

- 每个实现切片都要运行最小相关检查：
  - `npm.cmd run project-details:check`
  - `npm.cmd run assistant:index`
  - `npm.cmd run assistant:kg-check`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- 若改动影响项目详情渲染、图片、链接或状态页，还要运行：
  - `npm.cmd run check:ui`
  - `npm.cmd run public-links:check`
  - `npm.cmd run status:contract`

### R5. Manual Gates

- 缺少真实运行截图、公开 demo 凭据、APK release、生产 API base URL、云平台检查或账号侧配置时，记录到 `docs/manual-gates.md` 或任务记录。
- 不为了填页面而制造截图、虚构指标、公开 debug APK、公开真实密码或包装未完成能力。

## First Implementation Slice

推荐第一轮切片：**Project Detail Evidence Refresh Audit**。

步骤：

1. 运行并阅读 `project-details:check`、`public-links:check` 和已有 `portfolio.ts` 内容，确认当前最薄弱项目。
2. 优先选择一个不需要生产凭据、能本地验证的项目详情做增强。
3. 更新 `detailContent`、`assistantContext`、必要的公开安全图片/结构图或 captions。
4. 重新生成助手知识并运行相关 checks。
5. 记录缺素材或需人工处理的事项。

## Acceptance Criteria

- [ ] 任务文档明确案例页内容、视觉证据、助手知识和 manual gate 的边界。
- [ ] 至少一个项目详情页有真实可见的内容/视觉/assistantContext 改进，且不是只改文案口号。
- [ ] 新增或更新内容通过 `project-details:check`。
- [ ] 公开助手知识已重新生成并通过 `assistant:kg-check`。
- [ ] 改动通过 `lint`、`build`，必要时通过 `check:ui`。
- [ ] 需要人工处理的素材、部署、凭据、APK 或云平台事项已记录，不阻塞本地实现。
