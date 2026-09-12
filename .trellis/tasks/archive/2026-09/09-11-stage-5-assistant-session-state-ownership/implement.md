# 实施与验证计划

- [x] 父第 47 轮有界复现两项问题和对照，保存新任务 tracked/untracked/build 基线，完成规范、源码、请求和存储流审查。
- [x] 创建父任务下独立子任务，收敛 PRD、设计、文件边界与明确的本地验收终点。
- [x] 实际 task.py start 激活；扩展永久历史回归，旧构建首项实际 exit 1：迟到生成把已删除 capability 写回。
- [x] 加入同步 registry 归属及被接替恢复的失败终态，保留既有控制器、草稿与显式发送规则。
- [x] 验证最终 100 历史场景、分支 32、图片 48 与相关合同，lint/build、performance、smoke 21/0 通过；审查全范围并沉淀状态/质量规范。
- [x] 冻结 source/build/spec/实际 preview 响应，完整 UI 真实终局通过后再次核对；不覆盖失败结果。2026-09-12 接续确认 46/0，并对现有构建恢复预览后核对 506/172/3/47 项全部一致。
- [x] 精确白名单本地未签名提交，停止自有 preview 并确认退出/无监听/真实重绑；只归档本子任务并修正 JSONL。
- [x] 实际执行 task.py start 返回父任务；当前指针属于接续会话，进入第 48 轮评估。
- [ ] 记录 Session 与下一轮评估，清理自有一次性输入，核对原始资料与受检字节保持。

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

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-session-state-740b1880339d40009a5f534c397f7f08`。旧负向探针由父评估直接引用，所有本轮执行保存独立日志、实际 exit code 和输入 manifest。
