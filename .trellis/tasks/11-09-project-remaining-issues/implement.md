# 实施计划

状态：in_progress。用户已审阅 [PRD](prd.md) 和 [设计](design.md)，并回复“继续”批准实施。inline 主会话负责实现、最终验证，不派实现/检查子代理。

## 准备进度

- [x] 原仓库/远端/worktree 审计、任务状态与规范索引读取。
- [x] 云端失败 artifact、46/46 映射、两 GitHub HEAD/GET 与一次 Legal health 复核。
- [x] ERP/Xunqiu 无配置的真实 CLI 反例已复现。
- [x] 用户确定巡检覆盖与只读范围，历史任务关系已核对。
- [x] 规划 JSON、12 个本地链接、Trellis 与敏感扫描通过；12 个实体恢复文件哈希一致、9 份公开快照未变。4 个临时 JSON 和 2 个目录已清理，证据已保存。
- [x] 审阅具体方案并激活实施。

## 执行顺序

1. 重读 Git 状态和当前任务，加载 `trellis-before-dev` 的 backend observability/quality/logging 与相关 showcase 合同。逐文件登记恢复点；本任务恢复组复用，已有 dirty 文件不自动 stage。
2. 扩展 report fixture 无配置反例，确认旧版错误计 passed，再实现 coverage、来源、skip 原因与失败优先；保持外链检测策略。
3. 增加 Legal 模式解析和 readonly 早返回。本地 HTTP fixture 注入伪凭据、auth-disabled、already-authenticated 响应，断言仅 GET health；业务选项仅在夹具走原流程。同步状态合同。
4. suite 强制 readonly；CI 绑定公开 variable 并接专项。同步 monitoring/observability 文档与规范，避免并行助手文件。
5. 跑下面相关验证、核对公共快照哈希、记录真实结果。精确提交并按 main 约定推送。
6. 重读 GitHub 变量，从已有公开 health URL 推导 base，仅设置本次新增的 variable。触发一次 Reliability，读取低敏 artifact 验证 readonly 和覆盖语义。
7. 外部失败如实保留，不反复重跑。`trellis-check` 核对最终改动/证据；清理本轮临时文件、记录 journal、归档本任务。其他旧任务保留。

## 验证矩阵

| 场景 | 预期 |
| --- | --- |
| ERP/Xunqiu 无 base，其他 7 step 显式 skip | 0 passed / 0 failed / 9 skipped，各 current coverage=0/3，快照不变 |
| 全 online、online+unchecked、全 unchecked/planned | complete+passed、partial+passed、none+skipped，数量守恒 |
| 当前失败而旧快照成功、崩溃、坏 JSON、空数组、未知状态 | failed 优先，不借旧证据或无覆盖跳过 |
| 缺 env / 手动 skip | source=previous/none；历史 online 不计当前覆盖 |
| 默认/显式 readonly，带/不带凭据、不同 auth 状态 | 一次 GET health，无 auth/login/seed/query/review/quality |
| health 200、503、坏 JSON、慢响应、超体积 | 固定有界结果、3 项保护检查 unchecked，零自动重试 |
| 两模式冲突 | 请求前失败 |
| 显式 business（仅 loopback） | 原成功、登录失败与 seed失败流程仍可用 |
| 新报告/旧无 checkMode 快照 | 合同兼容；readonly 不能 open-demo |
| 默认脚本/suite/fixture | 9 份公开快照哈希不变，日志无 URL/原始异常/凭据 |

## 验证命令

```powershell
npm.cmd run legal-rag:read-only-check
npm.cmd run reliability:report-check
npm.cmd run status:contract
npm.cmd run verification:diagnostics-check
npm.cmd run public-links:diagnostics-check
npm.cmd run docs:observability-check
npm.cmd run docs:manual-gates-check
npm.cmd run lint
npm.cmd run build
git diff --check
```

`legal-rag:read-only-check` 在实施时新增，当前尚不存在。所有业务测试只访问 loopback，不运行真实 `--business-checks`。UI 未改，不重复完整浏览器回归；Site Quality 按既有 CI 执行。

## 恢复与资料

- 恢复组：`$CODEX_HOME/backups/tasks/20261109T101644173Z-project-remaining-issues/`，manifest 已登记脚手架、未存在文件与 SHA-256，不另建同级备份。
- Git 基线：`98ea0b489187ebaccbea52a11cb791e3921ae24f`；实施前重查，不能假定其他文件仍干净。
- [evidence.json](evidence.json) 保存当前证据与公开快照基线；临时下载确认内容/哈希已保存后按精确路径清理。未知历史目录保留。
- 回滚先处理新增 CI 配置再恢复本任务文件，防止旧业务默认路径被新配置触发。

## 实施验证进度

- 已完成覆盖统计、Legal 默认只读与显式业务模式、CI 变量绑定和操作说明。
- 回归测试先复现旧版 2 passed 误报，再验证为 0 passed / 0 failed / 9 skipped。
- 七项合同检查、lint、build、YAML 绑定校验及 diff 检查通过；9 份公开快照不变。
- 只同步既有状态页操作提示；布局和交互未改，不重复全量浏览器回归，Site Quality 继续执行既有 smoke。
- 等待精确提交、推送与一次云端只读复验。
