# 实施与验证计划

- [x] 读取父路线图、当前 Widget、相关 API/browser-state 与 frontend 规范；保存 1539 tracked / 13 untracked / 172 build 基线；本地 4/4 复现旧会话误发。
- [x] 创建独立子任务并完成 PRD 收敛、设计与 owned/forbidden 边界；常规启动由父路线图授权覆盖。
- [x] 先增加独立永久历史操作检查，保留原构建实际失败；核验删除当前会话与在途生成交互。
- [x] 加入历史操作 busy / 同步 pending gate 与取消释放，最小必要修复；接入原 public-assistant 完整组。
- [x] 新发现的当前过期混用上下文先加入永久负向回归，再修复恢复失败分支；扩充为 60 场景，使用独立最终日志重新完成必要验证。
- [x] 按 `trellis-check` 审查实现和草稿/会话边界，运行专项与基础门禁；按 `trellis-update-spec` 沉淀状态与检查合同。
- [x] 冻结最终 source / build / spec / preview 响应，唯一一次完整 UI 实际 exit 0、46/0，随后 `final-validation.json` 核对通过；所有真实失败单独保留。
- [ ] 核对精确暂存白名单并本地未签名提交；停止自有 preview、确认进程退出/无监听/实际端口重绑；只归档本子任务、修正 JSONL 引用。
- [ ] 实际 `task.py start 09-06-website-completion-roadmap` 返回父任务，追加 Session 和新评估，清理自有一次性临时文件，原证据/旧资料保持。

## 验证入口

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:public-browser-state-check
$env:UI_CHECK_BASE = 'http://127.0.0.1:5198'
node scripts/check-public-assistant-history-ui.mjs
node scripts/check-public-assistant-branch-ui.mjs
node scripts/check-public-assistant-image-ui.mjs
npm.cmd run performance:check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

所有入口与终局 exit code 保存到本任务系统临时证据目录；完整 UI 不跳组、不放宽已有断言、不访问真实模型。
