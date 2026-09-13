# 实施与验证

## 顺序

- [x] 读取父任务协议、当前代码与既有反馈合同，完成 16 场景有界复现和基线保全。
- [x] 工作区只读审计；建立独立子任务；PRD 已按已确认问题收敛，design/implement 列明范围与边界。
- [x] 激活本子任务；按 `trellis-before-dev` 核对 frontend 规范和共享指南。
- [x] 新建专项并在未修改产品构建上确认它能捕获已复现问题。
- [x] 主会话只修改 `sendFeedback` 的菜单/焦点完成边界；接入原完整 UI。
- [x] 用事件轨迹确认完整 UI 暴露的历史检查重开竞态，补齐初始焦点等待后重跑原历史 188 场景；产品行为保持。
- [x] 按 `trellis-check` 审查全部差异；执行以下必要验证并保留每次真实终局。
- [x] 按 `trellis-update-spec` 沉淀交互归属及专项合同，冻结最终源码、构建和真实预览响应。
- [x] 通过 Phase 3.4 精确文件白名单、本地无签名工作提交；不推送。
- [x] 仅归档本子任务，校正 JSONL 引用，提交移动及父记录；实际启动父任务、增加轮次并重新评估。
- [x] 按 `trellis-finish-work` 追加 Session 138；保留旧日志原字节；核对原资料、关闭自有预览并验证端口释放。

## 必要命令

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:public-browser-state-check
npm.cmd run performance:check
$env:UI_CHECK_BASE = 'http://127.0.0.1:5198'
node scripts/check-public-assistant-feedback-ui.mjs
node scripts/check-public-assistant-history-ui.mjs
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

最终完整 UI 必须在最终冻结构建运行，并包含原图片 72、Branch 32、history 188 专项与所有既有反馈断言；不因本次范围小而省略项目门禁，也不无理由重复已通过检查。单独失败或中断保留为失败/无终局，不能拼接成通过。

## 收尾核对

基线与证据目录：`C:\Users\zhang\AppData\Local\Temp\blog-semi-assistant-feedback-7c541gfb`。提交前验证空索引、精确暂存集合、Git blob 与当前受检原字节。归档后实际 `task.py start 09-06-website-completion-roadmap`，不只改文档。原 13 份未知资料保留，复现/验收证据是交付依据；不清理旧目录或历史 worktree。
