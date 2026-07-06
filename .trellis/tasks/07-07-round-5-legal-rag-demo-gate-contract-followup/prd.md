# Round 5 Legal RAG demo gate contract followup

## Goal

复查 Legal RAG 公开入口和受保护功能的状态表达，确保主站不会把“工作台入口/API health 可达”误写成“法律问答、合同审查、质量面板已公开可用”。实现一个本地可验证的契约检查，锁住 credential-required / hasCredentials=false 时的状态语义。

## Requirements

- R1. 读取 `D:\workspace4Cursor\legal-rag` 的本地规则、README、脚本和 git 状态。
- R2. 不使用真实登录账号、demo 密码、模型渠道、数据库 URL、后台地址或平台 token。
- R3. 不向生产问答/合同审查接口发送问题或合同文本。
- R4. 如果 `legal-rag-synthetic.json` 表示 `hasCredentials=false` 或 `demoAccessStatus=credential-required`，受保护 checks 不能是 `online`。
- R5. 低敏 API health 可以是 `online`，但 QA、合同审查、质量面板仍需要人工 gate。

## Acceptance Criteria

- [x] 读取 Legal RAG 项目规则、README、脚本和 git 状态。
- [x] 确认当前主站 Legal RAG synthetic/status 快照语义。
- [x] 完成一个本地可验证的 Legal demo gate 契约改进。
- [x] 运行主站相关验证。
- [ ] 提交并推送 `blog-semi`；Legal RAG 仓库只在安全且符合规则时提交/推送。

## Notes

- 本任务不解除登录门禁，只避免状态页夸大受保护功能的可用性。
- Legal RAG 仓库本轮只读取上下文，没有修改或提交。
