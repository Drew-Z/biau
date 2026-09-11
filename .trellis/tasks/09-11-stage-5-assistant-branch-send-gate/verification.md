# 验证记录

## 最终结果

- 本轮唯一一次完整 UI 真实 exit 0，46 groups / 0 failed、1527514ms，2026-09-11T00:29:55Z–00:55:24Z；包括 17 路由 × 2 视口、32 分支场景、48 图片场景及原有全部助手组，原状态页 wheel 断言也通过。
- lint 无 warning；build、三项助手合同、两项独立浏览器专项、performance 与 smoke 21/0 全部通过。当前回合没有为获得结果而改动原断言或重跑完整 UI。
- 进程结束后的 `final-validation.json` 确认 505 源文件、172 构建、3 份规范、47 个实际 preview 响应及保护快照匹配冻结版本；13 份原有资料保持，索引为空。1440 中文与 320 英文代表截图已由主会话复看。
- 自有 preview PID 35168 已按命令/父 PID/监听归属核对后停止，等待真实退出，再确认监听为 0 并实际绑定释放 5198；`preview-cleanup.json` passed。工具会话 11080 真实终局 exit 1，无剩余本轮检查或 preview。
- 待精确本地提交、仅本子任务归档、实际返回父路线图和开发 Session。下面的“尚未终局”是过程中的历史状态。

## 过程记录

- 基线 HEAD：`59759fa5915e030f619c61e587c914edc2a3bdf4`；已跟踪工作树和索引干净，13 份原有未跟踪资料保留。`baseline.json` 记录 1531 个 tracked 和 13 个 untracked 的原字节 SHA-256。
- 证据根：`C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-branch-knackD`；自有 preview 会话 11080、loopback 5198，沿用已核对的上一项最终 dist，未用归属不明的服务。
- `probe-branch-send.mjs` / `branch-send-baseline.json` 真实 exit 0：1440/320 × 两种分支动作 × Enter/按钮，8/8 复现。B 分支请求仍 pending 时，新问题以 A 分支及其旧 parent 发出；按钮 disabled=false。受控响应后 B 生效、输入已清空。只证明本地发送竞争，不等于真实服务端持久化验收；页面/外部错误和真实模型调用均为 0。
- 初始代表截图为 `baseline-320-select-enter.png` 与 `baseline-1440-continue-from-revision-button.png`。后续永久回归必须在修复前实际失败、修复后通过，并独立保存日志。
- 新增永久回归在旧构建实际 exit 1：`1440/morning/zh/select/success` 的 `Enter and form submit must not send to the old branch while a branch action is pending`，实际 1、预期 0。原始 `branch-ui-before.log` 和失败截图保留。
- 两处门禁现复用 isAssistantBusy，submitQuestion 额外读取已有 Branch pending ref；未把问题编辑投影加入通用拒绝条件，保持同事件内关闭编辑器后重发。完整 UI 仍使用原 public-assistant 组接入新专项，不增加或跳过原组。
- `lint.log` exit 0、无 warning；`build.log` exit 0，TypeScript + Vite，最终 Widget 为 `PublicAssistantWidget-BNrKwpmZ.js`，入口 `index-B5Attswi.js`。三项 API/会话/browser-state 合同均 exit 0。
- `branch-ui-after.log` 实际 exit 0、32 场景；`image-ui.log` 实际 exit 0、48 场景，模型调用均为 0。已亲自复看 320 英文与 1440 中文的 pending 截图：草稿可见、发送禁用，控制和布局保留。
- `performance.log` exit 0：CSS 152582/222755、route CSS 142027、JS 320266/430000 bytes，外部阻塞 stylesheet 0，immutable cache 配置保持。`smoke-result.json` 真实 exit 0、21/0、9627ms。
- `validation-inputs.json` 冻结 505 源文件、172 构建、3 份变更规范和 47 个实际 preview 响应，并核对原有 13 份资料及保护 SHA-256。完整 UI 已启动（会话 74422），使用独立 `full-ui.log` / `full-ui-result.json` / `full-ui/`；尚未取得终局，不修改受检源码或重建。

## 根因与防回归审查

- 根因为重复门禁漂移：共享 busy 已包含 Branch 工作，发送函数和按钮却各自列出一部分旧状态。禁用分支控件并不能阻断 textarea 的 Enter 或原生表单入口。
- 之前的分支回归覆盖失败后重试、相同操作重复提交和版本生成，缺少“另一个分支操作 pending 时发送新问题”的组合；本轮永久断言在旧构建实际失败，32 场景还核对了请求的 Branch、parent Revision、history 和草稿。
- 修复只复用已有 busy/ref，不新增状态源或网络取消逻辑。输入保持可编辑且不自动排队；成功或失败释放后仅接受新的明确命令。
- 审查保留编辑后重发在同一事件中的调用合同，未将尚未刷新的 isQuestionEditing 加入 shared submit guard。既有图片同步 ref、active chat ref、会话恢复和 warm-up 限制由 shared busy 与原 refs 保留；相关合同与专项已通过，完整 UI 仍待终局。
- 规范将该组合门禁和独立检查的命令、环境键、32 场景及错误矩阵落入 state-management / quality-guidelines，并同步 frontend index。未改测试阈值、旧 wheel 断言、业务 CSS、文案或后端。
- 最终助手完整组实际通过，包含此前待验证的编辑后重发、修订、恢复、取消及图文组合流程；末轮结论见“最终结果”。
