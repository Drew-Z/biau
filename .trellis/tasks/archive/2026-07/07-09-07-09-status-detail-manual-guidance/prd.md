# Status detail manual handling guidance

## Goal

让 `/status/:projectId` 详情页不只是列出人工 gate 和后续接入事项，还要告诉用户这些事项应该如何安全处理：去对应平台或项目环境完成、不要把密钥/密码/API URL 写入公开站点、完成后只记录低敏证据。这样用户从 `/status` 人工队列点进详情页后，可以直接理解下一步处理规则。

## Requirements

- 在状态详情页人工 gate 区域附近增加一块公开安全的处理说明。
- 说明应覆盖：只在平台/本机环境填写敏感值、不要把凭据写进文章/状态页/聊天、完成后记录低敏摘要、失败时记录错误类别而不是真实值。
- 说明应适用于 Legal RAG、ERP、Xunqiu、Pet、Studio、观测平台等所有状态项目，不硬编码某个真实 token、URL、账号或密码。
- UI 应保持现有详情页布局，不把列表塞进卡片嵌套卡片，不造成移动端文本溢出。
- `check:ui` 应验证状态详情页存在这块处理说明，避免后续被误删。

## Acceptance Criteria

- [ ] `/status/legal-rag` 渲染人工 gate / 后续接入列表时，同时显示人工处理规则说明。
- [ ] 说明文案包含“低敏证据”边界和“不要写入 token / 密码 / 数据库 URL / 模型渠道”等安全提醒。
- [ ] 文案不包含真实密钥、生产账号、数据库连接串、模型中转站地址或签名路径。
- [ ] `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui` 通过。

## Notes

- 这是父任务 `.trellis/tasks/07-08-production-acceptance-manual-gates-closure` 下的轻量 UI/文案子任务。
- 不改变任何项目真实状态，不把 gated 能力标记为 online。
