# 公开链接巡检：设计

状态：已审阅并进入实施。对应 [PRD](prd.md) R1–R5。

## 取舍与边界

本次失败已经在本地和云端恢复，现阶段修复可观测性，不猜测永久失效网址。复用现有目标投影、错误分类、状态输出和 Reliability 工作流，不增加依赖或常驻组件。

现有规则是 HEAD 首测；405/501 才 GET 回退；网络暂时故障或 5xx 最多重试一次，等待 750 ms；TLS 不重试。`shouldRetryNetworkResult` 也处理 5xx，不能误述为仅网络错误重试。极端路径 HEAD 405 → GET 503 → GET 重试最多三次请求。本次保留这些边界和现行 12 秒 CI / 20 秒独立命令默认超时，不为假定冷启动另加循环。

## 请求结果与恢复证据

`scripts/check-public-links.ts` 在目标检查中保存有序 attempts：method、status、durationMs、issueKind，以及固定 reason（initial / method-fallback / transient-retry）。最终 `ok/status/method/issueKind` 保持兼容；目标总 durationMs 使用完整墙钟耗时，覆盖回退和等待。

405/501 引起的方法回退单独标记，不直接当作服务故障。真正经过 transient-retry 后成功的项标记 recovered，保留首次失败状态。恢复不造成严格检查失败；仍失败的项维持 exit 1。公开投影的 online/degraded/offline 继续由最终通过数决定，不为新增恢复信息改动既有状态契约。

GET 在此只验证公开入口的 HTTP 可达性，不承担正文/资源完整性验证；相关页面功能继续由现有 synthetic 覆盖。实现时明确释放 response body，避免无限下载或吞掉 body 读取异常后声称正文完整。

## 两种输出

1. 现有终端 `--json` / Markdown：保留 URL 和上下文，供维护者显式运行时定位；原有字段兼容并增加 attempts。
2. 新增可选 CI 诊断文件：固定 schemaVersion、checkedAt、complete、targetCount、checkedCount、failedCount、recoveredCount 和 results。目标以规范化 URL 的 SHA-256 标识，附已知项目上下文；只输出固定枚举、布尔值、数值和必要的静态标签。

CI 文件不保存完整 URL、重定向目的 URL、响应内容/头、错误 message 或主机路径。定位时从 artifact 的 sourceRevision（run head SHA）调用 `collectTargets()`，重新计算 targetId 即可映射到原始入口。这个哈希只作标识，不宣称匿名化；清单本来就是已公开的站点链接。上下文仅提取本站已知 projectIds，不投影自由文本。

## Reliability 与产物生命周期

- 链接 CLI 接受显式 `--diagnostics-file`；suite 接受显式 `--diagnostics-dir`。仅允许系统/runner 临时目录内的输出，不能指向仓库源码或公开快照；使用既有原子写入 helper，不实现另一套文件存储。
- 默认不开启额外写入。CI 将目录设在 `$RUNNER_TEMP`；suite 向链接子进程传入受控文件名，不把诊断混入 stdout JSON 或 `public/status`。
- 开始写 `complete=false`；每完成一个目标原子保存已完成结果，全部结束后标记 true。若中途崩溃/步骤超时，保留部分结果且 suite 失败；诊断不存在时上传警告，不从历史文件回填。
- `.github/workflows/reliability-check.yml` 的上传步骤使用 `if: always()`，同时上传现有聚合结果和诊断目录，保留 7 天。每次运行独立目录，记录仅属于本次 run。
- 默认 suite 仍只使用并清理自己的临时状态投影；调用者显式指定的诊断目录交给 runner 生命周期或本轮任务清理。失败不可改变公开快照。

## 影响文件

- `scripts/check-public-links.ts`：attempts、恢复计数、显式诊断输出。
- `scripts/check-reliability-suite.mjs`：传递输出目录，保持低敏聚合与严格退出码。
- `.github/workflows/reliability-check.yml`：诊断上传与必要合同检查。
- 检查脚本、`package.json`：增加有意义的 HTTP 行为测试和调用入口；尽量复用现有 projection/report fixtures。
- `docs/observability.md` 或对应既有运行说明、`.trellis/spec/frontend/project-showcase-integration.md`：记录取证及低敏边界；实际路径先搜索确认。
- `src/data/` 只在新证据证明确切失效且替代入口已验证时改动；当前方案不需调整。

## 验证与限制

断网/本地 HTTP fixture 覆盖失败分类、回退、有限重试、恢复不抹证据、部分报告及公开脱敏；Actions 验证真实网络和 artifact 完整性。单轮通过只说明该时刻可访问，不证明第三方长期可用。

历史失败 run 只有聚合结果，无法通过新代码补回其 URL 或首次失败细节；本任务保留该证据缺口，不编造历史根因。若新诊断发现真实坏链，再按 R4 做小范围修复，不扩散到其他仓库或基础设施。

## 回退

业务代码修改前状态以干净 Git 提交及文件路径登记；未提交文件按用户集中备份规则保存。本次规划的恢复组已建立，位置见 implement。代码回退限定本任务补丁，诊断产物可停用；不重写 Git 历史、不删除旧 worktree 或修改公开内容分支。
