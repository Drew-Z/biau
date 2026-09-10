# 实施与验收顺序

- [x] 恢复父任务并完成第 28 轮完整 UI 与六项合同；记录稳定裁切基线。
- [x] 核对规范目录、远端与 worktree，运行只读工作区审计，建立唯一子任务。
- [x] 读取 frontend 目录、组件、质量规范及原 textarea/CSS/语言检查上下文。
- [x] 启动本子任务，先增加真实空提示可见性断言，在原构建取得负向失败。
- [x] 修改窄屏 CSS；运行 lint、build 和助手专项，检查 360/361 边界、短视口与长草稿。
- [x] 运行三项助手合同、smoke、完整 UI、性能和 diff 检查；保存日志、截图与文件哈希。
- [x] 按 trellis-update-spec 沉淀输入框内部文字可见性合同，按 trellis-check 完成最终范围审查。
- [ ] 以精确文件白名单本地提交；仅归档本子任务、实际回切父任务并重新评估。

## 验证命令

```powershell
npm.cmd run lint
npm.cmd run build
$env:UI_CHECK_BASE = 'http://127.0.0.1:5190'
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:public-browser-state-check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
npm.cmd run performance:check
git diff --check
```

助手专项直接调用已有导出 `checkPublicAssistantInterfaceLanguage`。保护快照期望 SHA-256：`D744AD0698C429FC3ECD33AF3CAE16911E00234C6E4D28AD30E5805BB9414909`。
