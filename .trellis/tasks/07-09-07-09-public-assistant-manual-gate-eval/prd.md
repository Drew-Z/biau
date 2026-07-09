# Public assistant manual gate eval

## Goal

把公开助手新增的“人工 gate 怎么处理”知识纳入离线 RAG 评估，确保后续索引、检索或 fallback answer 调整时，助手仍能引用状态页并说明低敏证据与敏感信息边界。

## Requirements

- 新增一个公开助手离线 eval case，问题覆盖“状态页里的人工 gate / 后续接入应该怎么处理，哪些信息不能公开”。
- 该用例必须命中 `reliability-status` 意图，并引用 `site:status`。
- 评估不仅检查 citation，还要检查回答文本包含低敏证据和敏感字段边界，例如 token、密码、数据库 URL、模型渠道。
- 不执行 live 模型调用，不触发 provider doctor，不读取或输出真实 token / URL / 密码。
- 评估脚本扩展应保持类型清晰，避免 ad hoc 断言散落到用例外。

## Acceptance Criteria

- [ ] `npm.cmd run assistant:eval` 的总用例数增加，并通过。
- [ ] 新用例失败时能清楚说明缺少的 answer phrase 或 citation。
- [ ] `npm.cmd run lint` 通过。
- [ ] 如触碰 TypeScript 编译路径，`npm.cmd run build` 通过。

## Notes

- 这是父任务 `.trellis/tasks/07-08-production-acceptance-manual-gates-closure` 下的轻量测试护栏任务。
