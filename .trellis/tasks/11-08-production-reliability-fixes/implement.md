# 实施顺序

1. 已读取会话、任务及后端规范，确认 canonical repo/remote/worktrees，执行工作区只读审计；基线 `bfebfddd`。
2. 集中恢复组 `20261107T211553803Z-production-reliability-fixes` 记录已核验 Git 基线与拟改文件；新任务原不存在。
3. 修复 suite JSON 输出与 Actions artifact，增加成功/失败本地 HTTP 回归，执行 diagnostics、lint、build 和 diff 检查。
4. 独立提交巡检改动、推送并运行无模型 Reliability workflow，取得真实失败原因；有应用修复时追加对应回归。
5. 升级已核实兼容依赖，运行 audit、Prisma generate/validate、server build/smoke、public contracts、前端 build/UI smoke；审查并提交锁文件。
6. 修复知识同步与部署协调，验证未变、变化、过期/损坏、拒绝权限和有界等待。生产同步只在确实需要且授权范围内执行。
7. 按 trellis-check 复核完整交付，沉淀 spec/运维记录、提交推送并核对 CI/线上结果。
8. 清理仅本轮创建的临时资源；保留原有脏文件。P2/P3、日报 schedule 与桌宠按既有任务续作，不能提前标记完成。

## 检查与交付记录

真实模型调用预算为 0；只读健康检查不代表生成质量验收。

### 巡检报告修复

- JSON 输出与 CI 精确 artifact 路径已实现；失败继续保留 exit 1。
- 本地真实 CLI + loopback fixture 覆盖健康 200、503 和生成报告前崩溃；三个场景均验证公共快照字节不变，模型调用 0。
- verification diagnostics、lint、build、workflow YAML 解析、任务上下文校验与 diff 检查通过。公开助手、桌宠等产品代码未修改；没有把本机 build 视为远端验收。
- 已按 trellis-check 审查，并把运行报告/历史投影边界写入 observability spec；下一步提交并取得云端诊断。
