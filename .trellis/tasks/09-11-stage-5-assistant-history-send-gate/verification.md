# 验证记录

## 当前状态

- 最终历史 60、分支 32、图片 48、三项助手合同、lint/build、performance 与 smoke 21/0（9996ms）通过，原失败和两次检查器前置修正均保留。
- `validation-inputs.json` 已冻结 506 源文件、172 构建、3 规范、47 个实际 preview 响应；13 份旧资料和保护快照一致。
- 本任务唯一一次完整 UI 实际 exit 0，46 组 / 0 失败、1633051ms；2026-09-11T02:36:56.3135959Z 开始、03:04:12.9503249Z 结束，工具会话 63868 已回收终局，原始结果为 `full-ui-result.json`。
- `final-validation.json` 实际通过：506 源文件、172 构建、3 规范、47 个实际 preview 响应与冻结记录逐字节一致；索引为空，13 份旧资料与保护快照保持。主会话已查看最终 `history-final/history-pending-restore-320.png` 和 `history-final/history-pending-delete-current-1440.png`，等待态草稿可编辑、发送禁用、原有布局保持。
- 验证已完成，进入本地工作提交、资源回收和子任务归档；这些交付动作分别在发生后记录，不提前记为完成。

## 基线与复现

- HEAD `30c70e125f0cde08ce1486cdcea003503a44da35`，已跟踪工作树和索引干净。`baseline.json` 保存 1539 源 tracked、13 旧 untracked、172 dist 原字节 hash。
- 证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-history-2272dc2221b54956bb9f3d779884aaa3`。
- 自有 loopback preview 5198（工具会话 50883）；探针先与上一分支任务最终 input manifest 核对所有源和构建字节一致。
- `probe-history-send.mjs` 实际 exit 0，`history-send-baseline.json`：1440/320 × 恢复 B / 删除当前 A 共 4/4 误发，桌面按钮/手机 Enter 的 chat 均在 history pending 时携带 A 与旧 parent；发送按钮 enabled，完成后输入为空。页面/外部错误 0，真实模型调用 0。
- 该阶段仅建立修复前基线，尚未实施。复现截图保留 `baseline-history-{restore,delete-current}-{1440,320}.png`；最终验证见上方当前状态。

## 实施与专项过程

- 永久检查在旧构建真实 exit 1：`1440/morning/zh/active-deletion-success` 未收到当前会话删除应发送的取消请求；响应保持受控，5 秒边界后失败，记录为 `history-before.log`。因此本次在确认删除当前会话时复用 `stopActiveChat`，拒绝删除确认时不取消。
- 最小 Widget 修复已加入历史操作 busy 与同步 ref；恢复、删除的当前 finally 和新会话/卸载清理释放，旧 controller 不能解除新操作。原 public-assistant 完整组增加新检查调用，未改旧断言。
- 初次 lint、build 和三项助手合同实际 exit 0。首轮历史专项 `history-after.log` exit 1，在桌面第 12 项 list-only 的 Shift+Enter 断言失败：实际换行插入光标所在的开头，检查器错误预设光标位于末尾。此前 11 项已走完，未据此标记全专项通过。
- 在 `explicitSend` 中用真实 `Control+End` 明确测试的光标位置，保留原换行、composition 与提交断言；未修改业务代码或阈值。修正后的专项使用独立 `history-after-2.log` 与截图目录。
- 第二次专项 `history-after-2.log` exit 1，在 390/Nature/中文的 list-only 同样于开头插入换行。`closeHistory` 的 requestAnimationFrame 会恢复历史触发按钮焦点，检查器在这个已定义的焦点动作完成前即操作 composer。新增 `closeHistoryAndRestoreFocus`，先等待真实 activeElement 回到历史按钮，再定位光标和发键；没有固定 sleep 或降低断言。下一次使用 `history-after-3.log`，业务源码和构建保持。
- `history-after-3.log` 实际 exit 0、48/48；两个原专项再次通过（分支 32、图片 48），lint-final、三个助手合同与 performance 通过。主会话复看 320 英文恢复 pending 与 1440 中文删除 pending 截图。尚未运行本任务完整 UI。
- 全量前的相邻核验 `probe-expired-history.mjs` exit 0，`expired-history-baseline.json` 在 1440/320 共 2/2 记录当前 A 过期后 ID 变 B，但仍显示 A，下一次明确请求带 B session 和 A branch/parent/history。纳入同一历史隔离任务 R6，新增过期永久检查后修复；上述 48 场景结果只代表扩充前输入，不作为最终 60 场景通过。
- 60 场景的永久检查先在修复过期前构建真实失败（`history-expiry-before.log` exit 1）：当前过期错误激活另一保存能力。Widget 现对当前过期清空对话、草稿/图片/快照和恢复状态，使用新 capability；非当前过期保持当前状态。未修改 registry helper、API、CSS 或文案。
- 最终完整专项 `history-final.log` 实际 exit 0、60/60；`branch-ui-final.log` 32/32、`image-ui-final.log` 48/48，模型调用均 0。`final-checks-result.json` 保存 9 个实际 exit 0：lint-complete、build-final、三项助手合同、三项专项、performance-final。最终构建为 `PublicAssistantWidget-DYGAD20j.js` / `index-BsY0szVY.js`，入口 CSS 152582/222755、JS 320266/430000 bytes。

## Bug Analysis: 历史操作与会话身份

### 1. Root Cause Category

- C/D：历史列表内的局部门禁未传播到共享发送入口，旧测试覆盖操作成功但遗漏 pending 时关闭列表继续发送；当前删除还遗漏生成取消。
- E：`forgetPublicAssistantSession` 的默认 current ID 选择被当作完整上下文切换，实际 reducer、草稿和分支并未同步；此前图片过期检查只证明图片释放，不证明请求上下文一致。

### 2. Why Fixes Failed

- 首轮业务门禁通过既定 48 场景，相邻结束态核验才暴露当前过期问题，因此在完整 UI 前扩大为 60 场景，并单独保留过期负向记录。
- 检查器第一次错误假设已保存草稿的光标位于末尾；仅发送 Control+End 仍会被尚未完成的历史焦点恢复影响。等待真实焦点归还后再发键，保留原换行和 composition 断言，最终矩阵通过。

### 3. Prevention Mechanisms

| Priority | Mechanism | Specific Action | Status |
| --- | --- | --- | --- |
| P1 | 共享门禁与身份 | 历史状态进入 busy，命令读同步 ref，只有当前 controller 释放 | Done |
| P1 | 完整上下文重置 | 当前过期创建新空会话；其他能力保留但不自动激活 | Done |
| P1 | 浏览器回归 | 核对真实请求 session/branch/parent/history、草稿归属和迟到响应 | Done |
| P2 | 确定性焦点前置 | 等待历史触发器恢复焦点，再设置键盘选择 | Done |

### 4. Systematic Expansion

- 对照现有初次过期恢复、分支选择、图片处理和取消路径；不改变它们的数据格式。最终图片与分支矩阵一并复核。
- 单个控件禁用或单个资源清理不能证明会话整体一致；后续审查需核对完成后的实际 payload，而不是只观察 ID 或预览消失。

### 5. Knowledge Capture

- [x] frontend state-management 的 History Operation Ownership。
- [x] frontend quality-guidelines 的 60 场景命令、环境键、错误矩阵和焦点前置。
- [x] frontend index 同步。项目没有 `src/templates/markdown/spec` 镜像，未创建无关目录。
