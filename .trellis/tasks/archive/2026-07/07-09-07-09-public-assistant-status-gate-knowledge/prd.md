# Public assistant status gate knowledge

## Goal

让公开助手能基于公开知识回答“状态页里的人工 gate / 后续接入是什么意思、应该怎么处理、哪些信息不能公开”。这能把 `/status` 详情页新增的人工处理规则同步到助手知识面，避免访客或用户问到 gate 时只得到泛泛的状态页介绍。

## Requirements

- 更新公开助手的状态页知识摘要，包含：人工 gate、后续接入、低敏证据、不要公开 token/密码/数据库 URL/模型渠道/签名材料等边界。
- 增加一个公开助手建议问题，引导用户询问人工 gate 的处理方式。
- 重新生成 `server/data/public-knowledge.json` 和 `server/data/public-knowledge-v2.json`，保证前端 fallback、服务端和生成知识一致。
- 不新增真实平台地址、凭据、账号、密码、模型中转站、数据库连接串、签名路径或生产指标。
- 不执行模型测活；验证仅使用本地知识索引、离线评估、lint/build/UI。

## Acceptance Criteria

- [ ] `site:status` 公开知识能检索到人工 gate / 低敏证据 / 不公开敏感值相关语义。
- [ ] 公开助手建议列表包含一个人工 gate 处理相关问题。
- [ ] 生成后的 `server/data/public-knowledge*.json` 与 `src/data/assistant.ts` 一致。
- [ ] `npm.cmd run assistant:index`、`npm.cmd run assistant:kg-check`、`npm.cmd run assistant:eval`、`npm.cmd run lint`、`npm.cmd run build` 通过。

## Notes

- 这是父任务 `.trellis/tasks/07-08-production-acceptance-manual-gates-closure` 下的轻量助手知识同步任务。
- 只处理公开助手知识；内部助手真实模型质量和 RAG Orchestrator 生产配置不在本切片内。
