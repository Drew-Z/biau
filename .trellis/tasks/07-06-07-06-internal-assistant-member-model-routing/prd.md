# Internal assistant member model routing finalization

## Goal

把内部助手从“有模型渠道字段的 MVP”推进到可维护的最终形态切片：管理员能够给成员分配明确的模型渠道，成员端能够看到自己实际使用的渠道摘要，后端调用链路能够按成员配置选择渠道，并且在无真实模型或无数据库时仍有可验证的本地/模拟路径。

## Requirements

- 支持成员级模型渠道分配：每个成员可以绑定一个可用模型渠道，未绑定成员使用系统默认渠道。
- 管理端必须能查看成员当前渠道、切换渠道，并区分 active / inactive / default 状态。
- 聊天接口必须按成员的 `modelChannelId` 解析渠道，并把安全的渠道摘要写入响应 meta / usage log，不暴露 API key、base URL、内部错误栈或私有部署地址。
- Provider 选择逻辑必须可测试：真实模型调用保持手动 gate，不在本任务里做 ping、测活或玩具 prompt。
- 前端内部助手页面必须清楚显示当前成员渠道和每次回答的渠道信息；无 API 时仍使用本地公开知识回退。
- 如果现有实现已经满足部分要求，本任务优先补文档、测试或边界缺口，不重复重构。

## Acceptance Criteria

- [x] Prisma schema / 后端类型 / API route / 管理 UI 的成员渠道字段一致，没有悬空字段或不可达 UI。
- [x] 成员渠道解析覆盖默认渠道、成员专属渠道、禁用渠道和 provider 不可用的降级语义。
- [x] 内部助手聊天响应包含可公开展示的 `mode`、`model`、`modelChannel` 摘要，并且前端使用这些字段展示当前回答来源。
- [x] 管理端成员列表或成员操作区可完成渠道分配，不要求输入或展示任何密钥。
- [x] 文档或 manual gate 说明生产环境需要配置的真实模型变量、迁移和 live 验证步骤。
- [x] 通过相关无 live model 验证：Prisma validate、server build/smoke、assistant service mode smoke、lint/build 或等价最小命令。

## Notes

- 不读取 `.env`、不提交真实 key、不把用户提供过的临时模型 key 写入仓库。
- 不对任何模型渠道做测活；如需真实验证，记录到父任务 `manual-actions.md`。
