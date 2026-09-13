# 实施与验收

- [x] 恢复父任务和当前 HEAD，核对 507 source / 172 build / 3 spec 与前项验收一致；保存 1583 tracked 和原 13 untracked 基线。
- [x] 确认原目录焦点线索已有历史核验；完成原生链接有效探针 6 个问题场景与 3 个正常对照，保留两次探针观测失败。
- [x] 完成工作区只读审计、规范目录/远端/worktree 核对；建立唯一子任务并收敛 PRD、design 和 implement。
- [x] 激活子任务并按 trellis-before-dev 复核相关规范。
- [x] 主会话新增专项；先对旧构建确认真实失败，再加组件入口守卫和原完整 UI 接入。
- [x] 按 trellis-check 审查所有差异，执行必要验证并保留终局、截图和输入清单。
- [x] 按 trellis-update-spec 沉淀合同，精确本地无签名工作提交，不推送。
- [x] 只归档本子任务；校正引用并提交移动，实际返回父任务并重新评估。
- [x] 追加 Session 139，保持旧日志和原资料；关闭自有预览、核对端口与最终受检字节。

## 命令

```powershell
npm.cmd run lint
npm.cmd run build
$env:UI_CHECK_BASE = 'http://127.0.0.1:5198'
node scripts/check-reading-guide-links-ui.mjs
npm.cmd run performance:check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-reading-reassessment-amv2iduv`。preview 为本轮创建、工具会话 93100 / PID 7396 / 端口 5198；回收前重新核对完整进程身份，不能只凭 PID 停止。

提交前检查空索引、精确文件集合、Git blob 与工作树原字节。归档后必须执行 `task.py start 09-06-website-completion-roadmap`。不归档父任务、原持续任务或历史成果；不删除归属不明材料，不将本地 waiting 记成 scheduler 已暂停。

六项检查均已完成，`final-checks.json` 汇总实际终局；`final-validation.json` 于 2026-09-13T07:53:09Z 核对 508 source / 4 spec / 172 build / 49 实际 HTTP 响应与冻结一致。组件只增加入口守卫一行，完整 UI 只增加 import 和调用两行，旧断言保持；专项无新增依赖、共享监听或产品调试输出。三份规范已同步原生事件所有权、新页就绪和 about:blank 存储边界，进入 Phase 3.4 精确本地提交。

工作提交 `0f7002118c80c86d4f946039d48e54b633f9d7a7`、归档提交 `4efc946a376ce60a4d092f71a32fb9c3ee6ab2c9` 已完成。已实际返回父任务并完成第 53 轮评估，36/36 子任务 completed；Session 139 已追加，原 journal 的 74267 bytes 前缀与 index 的 138 条历史行、CRLF 和 EOF 保持。自有预览已关闭并验证端口释放；没有删除文件，证据和原资料保留。最后记录提交后执行 `verify-inputs.py closeout`，将最终 HEAD 与同一受检输入再次绑定，不重复已通过的长测试。
