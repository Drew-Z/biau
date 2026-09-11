# 公开助手分支切换期间的发送隔离

## Goal

分支切换或“从此版本继续”尚未完成时保留读者草稿，阻止新问题误发到旧分支；操作结束后由读者明确发送到当时的有效路径。

## Confirmed Facts

- 父路线图第 44 轮已完成图片修复的归档与 Session 131；沿用已授权的本地评估、修复、验证和精确提交范围。
- 基线 `59759fa5915e030f619c61e587c914edc2a3bdf4`。`PublicAssistantWidget.tsx:581` 的共享 busy 状态已经包含 Branch pending，但 `:1277` 的发送函数和 `:2341` 的按钮禁用条件遗漏它；`:1575-1606` 已有同步 pending ref、控制器和成功/失败/取消释放路径。
- 1440/320 × select/continue-from-revision × Enter/按钮，共 8/8 本地浏览器场景实际复现：分支 B 的请求仍在等待，新问题已经以分支 A 和其旧 parentRevisionId 发出。原始 `branch-send-baseline.json` 与两张截图位于 `C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-branch-knackD`；所有 API 为 fixture，页面/外部请求错误 0，真实模型 0。
- 既有分支测试覆盖失败、精确重试、重复提交与版本生成，但没有覆盖分支操作未完成时发送新问题。

## Requirements

- R1：select 和 continue-from-revision pending 期间，发送按钮禁用；Enter、表单提交和共用发送函数不能产生 chat 请求或修改可见问答。使用既有 busy 投影和同步 Branch pending ref，覆盖状态提交前的事件。
- R2：等待时 textarea 继续可编辑，草稿与模式保持；成功、失败和明确重试均不自动发送。成功后显式发送使用新路径；失败后保留原路径，重试捕获的原动作。
- R3：新建会话取消 pending 操作后立即释放发送；旧结果不能覆盖新会话。保留既有控制器/session fence，不新增全局状态或后端协议。
- R4：保持图片处理门禁、编辑问题后重发、重新生成、取消、恢复、输入法组合输入和 Shift+Enter 行为；翻译与 CSS 不扩展。

## Acceptance Criteria

- [x] A1 / R1：同一永久回归断言在旧构建失败、修复后通过，原始负向结果保留。
- [x] A2 / R1-R3：四个代表配置覆盖两个分支动作的成功、失败、重试和新会话取消，共 32 场景；断言草稿、请求次数、会话/分支/parentRevisionId 和 history。
- [x] A3 / R4：图片专项 48、相关助手合同、lint/build、performance、smoke 和当前构建完整 UI 通过；代表截图及最终输入一致性核对完成。
- [ ] A4：原有 13 份资料、保护快照、依赖和公开内容保持；精确本地提交、仅归档本子任务、记录 Session 并实际返回父任务再评估。

## Out Of Scope

- 不 push/deploy/sign、调用真实模型、配置生产 DB/relay、发布内容、启用 Feed/Cron 或修改未知 scheduler。
- 不修改 `public/status/blog-semi-synthetic.json`、依赖、AI Daily 版次、既有翻译范围、其他任务或旧 worktree。
- 不把本地 fixture 结论扩大为生产验收，不将旧状态页 wheel 观察作为已确定缺陷或修改理由。
