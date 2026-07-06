# Cross-project autonomous improvement round 5

## Goal

持续完善 `blog-semi` 主站及关联项目主体。Round 5 的默认路线是：优先做不依赖云平台密钥、能本地验证、能明显改善访客理解和演示可信度的工作；同时承接 Round 4 留下的人工门禁，继续记录平台侧、凭据侧、发布审批侧的待办。

本父任务负责统一优先级、任务树、manual gate 队列和最终验收。具体实现由子任务完成。

## Scope

默认关联项目：

- `D:\workspace4Cursor\blog-semi`
- `D:\workspace4Cursor\erp`
- `D:\workspace4Cursor\legal-rag`
- `D:\workspace4Cursor\pet`
- `D:\workspace4Codex\xunqiu`
- `D:\workspace4Codex\xunqiu-backend-modern`
- `D:\workspace4Cursor\game`

## Requirements

- R1. 延续长期自主完善模式：不因单个人工 gate 阻塞其他可推进任务。
- R2. 优先处理访客可见价值高、可本地验证的改进：项目详情页证据、正文插图/流程图、公开状态解释、内部助手管理体验、AI Daily / Studio 流程、关联项目演示入口。
- R3. 项目详情页要从“摘要卡片”推进到“访客可读的技术案例页”：实现、架构、技术栈、数据流、部署/运维、已知不足、后续迭代方向都要有证据或图示支撑。
- R4. 图片、流程图和状态说明不能伪造能力；缺少真实截图时使用明确标注的架构图、流程图、界面占位或当前工作状态。
- R5. 每进入一个关联项目，先读该项目自己的 `AGENTS.md`、`CLAUDE.md`、`.cursor/rules`、README、构建脚本和当前 git 状态。
- R6. 不写入真实 token、数据库 URL、模型渠道、后台密码、私有后台地址、签名文件路径、未批准 APK 链接或真实用户数据。
- R7. 不做模型测活、provider ping、无业务意义 doctor；如需模型参与，只能用于明确业务任务并记录输入输出边界。
- R8. 每个子任务必须留下可审计成果：代码改动、状态数据、测试记录、文档沉淀、草稿记录或 manual gate 更新。
- R9. `blog-semi` 在 `main` 上成功提交后默认推送 `origin main`；其他仓库推送前先确认仓库规则、分支、远程和敏感 diff。

## Default Child Task Order

1. P1 `round-5-project-detail-case-study-visuals`：项目详情页技术案例内容、正文插图、流程图和证据结构。
2. P1 `round-5-internal-assistant-agentic-workspace-polish`：内部助手最终形态体验、管理页、知识/会话/模型渠道的可用性复查。
3. P1 `round-5-ai-daily-studio-authoring-flow`：AI Daily issue、Studio 写作/审核/发布 gate、隐藏草稿路径复查。
4. P1 `round-5-reliability-status-manual-gate-followup`：Round 4 留下的状态页、Legal RAG timeout、ERP demo、APK gate 和状态解释复查。
5. P2 `round-5-associated-project-small-fixes`：ERP、Legal RAG、Pet、Xunqiu、Game/Playlab 中能反哺主站展示和演示的低风险小修。
6. P2 `round-5-blog-knowledge-content-backlog`：知识积累栏目选题、证据模板、已生成文章质量复查，不依赖多模型润色。

## Manual Gates Carried Forward

- Legal RAG public workbench timeout / Render cold-start / paused service / redeploy health.
- Legal RAG protected QA、合同审查、质量面板需要低权限 demo 凭据。
- Pet 与 Xunqiu APK 公开下载需要签名 release 包、校验摘要、版本说明、扫描/回归证据、回滚说明和明确批准。
- Studio / AI Daily 生产链路需要平台变量、迁移、首次真实 issue -> hidden draft 的人工确认。
- ERP 登录路径需要低权限 demo 账号；插件/同步 smoke 需要脱敏 fixture 或专用 demo shop。
- Cloudflare、Render、Aiven、Qdrant、Supabase、Grafana、Umami/Plausible、Search Console 等平台配置继续只记录，不把真实配置写入仓库。

## Acceptance Criteria

- [x] 父任务包含 `prd.md`、`design.md`、`implement.md` 和 `manual-gates.md`。
- [x] 至少完成 1 个 P1 子任务，并提交可验证成果。
- [x] 项目详情页或相关内容至少有一处从纯文本描述升级为证据化结构或图示化表达。
- [x] 每个已完成子任务都运行最小相关验证并记录结果。
- [x] 人工门禁被集中记录，且没有阻塞其他可本地推进任务。
- [x] 没有提交任何密钥、生产凭据、数据库连接串、私有模型渠道、未批准 APK 链接或敏感业务数据。
- [x] 完成整轮后汇总子任务结果、剩余人工待办、验证记录、提交和后续建议。
