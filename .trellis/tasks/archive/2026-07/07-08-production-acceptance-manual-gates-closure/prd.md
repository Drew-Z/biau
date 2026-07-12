# Production acceptance and manual gates closure

## Goal

把此前整理的“仍需人工处理”和“还值得继续处理”的事项收口成一条可执行的生产验收路线：先复核已完成事实，再引导用户完成 Studio / AI Daily / Legal RAG / ERP / Xunqiu / Pet / 可观测性等需要人工权限或生产凭据的步骤，同时让 Codex 继续承担本地可验证的文档、状态页、脚本和 UI 改进。

本任务的用户价值是减少上下文漂移：用户可以按一个清晰队列逐项完成平台配置、生产验收和发布 gate；Codex 只记录低敏证据，不泄露密钥、不误把未验收能力标为已上线。

## Background And Confirmed Facts

- 当前 Trellis 没有 active task，本任务是新的父级收口任务。
- 仓库当前 `main` 干净，最近提交 `8988962 chore: record rag orchestrator readiness` 已推送。
- 截图中的“内部知识 RAG internal collection 还是 0”是旧状态：生产 RAG Orchestrator 已低敏验收为 `store=qdrant`，public collection ready `50 points`，internal collection ready `5 points`；一次内部知识同步已 `COMPLETED`，1 个 reviewed 文档写入 5 个 chunks。
- `docs/manual-gates.md` 已定义人工门禁总账：平台变量、真实凭据、模型真实调用、APK 公开批准、访问分析和观测平台都需要人工确认。
- `docs/studio-ai-daily-production-readiness.md` 已定义 Studio-first 的 AI Daily 生产路径：来源池 -> AI Daily issue -> hidden/review-needed 内容草稿 -> 人工审核 -> Publish Export -> 静态博客数据。
- `docs/internal-rag-studio-ai-daily-runbook.md` 已有浏览器验收手册，涵盖内部知识库同步、Studio 生产验收、首次 AI Daily issue 到草稿和公开导出边界。
- 当前项目规则要求：不保存真实 token、数据库 URL、模型中转站地址、后台密码、签名材料或生产敏感指标；真实模型调用只能服务于用户批准的具体任务，不能做无意义测活。

## Requirements

### R1. 任务队列与事实修正

- 把用户截图中的事项分为：已完成需复核、需要用户手动、Codex 可继续推进、暂不做。
- 不再把已完成的内部 RAG 同步当作阻塞项；只保留后续“自动化状态采集”的改进任务。
- 每次用户完成一个平台步骤后，Codex 要能根据低敏结果更新任务记录、状态页或文档。

### R2. Studio 生产验收优先

- 引导用户在浏览器完成 `/studio` token 登录、health、草稿列表、来源池、AI Daily issue 详情和转草稿流程验收。
- 如果发现线上前端没有使用独立 `VITE_STUDIO_API_BASE_URL`，或 Studio API 回退到 internal API，要记录具体平台变量和 redeploy 步骤。
- 不要求用户把 token、数据库 URL 或 provider 配置发到聊天里。

### R3. AI Daily 首次正式链路

- 在 Studio 可用后，完成一次正式但仍受控的 AI Daily issue -> 草稿 -> 审核 -> export -> 发布候选流程。
- 首次流程默认不自动抓取、不自动发布、不调用模型生成；模型辅助和每日定时属于后续明确批准的子任务。
- 公开发布前必须有人工审核和 Git diff 审查。

### R4. Credentialed demo checks

- Legal RAG：需要低权限、可回收 demo 凭据后，才能验证法律问答、合同审查和质量面板；不能把后台真密码写进文章、项目页、状态页或聊天。
- ERP：生产注册已确认开放时，继续验证登录/注册策略和低权限演示账号；插件与商品同步需要脱敏 fixture 或演示店铺。
- Xunqiu：后端 synthetic 需要 `XUNQIU_SYNTHETIC_API_BASE_URL`，正式 APK 公开仍需批准。
- Pet：当前 APK gate 为 debug-only；正式公开下载必须等 release 签名包、SHA-256、扫描/回归证据、版本说明、回滚说明和用户批准。

### R5. 访问分析与可观测性策略

- 按“Cloudflare Analytics + Search Console + Umami/Plausible 二选一”为优先路线继续引导用户。
- Prometheus/Grafana/ARMS/Sentry/Langfuse 只在服务稳定、用户选择平台和确认隐私策略后接入。
- 可由 Codex 先补本地 adapter、文档、状态页和低敏 synthetic，但不创建或保存平台密钥。

### R6. 本地可推进的后续改进

- 继续完善公开/内部助手质量、Agentic Workspace 工具权限、引用、自检和 trace 体验，但不越过用户批准的真实模型任务边界。
- 继续完善博客与知识栏目质量，知识文章应有来源、知识点和具体场景，不能空口白话。
- 继续完善项目详情页的真实截图、流程图、演示路径和状态说明。
- 优先选择能本地验证、低风险、可提交的小步改进；平台阻塞事项只记录为 manual gate。

## Acceptance Criteria

- [ ] 规划文件清楚列出已完成、需人工、可由 Codex 继续推进、暂不做的事项。
- [ ] Studio 生产验收有一步步浏览器操作、成功标准和失败时的下一步。
- [ ] AI Daily 首次正式链路有可执行的顺序、人工审核点和 export 边界。
- [ ] Legal RAG、ERP、Xunqiu、Pet 的 credentialed checks 和 APK/release gates 不泄露真实凭据。
- [ ] 访问分析和可观测性平台选择有推荐默认路线和替代方案。
- [ ] 每个后续实现切片都有明确验证命令或人工验收证据。
- [ ] 不把未通过真实验收的功能从 `planned` / `unchecked` 提升为 `online`。
- [ ] 需要修改公开状态、手册或状态页时，同步运行相关本地检查。

## Decision

- 用户已确认按推荐路线先从 Studio 生产验收开始，并允许任务进入 `in_progress`。

## Out Of Scope

- 不自动执行真实模型测活、provider doctor 或无意义小题。
- 不自动公开 APK/AAB、后台凭据、demo 密码、数据库连接串或平台 token。
- 不把线上 Studio 直接写 Git 仓库；公开发布仍通过本地或 CI export + diff 审查。
- 不一次性接入所有观测平台；只按用户选择和实际需要推进。
