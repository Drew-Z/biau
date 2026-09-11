# 实施与验证顺序

- [x] 读取父路线图、inline 工作流和 frontend 组件/状态/质量规范，核对规范目录、Git/worktree、原有资料并保存原字节基线。
- [x] 受控旧预览复现两个缺陷，4/4，真实模型 0；建立有范围的子任务并完成 PRD 收敛。
- [x] 激活子任务，新增浏览器回归；同一新断言先在旧实现失败。
- [x] 为图片准备增加当前身份与会话检查，统一既有清空路径，并在提交入口阻断未完成选图。
- [x] 按 trellis-check 审查实现与需求，然后运行 lint、build、助手 API/会话/browser-state 合同、图片专项、performance、smoke 和完整 UI；不以旧全量结果代替新源码验证。
- [x] 完整验证结束后复核源码/构建/保护快照及原有资料；阅读代表截图。
- [x] 按 trellis-update-spec 沉淀生命周期合同，运行差异和必要文档检查，以精确白名单执行 Phase 3.4 本地提交（无签名/推送）。
- [x] 按 trellis-finish-work 仅归档本子任务，修正 JSONL 归档引用，实际 task.py start 返回父任务并更新评估。
- [x] 停止本轮自有 5198 preview，清理无后续用途的自有临时材料，保留原始正/负证据与全部旧资料。
- [x] 记录开发 Session，核对只追加本轮日志并完成最终 Git/资源检查。

## 验证入口

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:public-browser-state-check
node scripts/check-public-assistant-image-ui.mjs
npm.cmd run performance:check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

浏览器命令由本轮自有 preview 提供当前 dist，设置 `UI_CHECK_BASE` 为该 loopback origin；所有证据存入本轮 Temp。范围变化或失败先保留诊断、更新设计，再进行有依据的修复；不跳过失败或降低断言。
