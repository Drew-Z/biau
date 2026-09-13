# 设计：反馈响应与当前交互的归属

## 边界与数据流

`sendFeedback` 继续通过现有 API 提交固定载荷，并通过 `updatePublicAssistantRevisionFeedback` 更新原 Revision。只收窄其完成后的菜单/焦点副作用，不阻塞其他回答、草稿或历史操作。

在负反馈发起时捕获实际理由菜单 DOM 节点。成功与失败共享一个局部完成函数：

1. 原节点已脱离文档时，该反馈不再拥有菜单或焦点副作用。仅凭 messageId 不能区分关闭后重建的同名菜单，故使用实际节点身份。
2. 成功只以条件 updater 关闭仍属于原 messageId 的菜单；失败不关闭菜单。
3. 仅当焦点仍位于该菜单、它的触发按钮或 body 时，使用既有 `feedbackFocusRequest` 在 pending 解除后的 render 恢复触发按钮焦点。焦点位于输入框、另一回答或历史控件时不请求恢复。
4. body 条件有浏览器实证：点击理由后，按钮因 pending 禁用，Chromium 将 activeElement 置为 body。不能只检查菜单 contains，否则破坏现有成功/失败键盘合同。

正反馈保留现有条件关闭逻辑；Escape 是同步显式动作，保留既有 helper。无需新的持久状态、全局监听器、API 字段或请求取消机制。

## 兼容与风险控制

- 评分 reducer 与交互完成判断分离；原会话已切换时不把旧内容重新插入当前会话。
- 助手关闭时面板卸载，重新打开使用新 DOM；菜单实际身份可挡住旧响应。
- 历史抽屉打开时原对话仍存在，焦点归属检查必须保护抽屉。
- 两条请求交错时，原菜单节点脱离后不得因当前 activeElement 为 body 而误恢复旧按钮。
- 不增加全局反馈 busy，保留逐条 pending 和可继续编辑草稿的交互。

## 检查设计

新增独立反馈浏览器检查，复用真实 `normalizePublicAssistantSessionHistory` 和既有 `installLocalNetworkGuard`，不复制 API 校验逻辑。独立 Node 入口与完整 UI 调用同一导出函数，继续使用 scoped `tsImport`。

四配置：1440/Morning/zh、320/Stellar/en、390/Nature/zh、430/Morning/en。覆盖原菜单、另一菜单/理由按钮、草稿、Escape 后草稿、关闭后重开、历史抽屉、历史会话切换，以及两条反馈按两个顺序完成。每个旧响应覆盖成功和失败；原菜单失败后使用真实控件显式重试，保留 Escape 与正反馈对照。

使用可释放且有限时的 route gate；只通过可见控件交互，读取真实 activeElement 和菜单。比较正文、草稿、模式、registry、Branch、URL 和实际 POST；保存代表截图与每例结果。finally 释放未完成 gate 并关闭 page。禁止外部网络与真实模型。

## 文件所有权

- `src/components/PublicAssistantWidget.tsx`：仅 `sendFeedback` 的菜单捕获和完成边界。
- `scripts/check-public-assistant-feedback-ui.mjs`：新增专项。
- `scripts/check-ui.mjs`：仅导入和调用专项，保留既有全部断言。
- `scripts/check-public-assistant-history-ui.mjs`：仅在成功场景关闭/重开后等待既有初始焦点就位，再调用原 pending/Enter 断言。
- `.trellis/spec/frontend/state-management.md`、`quality-guidelines.md`、`index.md`：反馈交互合同及回归入口。
- 本子任务七文件、父 `task.json`/`assessment.md`、本轮 journal/index 追加记录。

其余 tracked 文件、原 13 份资料和保护快照保持基线原字节。回滚以精确工作提交为边界，不回滚用户或其他任务内容。

## 验证期间确认的测试就绪条件

第一次完整 UI 在 320/Stellar/en 的 `restore-success` 等待 composer 超时，失败截图显示助手已关闭。未改变原 `checkTransition` 与断言的诊断在第 4 次复现：重开后 1432.7ms 输入框聚焦，1439.8ms 既有移动端初始化将焦点放到关闭按钮，1441.2ms 测试发送 Enter 并触发关闭。没有 page error 或聊天请求。

在同一个重开分支等待 mobile close button / desktop composer 实际持有焦点，随后继续原 pending、Enter、native form 和显式发送断言。保留原 188 场景、超时和业务实现；不能用固定 sleep、弱化断言或改变产品首开焦点来掩盖此竞态。证据为 `history-diagnostic-3.json` 和首轮完整 UI 日志。
