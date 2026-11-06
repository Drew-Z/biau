# Horizon 离线实施验证（2026-11-06）

以下是离线阶段历史记录；最新真实试跑与本地配置整理结果见文末及 [first-live-trial.md](first-live-trial.md)。

正式实现：

- `src/data/aiDailyEditions.ts`、`aiDailyEditionCopy.ts`；`src/utils/aiDailyEditionsApi.ts`；`src/hooks/useDailyEditionResource.ts`。
- `src/pages/AiDailyEditionsPage.tsx`、`AiDailyEditionPage.tsx`，现有 `AiDailyPublicPage.tsx` / `AiDailyPublicDetailPage.tsx` 路由适配；`src/components/AiDailyMarkdown.tsx`；`src/styles/ai-daily-editions.css`。
- `functions/_shared/aiDailyEditions.ts`、`functions/api/ai-daily/index.ts`、`functions/api/ai-daily/editions/[editionId].ts`。
- `scripts/horizon/` 的固定版本、配置、AI profile、预算、运行/发布/离线原生检查；`.github/workflows/ai-daily-horizon.yml`。
- 期刊合同/原子 Git 发布/UI 检查脚本及 fixture，`package.json`、`.env.example`、部署/运营/code-spec 和旧任务接续。

| 验证 | 结果与范围 |
| --- | --- |
| Horizon 原生 validate + helper describe | 通过；固定源码/uv.lock，原生操作与配置有效，0 模型请求 |
| Horizon check.py | 通过；断网环境执行原生五阶段，fixture 2 次请求；验证 429 停止、60 次上限、输入与时间限制 |
| ai-daily:editions-check | 通过；早晚独立、旧期补发、幂等/修正、失败 gate、API 缓存/错误/大小/哈希、Markdown 标签/URL |
| 临时 Git 实验 | 通过；内容分支仅 5 个公开文件、同内容不重复、并发 non-fast-forward 拒绝、主站分支与用户未提交内容保留 |
| ai-daily:editions-ui | 24 组通过；320/390/430/1440 × morning/nature/stellar × zh/en；刷新失败留旧、语言切换不重载正文、持久化、坏哈希拒绝、原文/目录/details、阅读列宽 |
| lint / build | 通过；TypeScript 与 Vite 正常 |
| Functions + publisher 单独 tsc | 通过；`--ignoreConfig --types node --lib ES2023,DOM` |
| blog:check | 通过 |
| ai-daily:public-payload-check / public-feed-check | 通过；保留旧 DTO/服务契约 |
| docs:deployment-check / manual-gates-check | 通过 |
| Actions YAML / permissions | 本地解析通过；生成 read、发布 write；未运行远端工作流 |
| Trellis task validate / git diff --check | 通过 |
| npm run verify | 未全通过：旧 `ai-daily:production-readiness-check` 拒绝本地验收记录的评估/回滚绑定、未完成首期/Studio/导出/部署。此前 lint、server build/smoke、Cloudflare 代理、站点 build/performance、博客/文档检查通过 |
| npm run check:ui | 44 组中 43 组通过；旧 AI 日报列表/详情与阅读通过。失败为公开助手 `430/en/reload-1` 等待 `#public-assistant-input` 超时；未归因为日报或掩盖该结果 |
| 只读真实 RSS 采集 | 首次完整性失败（保守停止、0 模型请求）；补充脱敏失败诊断后二次采集成功，OpenAI/Google AI/DeepMind 三源，共 4 条合并输入；未评分/生成 |

配置哈希：`a3518d657d18c16e3cca475cacd6093c38ba84788179dabfba465a3cbda4a558`。实际采集内容会随时间变化，4 条仅代表本次采集，首次模型试跑需重新检查输入上限。

截图为本地 fixture，不是真实新闻：[桌面](ai-daily-morning-1440.png)、[移动端](ai-daily-stellar-390.png)。移动截图的英文 UI 由语言持久化用例保留，正文仍为中文。主会话已视觉核验最终布局。

发布状态：3 个启用开关默认关闭；`publication.json.enabled=false`；未读取真实模型响应、未发送模型/搜索测活、未上传样稿、未修改 Secrets/生产配置、未提交/推送。首期试跑和实际内容验收仍待完成，任务保持 in_progress。

清理：临时上游源码/虚拟环境、fixture 原生 runs、临时 Git 仓库与本轮 pycache 已删除，测试预览已停止；截图和正式交付物保留。未知旧目录和其他任务改动未删除。恢复点和精确范围见 [recovery.md](recovery.md)。

## 真实试跑与渠道整理（最新）

- 三路 RSS 真实采集成功，共 4 条输入。原 fast 报 `AIProviderUnavailableError`；用户批准使用指定渠道其他模型后，`deepseek-v4.1-flash` / `glm-5.3-flash` 均在首条评分达到 60 秒超时。无 bundle、样稿或可进行的首期内容验收；无返回 usage 不代表零费用。
- 原生断网五阶段与回归检查通过：HTTP 401/429/503、连接/超时的诊断与停止；较低请求上限生效；显式空/不完整 Horizon 配置不借用 fast 值且在网络前拒绝。真实模型调用为 0 的标记仅针对这些断网测试。
- `ai-daily:editions-check` 再次通过；包括真实临时 Git 仓库的原子发布、幂等、冲突拒绝与工作树保护。`lint`、`build`、`blog:check` 通过。
- 配置整理后 `blog:model status/doctor --all` 正确显示三档未配置，temperature 分别为 0.65 / 0.2 / 0.35；doctor 明确为离线，无请求。未把预期缺配置报告冒充模型可用。
- `.env.local` 重写为空白填写模板，保留 UTF-8 无 BOM / LF 与原文件 ACL；源文件和集中备份 SHA-256 匹配，备份使用受保护 ACL。清理后的本地配置仅保留 Horizon 三项与可选博客三档，删除 legacy/备用字段，不读取其他旧配置自动恢复。
- 当前配置哈希 `a838c90dda31b0afc8818aee4a38b0d76a757f0d3a70150c0c3f07760368bcde`；首期 gate 关闭。全量 verify / 全站 UI 的旧限制仍以表中历史结果为准，本轮未声称全站全绿。

## 2026-11-07 524 诊断修正

用户新渠道目录可读、RSS 完整。DeepSeek / GLM Flash 新闻评分各收到一次 HTTP 524；用户后台日志显示较晚产生 token 与费用，判断改为响应交付问题，具体网关层未确认。MiniMax 的 402 不能直接归结为余额不足。额外两次短诊断属越出原范围的执行失误，已披露且停止，详见 first-live-trial.md。

原生断网检查通过，包含 524 固定类别、一次发送后停止及私密错误不外泄；期刊合同和临时 Git 原子发布检查通过。仅 Python 错误分类和模型配置变化，本轮未重复已通过的 UI/lint/build。配置哈希恢复为 `7c705454df829974566f011860cdeb9c19e5e65862d5f55d11af5331a69eed8d`；无样稿、未发布。

## 2026-11-07 SDK 流式与首份样稿（最新）

- `scripts/horizon/check.py` 通过：真实网络被阻断，原生 fetch/score/filter/enrich/summary 成功；UTF-8/SSE 分片、心跳、缺 usage、无终态、截断、流内错误、无效 JSON、响应大小、取消、等待响应头/首片段/中途读取 deadline、ID 脱敏与停止后无额外请求通过。
- 保留原生 400 参数兼容；评分和 enrichment 各新建 provider client，所以各自最多一次温度兼容调整，该 fixture 预期共 4 HTTP 而非 3，均纳入计数。初次检查的预期计数错误已修正，后续完整回归通过。
- `npm run lint`、`npm run build`、`npm run ai-daily:editions-check`（含原子发布/幂等/冲突）、Trellis JSONL、差异空白检查通过。全站 verify/UI 既有结果没有被替换或声称全绿。
- 10 次获准真实新闻请求全部成功，均返回 usage，3 轮产生本地样稿；前两版因 RSS 缺失信息推断未通过内容审核，最终 profile 修正后的 1 条样稿与官方原文一致。此事实核对不替代用户首期验收。
- 最终配置 hash `0f9231b71a223c0277067ab772a997e879ea397220a9ecf7cb4e12f5f07f88ea`，`final-preview` 封装通过。发布 gate 关闭，无 Secrets/远端写入/提交/推送。
- 恢复组沿用既有目录并重新核验；评分和成稿 profile 新增修改前快照，原始基线不覆盖。正式样稿、失败初稿、脱敏运行记录保留；本轮临时上游环境和网页抓取共 8,544 个文件已删除，清理前确认仅本任务临时目录、无 reparse point 或运行进程。既有未知目录、构建缓存、用户截图保留。
