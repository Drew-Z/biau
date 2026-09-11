# 实施顺序

- [x] 核对父任务、原有资料与基线；本地浏览器 8/8 复现旧分支误发，真实模型 0。
- [x] PRD 收敛，记录用户收益、既有状态流、文件范围、成功标准与回滚点；按已有路线图授权推进。
- [x] 激活子任务，新增 32 场景的永久浏览器回归，先在旧构建得到失败。
- [x] 复用共享 busy 与同步 Branch ref 修复两处发送门禁，接入现有完整 UI 组。
- [x] 按 trellis-check 完成源码与规范核验，运行 lint/build、助手合同、图片/分支专项、performance、smoke 和完整 UI。
- [x] 复看代表截图，核对最终源/构建/原有资料与保护快照，沉淀规范并精确本地提交。
- [ ] 仅归档本子任务，实际返回父任务并更新评估；停止自有 preview、清理无用自有临时材料，记录开发 Session。

## 验证

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:public-browser-state-check
node scripts/check-public-assistant-branch-ui.mjs
node scripts/check-public-assistant-image-ui.mjs
npm.cmd run performance:check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

浏览器使用本轮独立 loopback 5198 preview 和 Temp 证据目录；失败先诊断再有限修复，不覆盖旧证据，不用旧全量代替本次新构建。
