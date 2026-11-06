# 选型与接入证据

核验日期：2026-11-06。结论用于规划，不代表候选已经运行验收。Horizon 是用户确认的首版选择，本文件保留候选比较与取舍，后续不再以继续选型阻塞接入。

## 候选比较

| 候选与出处 | 核验结果 | 本次取舍 |
| --- | --- | --- |
| [Horizon](https://github.com/Thysrael/Horizon) | MIT LICENSE 已读取；Python/uv；RSS、HN、GitHub、Reddit、Telegram、GDELT、Google News 等来源；profile 分析、筛选、摘要；原生 skill 与 Markdown/Pages 输出 | 用户已选。独立运行，本站消费整期内容；来源和 AI 相关范围仍需配置 |
| [TrendRadar](https://github.com/sansan0/TrendRadar) | 元数据/仓库声明 GPL-3.0；中文热榜与 RSS、增量、HTML、SQLite、通知、Docker；Actions 模板含试用/签到机制 | 中文覆盖备选。GPL 不等于禁止使用或部署，但分发/修改义务及长期运行方式须按实际集成评估；首版不引入第二引擎 |
| [NewsPrism](https://github.com/moguiyu/NewsPrism) | 元数据标识 MIT；综合新闻、多源聚类、影响评估、中文摘要、HTML、SQLite、Docker | 配置与运行面较大，不作为本次首版 |
| [PrismFlowAgent](https://github.com/justlovemaki/PrismFlowAgent) | 元数据标识 GPL-3.0；全栈新闻工作台、工作流、审计和多渠道发布 | 与本站后台重复较多，首版不引入。旧 [CloudFlare-AI-Insight-Daily](https://github.com/justlovemaki/CloudFlare-AI-Insight-Daily) README 已指向此后端，不能继续把旧仓库当独立当前引擎 |
| [HotDaily skill](https://github.com/Done-0/hotdaily-skill) | 薄只读 API 客户端，有日报/趋势/详情/证据；README 声明 MIT，GitHub license 字段为 null，未独立核验许可文件 | 可作外部资讯对照，仓库不提供独立生产引擎；第三方内容许可/可用性仍需单独确认 |
| [AI Daily Digest](https://github.com/vigorX777/ai-daily-digest) | 90 个技术博客 RSS、Bun/TypeScript skill、评分摘要，支持 Gemini/OpenAI-compatible；GitHub license 字段为 null | 偏技术精选，行业广度与本次定位不同；许可证需进一步核验，暂不采用 |

除 Horizon 固定源码与 LICENSE 外，候选能力主要来自 README、skill 和 GitHub API 元数据；未逐一部署或审计完整实现。许可元数据为 null 不证明不存在许可证，也不构成可随意复制的依据。

## Horizon 固定依据

- 仓库：[Thysrael/Horizon](https://github.com/Thysrael/Horizon)。
- 核验提交：[d7406f738c711df82b8f060fa1d5e9999d36cca0](https://github.com/Thysrael/Horizon/commit/d7406f738c711df82b8f060fa1d5e9999d36cca0)，GitHub 分支响应的提交时间为 2026-11-03T17:20:10Z。
- tree：`45a2c356363a74da43ec8d43638f29982157dc7e`。
- 许可：[LICENSE](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/LICENSE)，MIT，Copyright 2026 Thysrael。
- 证据索引 [evidence.json](evidence.json) 保存来源 URL、抓取响应哈希、关键原文、符号和核验限制；未保留庞大的原始响应或带临时签名的图片链接。

| 证据 | 符号/文件与结论 |
| --- | --- |
| H1：存储 | [src/storage/manager.py](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/storage/manager.py) 的 `save_daily_summary` 使用 `horizon-{date}-{language}.md`；同日同语种会覆盖。配置保存默认有本地 .bak 行为，实施时必须服从集中备份规则 |
| H2：原生分阶段服务 | [src/mcp/service.py](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/mcp/service.py) 的 fetch/score/filter/enrich/generate_summary/run_pipeline 返回阶段计数与状态；生成日期采用 UTC；提供 run-specific summary_path |
| H3：降级风险 | 同文件 `run_pipeline` 默认 stage_for_summary=filtered，只有 enrichment 非 failure 才切至 enriched；因此 helper 成功返回不等于内容完整。评分还需检查 unscored，来源失败需检查 fetch_report |
| H4：Markdown | [src/ai/summarizer.py](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/ai/summarizer.py) 是程序化 Markdown 渲染，含原文链接、来源、可用发布时间、目录 anchor、details/summary 引用。发布时间展示缺年份/时区，不能重新解析成可信 ISO |
| H5：配置 | [src/models.py](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/models.py) 支持 provider=openai、base_url、api_key_env、单并发与语言列表；digest.max_items 是精选限制，不是所有模型调用上限 |
| H6：profile | [profiles/tech-news/profile.json](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/profiles/tech-news/profile.json) 含 summary/background/impact/community_discussion；部分块使用 history_search/web_search。它不是专属 AI 新闻 profile |
| H7：skill | [skills/horizon/SKILL.md](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/skills/horizon/SKILL.md) 及 [pipeline.md](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/skills/horizon/references/pipeline.md) 提供本地 helper 和 params-file。无需启动 MCP server。本文仅研究，未安装或执行该 skill |
| H8：上游日程 | 研究时读取的 `.github/workflows/daily-summary.yml.disabled` 是禁用示例，cron 实际为 `0 23 * * *`，不能采用不一致注释；Docker Compose 是一次性运行，不是常驻调度器 |
| H9：历史 | 研究时读取的 `src/processing/history.py` 用历史 Markdown 做 BM25 搜索，并不提供跨批次已发布事件账本；普通主分支材料在实施前按锁定提交复核 |

原生 helper 可复用 `validate_config`、`--describe`、`fetch_items`、`score_items`、`filter_items`、`enrich_items`、`generate_summary`、`get_run_meta`、`get_run_stage`、`get_run_summary`。不要另造同等 pipeline，也不要把上游建议的 minimal completion 测活自动当作本站授权。

## 部署资料

- [GitHub schedule 官方说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)：可能延迟或丢弃，默认分支运行，公开仓库长时间无活动可能停用。当前文档含可选 IANA 时区；本方案采用 UTC cron 与上海期次计算，避免依赖特定示例注释。
- [Cloudflare Pages CI 上传官方说明](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)：可用 Wrangler 上传静态产物。已作为备选核验；本方案选择内容分支 + 既有同源 Functions，不新增独立 Pages 站。
- 本轮 GitHub 元数据只读核验：当前项目为公开仓库、默认 main、has_pages=false。没有创建分支、修改 Secrets、部署或启用任何 schedule。
- 公开内容分支是本次设计建议，不是 Horizon 自带特性；原子发布、分支权限、同源读取和 Cloudflare preview 排除规则仍需实施验证。

## 本地基线（保留原始锚点）

下列行号是本轮规划核验时的定位快照；历史记录不当作当前线上实测：

- `.trellis/tasks/07-17-ai-daily-production-pipeline/prd.md:5-10,45-52,84-100,110-175`：旧滚动快讯/深读、采集补漏、聚类、生成和发布范围。
- `docs/studio-ai-daily-production-readiness.md:7-12,25-47,51-70`：Studio-first、已有能力/合同检查、审核导出和 Feed 门禁。
- `docs/studio-ai-daily-production-readiness.md:13-15`：2026-08-18 attempt 16 限流失败、无公开内容及当时关闭状态。
- `.trellis/tasks/07-17-ai-daily-production-operations/task.json:29`：旧首版、审核/导出、Feed/Cron 与封存验收待续。
- `.agents/skills/blog-content-pipeline/references/templates.md:32-39`：AI 日报证据、日期与栏目内容要求；自动发布新决定优先于旧逐篇流程。
- `server/data/ai-daily-source-manifest.v1.json`：33 个来源，18 个 enabled；18 RSS 中 14 enabled，15 OFFICIAL_PAGE 中 4 enabled。RSS 候选包括 OpenAI、Google AI、DeepMind、AWS ML、MS Research、NVIDIA、GitHub changelog、Meta engineering、Alizila、Red Hat、CNCF、Kubernetes、CMU、MIT Technology Review；启用配置不代表实时健康。
- `src/utils/aiDailyPublicApi.ts:27,34,162-184`：旧 DTO/decoder 依赖 approvedAt、factSummary、whyItMatters 和 citations，不能用于冒充新期刊人工批准。
- `src/data/aiDailyInterfaceCopy.ts:58` 与 `src/pages/AiDailyPublicPage.tsx:114,190`：旧公开文案和卡片展示人工批准时间，需要随新契约更新。
- `package.json:166` 与 `src/components/PublicAssistantMessageContent.tsx:73-84`：已安装 markdown-to-jsx；现有助手禁用 raw HTML 并把链接变为 span。可复用依赖，不能直接照搬助手策略。

| 既有能力 | 新方案处理 |
| --- | --- |
| 路由、主题、响应式、语言与 Markdown 依赖 | 复用 |
| 来源 manifest 的已启用 RSS | 核对健康/使用边界后映射配置 |
| 公开读取、列表/详情和界面文案 | 调整为期刊契约，保留旧 ID 兼容 |
| Studio、数据库/migrations、失败与批准记录 | 保留历史，原开关不自动启用 |
| 旧三角色、完整生产 runner、滚动快讯与深读 | 不作为首版前置；后续仅凭明确缺口再评估 |
| 青珑桌宠等现有工作区改动 | 保留，不并入本任务 |

## 研究过程与限制

通过 smart-search 的 search/fetch 获取候选与一手源码，GitHub CLI 读取当前仓库元数据，使用本地代码搜索核对消费契约。两次 search 使用研究模型；这不属于日报生成，`aiDailyGenerationModelCalls=0`。一次 Exa 查询因未配置 EXA_API_KEY 失败，未修改配置，改用已有检索能力。

早期搜索综合文本曾给出错误许可证/仓库关联，已由实际 README、API 和 LICENSE 纠正，不以综合文本作为定论。抓取工具对源码有缩进/转义加工，因此只提取符号和关键原文，不将抓取响应直接当源码执行。实施时从锁定提交取得真实源码并验证。

尚未验证：当前来源完整可用性、模型协议/摘要质量、常规配置的成本与时长、GitHub Secrets、内容分支实际权限/发布、Cloudflare 分支排除、Markdown 安全策略与线上读取。它们在 implement.md 中有对应阶段；不把研究资料充当生产通过证据。
