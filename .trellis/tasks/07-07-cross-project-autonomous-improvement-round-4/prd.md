# Cross-project autonomous improvement round 4

## Goal

持续完善 `blog-semi` 主站及关联项目主体。默认先收口生产链路、可靠性观察和公开展示可信度，再推进项目内容、演示可用性、APK/下载 gate、AI Daily / Studio 内容链路和关联项目主体的小步改进。

本父任务不直接承载所有代码实现；它负责统一任务树、默认优先级、跨项目边界、manual gate 队列和最终整体验收。具体可交付改动由子任务完成。

关联项目：

- `D:\workspace4Cursor\blog-semi`
- `D:\workspace4Cursor\erp`
- `D:\workspace4Cursor\legal-rag`
- `D:\workspace4Cursor\pet`
- `D:\workspace4Codex\xunqiu`
- `D:\workspace4Codex\xunqiu-backend-modern`
- `D:\workspace4Cursor\game`

## Requirements

- R1. 建立可持续执行的 Trellis 父子任务结构，默认按优先级推进，不因单个人工 gate 阻塞其他可本地验证任务。
- R2. 每进入一个关联项目，先读取该项目本地规则和脚本：`AGENTS.md`、`CLAUDE.md`、`.cursor/rules`、README、package/build/test 配置。
- R3. 所有改动必须反哺 BIAU Port 的公开展示、演示可用性、可靠性观察、内容证据或内部助手/Studio 工作流。
- R4. 不公开或提交真实 token、数据库 URL、模型渠道、私有后台地址、生产密码、签名文件、真实用户数据或未批准 APK 下载链接。
- R5. 不做模型测活、provider ping 或无业务意义 doctor；真实模型调用只能服务于明确业务任务，例如 hidden Studio 草稿、AI Daily 草稿、助手实际问答验收。
- R6. 主站状态页和项目详情页必须如实表达 `online`、`degraded`、`planned`、`unchecked`、manual gate 和当前边界，不能把计划能力包装成已完成能力。
- R7. 每个子任务至少留下一种可审计成果：代码改动、文档更新、状态数据、测试记录、Studio 草稿、质量报告或 manual gate 记录。
- R8. 成功提交后，`blog-semi` 默认推送 `origin main`；其他仓库先确认分支、远程、敏感 diff 和仓库规则，再决定是否推送。

## Acceptance Criteria

- [x] 父任务和 8 个子任务已创建并包含可执行 PRD。
- [x] 父任务包含 `design.md`、`implement.md` 和 `manual-gates.md`。
- [ ] 至少完成一个 P1 子任务，或明确记录其被人工 gate 阻塞并切换到下一个可推进任务。
- [ ] 每个已完成子任务都运行最小相关验证，并在任务记录中说明验证结果。
- [ ] 主站数据、助手知识、sitemap/status 或相关文档在需要时已同步刷新。
- [ ] 没有把任何密钥、数据库连接串、生产凭据、私有模型渠道或未批准 APK 链接写入仓库。
- [ ] 完成整轮后，父任务汇总所有子任务结果、剩余 manual gates、提交和后续建议。

## Child Task Map

- P1 `07-07-round-4-reliability-status-synthetic`: 主站可靠性状态页与 synthetic 检查补强。
- P1 `07-07-round-4-assistant-studio-ai-daily`: 内部助手 / Studio / AI Daily 生产链路收口。
- P1 `07-07-round-4-project-detail-evidence-visuals`: 项目详情页内容、图示、状态证据和后续迭代方向补强。
- P1 `07-07-round-4-erp-registration-demo-usability`: ERP 注册、登录和演示可用性复查。
- P1 `07-07-round-4-legal-rag-demo-monitoring`: Legal RAG 问答、合同审查、公开 demo 与状态监控复查。
- P2 `07-07-round-4-pet-showcase-apk-gate`: Pet 展示页、APK 发布 gate 和公开下载条件整理。
- P2 `07-07-round-4-xunqiu-showcase-backend-apk`: Xunqiu 展示页、后端 health、阶段 APK 与文档一致性复查。
- P2 `07-07-round-4-playlab-game-entry-trials`: Playlab/Game Web 试玩入口、资源 manifest、移动端提示和截图回归。

## Constraints

- 不做大规模重构、不替换技术栈、不引入付费云资源，除非用户明确批准。
- 不把自动生成的草稿直接发布到公开站点；Studio 内容必须保持人工审核 gate。
- 生产验证只输出低敏状态码和公开安全摘要。
- 若某子任务需要平台操作、生产 token、发布批准或真实账号，记录到 `manual-gates.md` 后继续推进其他任务。
