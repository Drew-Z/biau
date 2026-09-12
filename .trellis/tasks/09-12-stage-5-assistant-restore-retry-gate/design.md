# 设计：恢复重试遵守历史操作门禁

## 原因与所有权

`openHistorySession` 已在发请求前获取 `historyActionPendingRef`，并捕获当前 `isConversationReady`。它会终止已有初次恢复，并负责成功/失败终态。错误提示中的 `retryInitialRestore` 只检查初次恢复的 target/controller；历史恢复接替它后这两个 ref 都为空，因而能重新启动另一条恢复。

本轮让恢复重试加入已有门禁，不新增控制器或第二套状态机：

1. `initialRestoreRetryBlocked` 在原离线/限流判定外，加入 `historyLoadingId !== null`，沿用现有按钮 disabled 投影。
2. `retryInitialRestore` 同时读取 `historyActionPendingRef.current`，覆盖 React 尚未提交 disabled 的同步窗口。
3. 保留原 target/controller guard、手动恢复接替机制及 finally 身份判断。先发起的初次恢复仍可被访客明确选择的历史恢复接替。
4. 列表刷新只占用 `historyRequestRef`，不持有动作 pending；因此不得直接用 transport ref 阻止恢复重试。

## 验证设计

扩展已有本地 fixture 的启动选项，允许首次 A 恢复返回可控 503。每个既有配置新增 13 场景：当前/其他恢复的成功、503、404（6），当前/其他删除的成功、503（4），同一事件批次的恢复/删除与重试（2），只读列表 pending 时显式恢复（1）。共新增 52，原 100 保留，总计 152。

断言 DOM disabled、实际 POST/DELETE 数量/目标、localStorage registry、sessionStorage 草稿、最终会话历史及后续问题的 Branch/parent/history。操作 pending 时保持新建可用；失败/非当前删除/非当前过期后必须通过明确的当前恢复重试才可发送。当前删除/过期进入新的空会话；其他 capability 与草稿独立。所有 fixture 使用生产 normalizer、请求 gate 与外部网络拦截，finally 释放请求和页面。

同步场景通过真实 DOM 的两个同步 click 验证命令边界，不读取 React 内部状态。旧构建必须失败于新增行为断言，不能把 fixture 设置错误当成产品证据。

## 文件所有权

业务与回归仅允许：

- `src/components/PublicAssistantWidget.tsx`
- `scripts/check-public-assistant-history-ui.mjs`

规范与任务记录仅允许：

- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- 本子任务的 `prd.md`、`design.md`、`implement.md`、`verification.md`、`task.json`、`implement.jsonl`、`check.jsonl`
- 父任务 `assessment.md`、`task.json`

收尾单独提交本子任务归档及父任务记账，最后按 finish-work 追加开发日志。禁止修改其他已有资料、源数据、公共状态快照、样式、依赖、API/helper、既有 UI 组数量或历史 worktree。

## 回滚边界

基线为 `e72ed5428868046e9eb299d9af73c3578fa772cf`。只回退本子任务精确提交即可恢复原行为；不得覆盖用户资料或撤回前一轮交付。原字节基线与所有本轮证据保存在系统临时证据目录，失败记录不覆盖。
