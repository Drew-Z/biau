# 修复公开项目链接与巡检证据

状态：验收完成，待归档。用户于 2026-11-09 审阅完整方案并批准实施，代码和云端 artifact 已验证；本任务不属于网站路线图的自动循环。

## Goal

让公开项目链接的巡检失败可以准确定位和复核，区分持续不可访问、短暂故障和请求恢复，避免只得到失败总数却无法查出具体入口。

## 已确认事实

- 2026-11-08 的云端 Reliability [42471492707](https://github.com/Drew-Z/biau/actions/runs/42471492707) 为 7 项通过、1 项失败、1 项跳过；外链出现 4 个 HTTP/超时失败。旧 artifact 只有聚合结果，无法追溯是哪 4 个链接，不能用本地结果冒充这份历史名单。
- 本地初次有界复查的 46 个入口中有 6 个超时；随后三个 GitHub 入口、Spacewar II 试玩及寻球文档均 HEAD/GET 200，Legal RAG 健康入口先超时后恢复。2026-11-09 原检查器完整复验为 46/46 通过。现有证据不足以支持删除、替换网址或认定某一平台永久故障。
- 当前提交的云端 Reliability [42552071821](https://github.com/Drew-Z/biau/actions/runs/42552071821) 为 8 项通过、0 项失败、1 项跳过，外链通过；助手健康在第 3 次请求后恢复。Legal RAG 独立检查缺少 `LEGAL_RAG_API_BASE_URL`，仍为 skipped，不能计为通过。
- `scripts/check-public-links.ts:253` 覆盖重试前结果，405/501 回退前耗时也未累计；`scripts/check-reliability-suite.mjs:427` 捕获子进程输出后只汇总低敏状态，`.github/workflows/reliability-check.yml:34` 仅上传聚合报告。结果难以定位且丢失恢复过程是本任务已确认缺口。
- 结构化基线与限制见 [evidence.json](evidence.json)。Horizon 的实际 schedule / no-input 使用既有 `11-06-ai-daily-replanning` 任务记录，不并入外链实现。

## Requirements

- R1：每个检查目标能与产生检查的提交及站点入口对应；保留每次 HEAD/GET 的方法、结果、耗时和错误类别，不能用成功重试覆盖首次失败证据。
- R2：云端运行无论成功或失败，都能取得独立、有界、低敏的逐目标诊断；未完成的检查明确标记 incomplete，不从旧快照伪造本次结果。公开状态页继续只显示聚合计数与类别。
- R3：短暂失败后恢复可以通过，但需显式保留恢复事实。真实 HTTP 失败、TLS/DNS/连接错误及超时仍影响严格退出码；不把 GitHub API 可读当作网页可访问，不跳过失败链接制造全绿。
- R4：仅在有重复的失败证据和确认可用的替代入口时修正网址。当前 46 个目标全部保留；现有超时、回退和有界重试策略先保持，新增策略必须由实际证据驱动。
- R5：诊断不得包含凭据、响应正文/头、私有地址、文件系统路径或任意错误原文。默认运行不修改 `public/status/`；验证不调用聊天、embedding 或其他模型接口。

## Acceptance Criteria

- [x] AC1（R1/R2）：云端 artifact 的 46 个 targetId 全部映射到对应提交；Legal RAG 的首次超时与重试 200 均可核验。
- [x] AC2（R1/R3）：本地 HTTP fixture 验证 HEAD 成功、405/501 回退、5xx/网络失败后恢复、持续失败、TLS 不重试；恢复后仍保留首次失败，耗时包含完整检查过程。
- [x] AC3（R2/R5）：Actions 使用 `if: always()` 上传，实际成功 run 上传完整低敏诊断；失败退出/部分报告由本地真实子进程 fixture 验证，未声称观察到新的云端失败 run。公开汇总及诊断脱敏通过。
- [x] AC4（R3/R4）：相同 46 目标清单在修复后本地和 Actions 通过，分别有 2 / 1 项重试恢复；未新增 skip、改变可见性或扩大超时预算。
- [x] AC5（R5）：合同检查、独立脚本类型检查、lint/build、Site Quality 与 Cloudflare Pages 通过；9 份公开快照哈希未变，模型请求 0；恢复点和文件范围已核验。

## Out Of Scope

- 新建监控服务、定时器或通用网络网关；添加全局代理、关闭 TLS 校验、付费升级或调整外部服务部署。
- 修改 Legal RAG 源项目、开启未配置的完整业务 synthetic、解除 APK/登录/发布人工门禁。
- 自动更新公开状态快照、Horizon 模型/来源/预算调整、青珑或数据库重复治理。

## 规划边界

技术方案见 [design.md](design.md)，执行和验证顺序见 [implement.md](implement.md)；方案已审阅，`task.py start` 已完成。
