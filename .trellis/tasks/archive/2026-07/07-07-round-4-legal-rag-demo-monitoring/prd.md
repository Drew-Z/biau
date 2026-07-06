# Legal RAG demo and monitoring

## Goal

复查 Legal RAG 公开 demo、问答、citation、合同审查和质量/监控状态，确保主站状态说明和真实演示能力一致。

## Confirmed Facts

- Legal RAG 仓库 `D:\workspace4Cursor\legal-rag` 是 Vue Web、Express API、shared package 的 workspace 项目。
- README 和 `LoginPanel.vue` 明确公开 demo 凭据只在部署环境配置 `VITE_PUBLIC_DEMO_EMAIL` / `VITE_PUBLIC_DEMO_PASSWORD` 后展示；真实后台密码不得写入仓库或公开页面。
- API 路由包含 `/api/health`、`/api/auth/status`、`/api/rag/query`、`/api/contracts/review`、`/api/quality/report`、`/api/evaluation/report` 和 `/api/review/evaluation/report`。
- 主站 `legal-rag:synthetic` 已支持缺少 API base 时保留既有 credentialed 报告。
- 本轮低敏公网检查曾观察到 Render connection refused / timeout，随后入口与 API health 恢复在线；状态页必须持续区分 L0 入口、API health、受保护功能 synthetic 和人工 credential gate。
- Legal RAG 本地质量基线通过：API 单测、MVP validate、RAG eval 和合同审查 eval 都可在无真实密钥路径下运行。

## Requirements

- 进入 `D:\workspace4Cursor\legal-rag` 前先读取本地规则和脚本。
- 只使用公开安全 demo 凭据或脱敏数据集；真实后台密码不得进入公开文章或项目页。
- 检查问答、合同审查、质量面板和 synthetic 输出是否可形成公开安全证据。
- 监控/metrics/tracing 只记录低敏接入方向，平台配置作为 manual gate。
- 公网 API/Web 不稳定时，状态页必须区分入口可达、API health、受保护功能 synthetic 和旧成功快照，不能用旧成功报告掩盖当前不可达。
- Synthetic 错误只保留低敏分类，不写入原始 `fetch failed`、堆栈、完整响应体、账号、密码、模型渠道或数据库信息。

## Acceptance Criteria

- [x] 明确当前 demo 入口、问答、合同审查和质量面板状态。
- [x] 运行 Legal RAG 项目最小相关 smoke/eval 或主站 `legal-rag:synthetic`。
- [x] 主站项目页/状态页必要时同步真实状态。
- [x] 不泄露真实账号、后台地址、模型渠道或数据库信息。
