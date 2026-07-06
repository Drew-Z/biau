# Legal RAG demo and monitoring

## Goal

复查 Legal RAG 公开 demo、问答、citation、合同审查和质量/监控状态，确保主站状态说明和真实演示能力一致。

## Requirements

- 进入 `D:\workspace4Cursor\legal-rag` 前先读取本地规则和脚本。
- 只使用公开安全 demo 凭据或脱敏数据集；真实后台密码不得进入公开文章或项目页。
- 检查问答、合同审查、质量面板和 synthetic 输出是否可形成公开安全证据。
- 监控/metrics/tracing 只记录低敏接入方向，平台配置作为 manual gate。

## Acceptance Criteria

- [ ] 明确当前 demo 入口、问答、合同审查和质量面板状态。
- [ ] 运行 Legal RAG 项目最小相关 smoke/eval 或主站 `legal-rag:synthetic`。
- [ ] 主站项目页/状态页必要时同步真实状态。
- [ ] 不泄露真实账号、后台地址、模型渠道或数据库信息。
