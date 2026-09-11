# 设计与边界

## 现有状态流与修复

Branch command → 同步 `branchActionPendingRef` 与 React `branchActionPending` → 请求 → 成功 hydrate authoritative history / 失败保留旧路径 → finally 释放。新建会话通过现有 stopBranchAction 同步释放并中止控制器。

复用 `isAssistantBusy` 为发送按钮与 submitQuestion 提供同一 React 投影；发送函数额外检查已存在的同步 Branch ref，继续检查 active chat 和 image preparation refs。门禁放在 analytics、request ID 与问答状态变更之前。

不把 `isQuestionEditing` 纳入通用 submitQuestion 的拒绝条件：编辑后重发在同一事件中先关闭编辑器再调用该函数，React 编辑投影尚未提交。保留现有专用入口及按钮约束。

textarea 保持可编辑，不排队自动发送；成功读取同会话浏览器草稿的现有逻辑保持。分支网络、取消、历史 hydrate 和后端数据结构不修改。

## Owned / Forbidden

- 实现：`src/components/PublicAssistantWidget.tsx` 的共用发送门禁与发送按钮两处。
- 回归：新增 `scripts/check-public-assistant-branch-ui.mjs`，在 `scripts/check-ui.mjs` 的现有 public-assistant 组导入并调用。
- 规范：frontend 的 state-management、quality-guidelines 与 index；子任务七文件、父任务评估/状态及最后的开发日志。
- Forbidden：服务端/API/压缩 helper/CSS/文案/依赖/公开内容/保护快照/旧未跟踪资料和其他 worktree。

## 浏览器证据

32 场景 = 1440/Morning/中文、320/Stellar/英文、390/Nature/中文、430/Morning/英文 × select/continue-from-revision × success/failure/retry/new-session。

每个场景有独立上下文、阻断 service worker 和外部网络；所有 API fixture 经过生产 decoder 校验。实际分支响应由有界 gate 控制，断言 UI 与请求，不读 React 私有状态。等待期间测试可编辑草稿、Enter/原生表单提交阻断及 disabled 状态；释放后检查显式发送的 session、branch、parent 和 history。成功场景补 Shift+Enter/组合输入；重试核对原 action 完全相同；新会话核对晚结果不回写。

## 风险与回滚

主要风险是扩大共用 gate 导致编辑后重发或既有图片流程被误拦；因此运行既有助手完整组和图片专项。生产行为保持，回滚点为 `59759fa5` 中两处门禁原文，按本任务精确差异恢复，不回滚其他成果。
