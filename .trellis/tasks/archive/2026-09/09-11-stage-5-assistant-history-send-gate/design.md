# 历史会话操作与过期恢复隔离设计

## 边界与现状

当前组件用 `historyRequestRef` 共享历史列表/恢复/删除传输，用 `historyLoadingId` 投影恢复与删除操作。列表关闭只关闭 UI，并不取消请求，这是既有交互。共享发送门禁没有识别后两类操作，因此可以在上下文即将改变时提交旧上下文。

本任务只修改 Widget 的操作生命周期和永久浏览器检查，不改 API payload、decoder、会话/草稿存储格式、后端或布局。

## 方案

1. 把 `historyLoadingId !== null` 加入现有 `isAssistantBusy`，自然覆盖发送按钮、建议、重新生成、问题编辑、分支与图片控件；textarea 保留原来的可编辑规则。
2. 增加同步 `historyActionPendingRef`，只代表恢复/删除，不代表只读列表刷新。两类操作在请求前占用，在当前 controller 的 finally 中释放；新建会话同步清除。发送和分支命令入口检查它，阻止同一事件周期穿透；恢复/删除入口也用它去重。
3. 保持 `historyRequestRef` 的身份比较和传输取消；旧 finally 不能清新操作。历史 UI 关闭或助手关闭不解除仍在途的门禁。新建会话仍可随时取消。
4. 恢复成功沿用 `acceptAuthoritativeHistory`：旧 A 草稿保存在 A，B 使用 B 草稿；同会话恢复保留其最新草稿。删除当前会话沿用新会话重置和浏览器状态清理。失败保持原路径/草稿，不自动发送；显式历史重试只重复其操作。
5. 永久回归在旧构建确认当前删除未发送取消：受控生成仍 pending，5 秒内没有对应取消请求，真实失败已保留。确认删除当前会话时复用 `stopActiveChat`，在 DELETE 前发送原 request/session 取消并释放本地生成；不取消非当前会话删除时的独立生成。用户拒绝确认时不占用门禁、不发送删除或取消。
6. `session-not-found` 的当前会话恢复不能只修改 registry：helper 的 remaining[0] 不带对应的历史与草稿加载。先识别请求目标是否当前会话；当前过期沿用首次自动恢复的语义，创建新 capability、清空 reducer/草稿/快照/恢复状态，不自动激活另一旧会话；非当前过期仅 forget。复用 `loadSessionBrowserState` 和现有会话 helper，不改存储格式或 helper 对其他调用者的语义。

## 取舍

只设置按钮 disabled 不能阻止 Enter / 原生 form submit；关闭列表不等于用户取消其已发请求。复用已有 busy 与 controller，并为操作增加一个同步令牌，比引入状态机库或让每种入口各自判断更小。只读列表刷新没有替换上下文，因此不阻断当前明确发送。

## Owned / Forbidden

- Owned：`src/components/PublicAssistantWidget.tsx`、`scripts/check-public-assistant-history-ui.mjs`、`scripts/check-ui.mjs`；frontend state/quality/index；父任务 assessment/task.json；本子任务七个文件。
- Forbidden：其余源码、后端、依赖、CSS/文案、公开数据、保护快照、旧 13 份资料和所有历史 worktree。开发日志只在交付收尾时追加。

## 验证与回滚

使用独立浏览器上下文、禁用 service workers、共享本地网络 guard、真实 DOM/键盘/表单及合法 v2 chat/history fixture。四配置为 1440/Morning/中文、320/Stellar/英文、390/Nature/中文、430/Morning/英文。每配置原 12 场景加上当前过期且有/无其他会话、非当前过期，共 60 场景。响应使用显式有时限 gate，finally 释放并关闭 context；保存原失败、最终日志和截图。

工作提交为单独回滚点；任何失败先诊断，不降低旧断言、不把部分 UI 拼成全量。生产和远端边界不受本次本地通过影响。
