# 异步会话状态归属设计

## 当前数据流与根因

`sessionRegistry` 是 React 的渲染快照。DELETE 与 chat 可在不同会话上并发，但结束回调都用启动时快照重新记住/移除 capability，后完成的旧快照可能覆盖已完成的删除。

`stopInitialRestore` 只取消传输与目标。手动恢复成功会设置 ready，当前目标过期会创建新空会话；其余失败没有接管被取消初次恢复的 loading，界面失去当前恢复者。

## 方案

1. 以现有 `commitSessionRegistry` 为唯一提交入口增加同步 registry ref；它在持久化和 setState 前保存最新 registry。所有 remember/forget 运算在操作提交时读取这个最新值，列表请求仍可使用发起时的展示快照。保留纯 helper 与存储失败退化逻辑，不在 React updater 中执行存储副作用。
2. 手动恢复记录发起前当前会话是否未就绪；只有当前 controller 的失败可把该未就绪状态转为 error。沿用现有初次恢复提示/重试按钮，新的本地 restore-interrupted issue 映射到既有 copy.restore，避免复用带“回答已收到”或“当前仍可提问”语义的其他错误。限流保留原 code 与退避信息；当前目标过期仍走已有新空会话自愈。
3. 错误状态继续禁止聊天，明确重试只恢复当前 sessionId；新建会话沿用原取消、空上下文与草稿规则。旧初次 controller 不匹配时不得改变任何终态。
4. 扩展现有 history fixture 的受控初次请求，复用同一 normalizer、network guard、gate、焦点与发送断言，不创建重复测试框架。原 60 场景保留，每配置新增 10 项，合计 100。
5. 100 场景首批通过后主会话截图发现桌面恢复提示文字与按钮重叠；把已有 restore notice 的说明和动作沿纵向排列，限定 route-pages.css 的 restore 修饰类。加入真实文本 Range 与按钮边界断言，所有配置验证提示文案来自既有 restore 映射。

## 新增矩阵

每配置：非当前删除成功的两个到达顺序（2）；删除失败与独立生成（1）；手动恢复当前 503、其他 503、其他过期，各走明确重试当前/新建（6）；其他会话恢复成功后旧初次响应到达（1）。

## Owned / Forbidden

- Owned：PublicAssistantWidget.tsx、check-public-assistant-history-ui.mjs、route-pages.css 的 restore notice 排布；frontend state-management/quality-guidelines/index；父 assessment/task.json；本子任务七个文件。交付时才追加 journal/index。
- Forbidden：其余源码、API/helper、其他 CSS/文案、公开数据、依赖、保护快照、原有 13 份资料及历史 worktree。
- 完整 UI 沿用原 public-assistant 调用，不修改 check-ui.mjs 或旧断言。模型、网络端点和历史 fixture 均为本地模拟。

## 兼容与回滚

不迁移 storage，不改变命令或后端数据格式。独立工作提交为回滚点；失败保留证据并先诊断，不能通过降低断言或重复完整 UI 碰运气交付。
