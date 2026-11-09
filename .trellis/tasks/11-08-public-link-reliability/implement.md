# 公开链接巡检：实施计划

状态：验收完成，待归档。修复 `27db69bc` 与 Horizon 验收 `85ee2b6d` 已推送，实际云端诊断已通过。

## 已完成的准备

- [x] 复用规范仓库并核对远端/worktree；执行工作区只读审计。
- [x] 复核 46 个公开目标、历史 CI artifact、失败项 HEAD/GET、GitHub 公共仓库/路径及 Render 已批准工作区的服务状态。
- [x] 原检查器本地 46/46 通过；当前云端 Reliability 为 8 passed / 0 failed / 1 skipped，单独缺配置的 Legal RAG 仍跳过。
- [x] 归纳已确认缺口：逐目标证据未上传，重试覆盖首次失败，回退耗时未保留；不把波动当作网址失效。
- [x] 收敛 PRD、设计与此执行计划；inline 模式不需要派发代理或填充实现代理上下文。
- [x] 用户审阅具体方案并选择“按方案进入实施”，已激活本任务。

## 执行顺序

1. 按 `trellis-before-dev` 读取相关规范、当前分支和准确修改文件；复核用户/其他会话差异。登记干净 Git 基线，必要时补同组实体恢复点。
2. 保持现行 URL 清单与请求预算，增加有序 attempts、方法回退/故障恢复标记和正确总耗时。先让本地 HTTP fixture 证明持续失败与恢复两条路径。
3. 添加可选临时诊断输出，并将它从链接检查传递至 Reliability 和 Actions artifact；确保聚合 JSON 的 stdout、低敏公开状态和失败退出码兼容。
4. 验证中断仅产生 incomplete 部分报告，失效路径不能被当作成功；核对 artifact 不含 URL、响应原文/头、凭据或私有路径。
5. 运行下面的最小合同集及 lint/build。之后复验同一公开清单及 Actions，按新诊断决定是否存在需要修正的具体入口。
6. 记录真实运行 SHA、计数、首次失败/恢复、artifact 与剩余限制；更新 spec/运行说明，精确提交本任务文件。按项目已授权流程成功提交后显式推送 main 并核对 CI。
7. 清理本轮明确创建且无后续用途的临时文件；列出保留项，完成任务记录。Horizon 单独接续原任务。

## 验证矩阵

| 场景 | 预期行为 |
| --- | --- |
| HEAD 200 | 一次请求成功，无伪造恢复 |
| HEAD 405/501 → GET 200 | 保留两次 attempt，标明方法兼容回退 |
| HEAD 503 → HEAD 200；网络错误 → 成功 | 最多一次重试，保留原始失败，recovered=true，总耗时完整 |
| 持续 503/超时；TLS 错误；404/403/429 | 按现有策略严格失败，不增添无依据重试或 skip |
| 检查中断 / 不完整 artifact | 只呈现本次完成部分，complete=false，suite 不得成功 |
| 成功及失败路径 | `public/status/*.json` 哈希不变，stdout 为有效汇总 JSON |
| 脱敏与定位 | CI artifact 无敏感原文；targetId 可从对应 SHA 的投影还原定位 |

```powershell
npm.cmd run public-links:projection-check
npm.cmd run public-links:diagnostics-check
npm.cmd run reliability:report-check
npm.cmd run status:contract
npm.cmd run verification:diagnostics-check
npm.cmd run lint
npm.cmd run build
# 真实读取，仅访问既有公开入口，不写 public/status，不调用模型。
npm.cmd run public-links:check -- --json --timeout 12000
```

如果改动 `src/data/`，补对应项目注册/展示证据检查。云端失败需要分析 artifact，而非反复无差别重跑。既有跳过项及人工发布门禁不计为本任务通过。

## 恢复与文件卫生

- 规划基线：`D:/workspace4Cursor/blog-semi`，提交 `71a47187b7142e24aa897797eda32ca80c65926d`。它包含另一会话刚完成的青珑发布记录，原样保留。
- 集中恢复组：`D:/Agent/codex/backups/tasks/20261109T031137452Z-public-link-reliability/manifest.json`。已有 PRD 脚手架实体 SHA-256 校验通过；新 design/implement/evidence 记录原不存在。继续复用该组，不旁置备份。
- 本轮诊断临时目录：`C:/Users/zhang/AppData/Local/Temp/biau-link-reliability-92QEJQ`。必要低敏证据及原始文件哈希已合并到两个任务的 evidence；核对精确范围、无重解析点后，已删除本轮 6 份临时 JSON、2 个 artifact 子目录和根临时目录。
- 原有 ` .trellis/`、`undefined/`、UI/青珑任务资料、未跟踪图标/vendor、脏 journal 索引和旧 worktree 保留。

## 规划验证

2026-11-09：已完整复读 PRD 并完成需求/设计/验收映射；本任务及 Horizon 续作共 9 份文档/JSON、37 处相对链接和尾随空格检查通过，两个 Trellis 任务上下文校验及 `git diff --check` 通过。Horizon 结构化证据核对了两个 schedule、一次只采集运行、七个来源计数、旧内容分支及两域正文哈希。

规划阶段仅修改资料，未改业务代码或运行本地应用 lint/build。下面的实施验证独立记录，不能用规划阶段旧检查替代。

集中恢复组复核：本任务 1 份实体基线、Horizon 既有组 12 份实体基线的 SHA-256 全部匹配。两个 manifest 已记录本轮状态与验证边界，未覆盖既有基线。

## 实施与本地验证（2026-11-09）

- [x] 保留有序 attempts、fallbackUsed / recovered，累计完整墙钟耗时；现有 405/501 回退、最多一次网络/5xx 重试、TLS 不重试和退出码保持。
- [x] GET 在收到状态后释放正文，不无限下载；CI 低敏诊断只投影 targetId、已知 projectIds、sourceRevision、固定结果和计数。
- [x] 原子保存逐目标进度，未完成报告 complete=false；suite 显式传递临时输出，防止重用目录上传旧文件；Actions always 上传两种报告。
- [x] 本地 HTTP 故障与套件集成检查通过，涵盖 200/403/404/405/429/501/503、连接重置、超时、TLS、恢复耗时、流正文释放、未完成快照、成功/失败/跳过诊断与公开投影不变。
- [x] lint、build、外链投影、状态合同、通用诊断与可观测性文档检查通过。脚本另用 TypeScript `--ignoreConfig --noEmit --types node,vite/client` 检查通过，避免前端 build 未包含 scripts 的盲点。
- [x] 9 份 `public/status` 文件 SHA-256 与修改前完全一致；模型调用 0，无链接删除/替换。
- [x] 提交并推送后读取真实 Actions artifact，确认来源提交、46 个目标映射与低敏边界；持续网络失败如实保留。

本地修复后首次实际探测 46/46 通过，其中 1 项 transient-retry 恢复；第二次有 3 项网络失败、exit 1，诊断完整保存计数。两次结果不能推出长期可用性。第二轮临时材料已清理时未留逐目标摘要，因此不编造失败 URL，后续有界复核将保留正式低敏产物。

## 云端验收与交付

- 最后一轮本地读取为 46/46 通过、2 项超时后恢复；完整低敏结果保存在 evidence 的 implementation.localDiagnostics。
- [Reliability 42561442476](https://github.com/Drew-Z/biau/actions/runs/42561442476) 对提交 `85ee2b6da7152278e938ecd53411eac6c3ffbcb8` 为 8 passed / 0 failed / 1 skipped；外链 46/46 通过，Legal RAG 健康入口首次 12 秒超时、重试约 10.3 秒得到 200。该入口可达性与缺配置而跳过的 Legal RAG 独立业务检查分开记录。
- artifact `13649347813` 同时包含 reliability-report 和 public-links 诊断；sourceRevision、46 个 targetId、计数/attempts、完整标记和脱敏均通过核对。完整诊断与下载文件 SHA-256 已保存在 evidence。
- [Site Quality 42560970271](https://github.com/Drew-Z/biau/actions/runs/42560970271) 和 Cloudflare Pages `ee3af167-bc3a-4059-a70e-ec38322e3787` 均 success。
- 失败上传路径由 workflow `if: always()` 与本地真实 CLI 失败用例覆盖；本次 live cloud run 成功，未为了验收制造线上失败。
- 只修复巡检取证与恢复记录，没有修改公开入口网址或发布状态快照，也没有改变外部服务或模型策略。历史波动的根因未证实，长期可用性继续由既有定时巡检观察。
