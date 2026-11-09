# Horizon 日报来源覆盖评估

日期：2026-11-07。模式：Codex 证据评估，model channel: none，真实模型请求 0。用户同意先推进来源覆盖评估；本次不改已验收的自动发布配置。原始可复核的数量、公开 URL、响应哈希与上游符号依据见 [source-coverage-evidence.json](source-coverage-evidence.json)。

## 结论与实施顺序

继续复用 Horizon，不引入第二个新闻引擎或通用网关。推荐分三步扩展：

1. **先验证 7 源组合**：现有 OpenAI、Google AI、DeepMind，加 Microsoft Research、NVIDIA Developer、GitHub Copilot Changelog、MIT Technology Review AI。补齐研究、工具更新、基础设施和产业报道。本地原生 24 小时采集成功，8 条输入；保留 20 输入/5 成稿/60 请求预算，先验证新来源的评分和归因，再更新发布配置。
2. **再接中文媒体**：量子位公开 RSS 可用，但摘要太短；复用 Horizon 原生 Trafilatura 抽取正文。5 篇样本提取成功，组合采集中的 8 篇也取得 473–5,112 字正文。必须补上“指定要正文的源，提取失败不得退回标题/短摘要继续生成”的检查，再做内容验证。7 源加量子位的另一时刻原生采集为 16 条，不代表长期一定低于 20 条。
3. **开源项目用原生 GitHub Releases**：vLLM、Transformers、SGLang 均可由固定版本的采集器读取，不自写 GitHub 爬虫。需扩展本站当前只接受 RSS 的完整性检查、来源数量预算计算和发布者映射；保留预发布/候选版本信息。先选少量项目，不抓全 GitHub 热榜。

两份配置候选已保存且通过原生 `validate_config` 和无模型 `fetch_items`：

- [7 源候选](source-expansion.candidate.json)
- [8 源中文候选](source-expansion-chinese.candidate.json)

**它们是任务资料，不是当前运行配置。** 当前 `scripts/horizon/config.json`、`budget.json`、profiles、publication gate 与 GitHub Secrets/Variables 没有改变。候选不能直接复制后只更新验收 hash：来源、正文检查、内容质量和新 source cap 必须一起验证。

## 本次实测

固定 Horizon commit `d7406f738c711df82b8f060fa1d5e9999d36cca0`，Python 3.12 / uv frozen，先验源码与锁哈希。使用原生采集器，HTTP timeout 20 秒，RSS 探索并发最多 3；没有评分、摘要、模型测活或发布调用。

| 组合 | 本次 24 小时输入 | 返回的近 7 天记录 | 可见记录内最大滚动 24 小时数量 |
| --- | ---: | ---: | ---: |
| 当前 3 源 | 1 | 29 | 9 |
| 推荐 7 源 | 8 | 61 | 18 |
| 7 源 + 量子位，第一组快照求和 | 13 | 71 | 22 |

RSS 快照于北京时间约 11:14 开始，附加源快照约 11:35 开始。随后约 11:39，原生整组合采集分别得到 7 源 8 条、8 源 16 条，均无 URL 合并减少；后者含新出现的量子位条目。两次时刻不同，不能把 13 与 16 当作同次结果。

滚动窗按 `(end-24h, end]`、end 取返回条目时间计算。**只覆盖各 feed 此刻保留的条目，不是完整七天历史，也不是未来峰值保证**：部分 feed 只保留 10/20 条。数字都是待评分输入，不能说成合格新闻量。

## 来源选择

| 来源 | 24h / 近7d可见条数 | 发现与建议 |
| --- | --- | --- |
| OpenAI / Google AI / DeepMind | 1/25、0/2、0/2 | 当前基线可读；不能用一次低产量断言模型或采集器不可用 |
| Microsoft Research | 0/2 | 有研究正文，适合补研究/Agent；也含播客与观点，继续评分筛选 |
| NVIDIA Developer | 2/13 | 有约 550 字摘要，覆盖推理、基础设施和开源模型应用；性能数据保留厂商声称属性 |
| GitHub Copilot Changelog | 4/9 | 直接分类 RSS 可读，含完整更新说明；优于全部 GitHub Changelog 的非 AI 杂项。小幅指标/管理功能仍可能低分 |
| MIT Technology Review AI | 1/8 | 有正文与署名，可补产业、政策和独立报道；含 Insights 商业内容，不能把其内容视为 MIT 学术研究或原厂公告 |
| 量子位 | 首测5/10；组合复测8条24h | 中文产业覆盖明确，但 RSS 7–40 字、含会议推广/企业稿；只有带正文、标明“据量子位报道”且能区分传闻/厂商声称时才考虑生产 |
| AWS ML | 8/20 | 可读但本次输入占比大，既有发布也有系列教程/客户案例；暂不整源启用，避免挤满有限输入预算 |
| Google Cloud AI | 1/6 | 可读，AI 分类仍出现客户案例等相邻内容；先保留备选，避免继续偏向 Google |
| IBM Research | 1/4 | 本次可见内容以量子、传感器等为主，AI 边界较宽；暂缓 |
| Apple ML Research | 0/1 | 可读、低频研究，适合作后续研究补充，不作为提高每天快讯数量的主力 |
| Hugging Face Blog | 1/8 | 8 条近期 RSS 均无正文，混官方/组织/社区作者；未实现作者白名单与正文检查前暂缓 |
| Meta Engineering / Red Hat AI | 0/1、0/3 | 可读但此次补足快讯的贡献小，保留备选 |
| CNCF / Kubernetes / CMU ML | 1/4、0/0、0/0 | 可读但范围宽或低频；CMU feed 最新为 8 月，不把“可访问”当“近期有更新” |
| Alizila | 403 | 本地不可用；不加入要求所有源成功的生产组合，不能把一次 403 推断为永久失效 |
| 机器之心候选 `/rss`、`/feed` | 最终200但不可解析 | 返回页面而非合法 RSS；不新增针对网页布局的自研采集器 |
| 雷锋网 `/feed` | ReadTimeout | 本次超时，保留未通过状态；没有反复重试或替换源冒充通过 |
| Qwen 旧博客 `index.xml` | 404 | 候选地址无效，不宣称 Qwen 没有官方发布渠道 |

旧清单的 18 个 RSS 中，17 个原生读取成功（包括正常空结果），1 个 403。此前 disabled/hold 的来源仅作只读评估，没有修改其旧审核状态或启用它们。

## 为什么不直接打开 Google News / GDELT / 全量 RSS

- **Google News**：原生配置有效，最多 10 条的试查返回 10 条，其中 9 条在严格 24h 内。原生代码使用约 25h 的 `when:` 参数，且不逐条执行截止时间检查；不能直接声称全部结果符合本站 24h 窗口。条目保留 `news.google.com/rss/articles/...` 聚合 URL，正文只是标题式描述（本次 18–41 字），publisher 位于 `metadata.source_name`。本站目前从 `feed_name`/host 投影来源，直接启用会把聚合平台误当出版者。需要原文解析、证据正文和时间检查，当前先用明确 RSS。
- **GDELT**：本次请求 429，未重试。源码把 `seendate` 映射为 published_at，`content=None`；需要区分收录时间与原文发布时间，并补正文，不能把索引发现当作新报道证据。
- **全量 RSS**：本站保守要求全部源成功；加入不稳定源会使整期停止。Horizon RSS 没有每源条数上限，`digest.max_items` 是评分之后的结果限制，不是评分输入限制。全开旧来源既会遇到 403，又可能超过 20 条；不应通过静默截断、降低阈值或无限增加预算掩盖问题。

## 可以直接复用的上游能力与薄适配缺口

固定提交源码依据：

- [`RSSSourceConfig`](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/models.py#L300)：`content_extractor`、`category`、`profile` 已有；没有 per-feed limit。
- [`RSSScraper._fetch_feed`](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/scrapers/rss.py#L66)：可调用原生 extractor；失败返回空时保留原 RSS 内容。采集成功不能证明正文抽取成功。
- [`TrafilaturaExtractor.extract`](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/extractors/trafilatura.py#L28)：已有正文提取和安全请求，无需新增依赖或模型；错误返回 None，需要薄检查记录。
- [`GitHubScraper._fetch_repo_releases`](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/scrapers/github.py#L158)：原生取得 tag、body、published_at、prerelease。vLLM Atom 的正式版本只有 12 字内容，另有 rc3；API 可得明确 tag 和发行说明，比直接消费 Atom 更适合。注意本次 rc3 的 API prerelease=false，不能只凭该布尔值把 rc 宣称为稳定版。
- [`GoogleNewsScraper`](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/scrapers/google_news.py)、[`GDELTScraper`](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/scrapers/gdelt.py)：已有发现能力，但发现条目与可发布证据的差异需处理。
- [`HorizonPipelineService.fetch_items`](https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/mcp/service.py#L311)：已经提供跨来源 URL 合并、运行 artifact 与 fetch_report，可继续复用。

本站需要的工作仅限边界：

1. 按启用来源类别验证 fetch_report，不再硬编码只允许一个 `RSS Feeds`；maxSources 计算应包含非 RSS，未知类别拒绝。GitHub token 只注入生成作业，保持权限最小化。
2. 为要求正文的源记录提取成功/失败；失败不应被原生 RSS fallback 掩盖。使用真实提取状态，不把“字符多”当作事实正确或正文完整的证明。
3. 补齐媒体/社区/厂商来源归因规则，过滤广告、旧闻、传闻和无实质更新。不要将第三方转载当作一手性能验证，不按标题补写缺失数字。
4. 保留 60 请求、20 分钟、60 秒单请求、2,048 output tokens、评分线6、最多5条成稿。若中文+开源组合经持续观测超过20输入，先选择更精准源或给出明确的新输入额度再实施；不偷偷截断。
5. 新来源真实样稿内容核对、云端采集可达性与失败回归通过后，再同步 config/source cap、验收 hash 与文档；普通后续合格刊仍自动发布，不新增逐期批准流程。

## 验证边界与恢复

本轮使用原生 `validate_config(check_env=False)`、`fetch_items`，并禁止模型方法和任何非 GET HTTP。7 源和 8 源试采都通过当前完整 RSS/20输入检查；这不等于当前 runner 的 maxSources=3 已允许这些候选，也不等于评分/成稿/云端/长期稳定性验收。候选文件都不包含私有渠道地址、密钥或渠道覆盖。

中文搜索发现命令因 ZHIPU_API_KEY 和 EXA_API_KEY 未配置而失败，已改用已知公开 URL、原生采集器与 `smart-search fetch` 核验；未改本地凭据。网页阅读确认量子位为版权媒体，候选只计划短摘要与来源链接，原文章全文不进入公开仓库。Hugging Face 页面明确有社区/组织作者，不按域名假定官方。

本次仅新增评估与候选资料，并同步原任务记录；不需要重新运行无变更的全站 UI/build。JSON、链接、原生配置/采集和任务校验为对应验证。原任务保持 in_progress，AC12 仍待实际 schedule 与新合格一期自动发布。正式运行继续使用已验收 3 源，后续正常周期无需再次批准。

收尾复核通过：结构化证据与五份原始评估结果一致，组合条数和滚动窗峰值可重新计算；候选除来源及中文提取器外与现行配置一致，生产配置哈希仍为 `0f9231b71a223c0277067ab772a997e879ea397220a9ecf7cb4e12f5f07f88ea`。JSON、文件链接、敏感值扫描、Trellis 上下文与差异检查通过。本轮临时源码、依赖、全文响应和脚本已清理，恢复提交与交付物保留。
