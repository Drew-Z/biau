# 设计

## 问题边界

`initialRestoreIssue` 和普通 `issue` 都调用 `getAssistantIssueCopy`，相同错误码因此继承了聊天或历史列表的说明。初次恢复失败没有生成回答，而且当前会话尚不能发送。修复发生在显示投影，不改变 transport error、catch/finally 或恢复状态。

## 文案上下文

为现有 helper 增加默认值为 `request` 的 `request | restore` 显示上下文，仅 `initialRestoreIssueCopy` 传入 `restore`。

1. 设备离线、网络恢复和 rate-limit 继续按当前最高优先级投影。
2. `restore` 上下文中的 `public-assistant-history-refresh-required` 保留“回答已收到，刷新后继续”说明。
3. 其他 `restore` 错误使用现有 `copy.restore`。
4. 默认 request 分支保持原有分支、重新生成、预热、超时、历史等映射顺序。

不重写原始 issue code，不修改倒计时字段，不增设状态/effect，不全局替换 `copy.issues.history`。保留历史手动恢复的 `restore-interrupted` 兼容投影。

## 浏览器验证

扩展 `check-public-assistant-history-ui.mjs` 的本地 fixture，让初次失败可选择返回状态、JSON、Retry-After。原 152 场景保留；四配置各新增 9 场景，总计 188：

- 普通失败 6 类：503 服务、503 数据库、未知 500、504 超时、连接不可达类别、无效成功响应。
- 离线到联网：恢复提示跟随网络状态，联网不自动重试。
- 429：倒计时结束前禁用，结束后保留专用说明，直到显式动作才恢复。
- 已恢复会话的历史列表 503：原列表说明保持，当前上下文仍可显式发送。

普通失败检查真实 DOM 文本、空消息、草稿和身份、输入/发送门禁、文字与按钮几何；服务失败额外通过关闭助手、实际切换语言、重新打开验证无自动请求。未知失败通过 New 进入空白会话，其他路径显式 Retry 后发送，验证请求的 session/Branch/parent/history。现有完整 UI 中 replay refresh 场景检查 `copy.issues.refresh`，不重复实现同一 fixture。

## 文件所有权

- `src/components/PublicAssistantWidget.tsx`
- `scripts/check-public-assistant-history-ui.mjs`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- 当前子任务 7 文件、父任务 `assessment.md` / `task.json`，交付时的 journal/index。

其他生产源码、公开数据、样式、锁文件、原有未跟踪资料为禁止修改范围。

## 回滚

基线 `1d2b72d8ee96ffef83877be266021f3788896349`。必要时只反向撤销本子任务提交；不回滚先前已交付的恢复重试互斥。文案分流不改变持久化数据或服务协议。
