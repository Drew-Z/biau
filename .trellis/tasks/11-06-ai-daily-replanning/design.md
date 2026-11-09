# AI 日报：Horizon 接入设计

状态：已上线，首版验收证据已齐备。2026-11-09 已确认修复后的实际早晚 schedule 成功，七来源空输入时正常跳过且保留旧刊，两个生产域读取与正文哈希通过，详见 [schedule-validation.md](schedule-validation.md)。合格新刊的云端自动发布与七源/渠道 2 验证见 [channel-2-paced-validation.md](channel-2-paced-validation.md)，初始发布历史见 [release.md](release.md)。以下分阶段决策保留为历史；现行产品决定以 [prd.md](prd.md) 为准，当前运行合同见 [运行说明](../../../docs/ai-daily-horizon.md)。

## 渠道选择修订（2026-11-07）

当前候选支持渠道 2 主用、渠道 1 显式备用，整组选择且无自动跨渠道重发；本地可显式使用现有系统代理，检查点绑定渠道 ID/端点哈希/模型。用户已授权切换，但整期验证未通过，生产仍沿用原配置。具体实测与边界以 [channel-2-selection.md](channel-2-selection.md) 和运行说明为准，以下原三项配置描述保留为首期设计历史。

2026-11-08 修订：确认本站对完整 JSON 代码块的误拒绝后，采用严格去除单层代码块再做原生字段校验。渠道 2 候选为 Gemini Lite，渠道 1 保留 DeepSeek；哈希绑定模型映射，发布时复核实际组/模型。评分和摘要统一间隔 10 秒，429 始终硬停并仅保留有界安全诊断。7 次完整响应后的第 8 次 429 尚待后台原因；当前节奏未真实验证，生产未切换，详见 [channel-2-compatibility.md](channel-2-compatibility.md)。

## 架构与职责

```text
GitHub Actions（早晚启动；首期验收后启用）
  -> 固定版本 Horizon / 独立 Python + uv 运行环境
  -> 原生 skill helper：采集 -> 评分 -> 筛选 -> 中文摘要 -> Markdown
  -> 薄适配：预算与阶段检查 -> 期次封装 -> 原子发布
  -> 当前仓库独立内容分支 codex/ai-daily-content
  -> Cloudflare Pages 同源只读 Function -> /ai-daily 列表与整期阅读
```

Horizon 固定为 `d7406f738c711df82b8f060fa1d5e9999d36cca0`，保留 MIT 声明。主仓库只维护配置、版本锁与薄适配，runner 临时目录提供上游运行环境；不复制维护上游采集/生成核心，也不新增常驻 Python 服务。

选择内容分支复用已有 GitHub 权限和可恢复历史，省去新建内容服务与数据库。该分支只含公开的完整期刊及索引，不含主站构建产物、原始运行目录或 secrets。上线前确认 Cloudflare 的分支部署规则排除此分支；不依赖 Actions cache 保存权威历史。

## 配置、来源与模型

- 以 `tech-news` 配置 AI 相关范围，首版保留中文摘要，缩减非必要背景、影响分析与外部搜索。使用上游 profile 覆盖机制；具体字段在离线阶段按锁定版本验证，不改核心。
- 既有来源 manifest 是来源白名单起点，不代表当日可访问。先接入可用 RSS，再以已有中文 Google News/GDELT 采集能力补充；第一轮样稿采用小子集，常规配置在验收后扩展至确认的范围。
- 使用 OpenAI-compatible Chat Completions 协议和 Horizon `provider=openai`。用户清理后已填写新渠道，当前模型与其选择一致为 `deepseek-v4.1-flash`。历史证据见 [first-live-trial.md](first-live-trial.md)；目录可读、后台计费、客户端收到完整新闻正文是不同阶段，需分别记录。
- 本地渠道集中在 `.env.local` 顶部三项 `HORIZON_*`；显式存在但留空时停止，不逐字段回退到博客配置。整组三项均不存在时才兼容原 fast 组。`config.json` 只存固定模型等非敏感策略，真实生成前须与所选模型一致。
- base URL 与 key 通过运行环境/GitHub Secrets 注入临时配置，主仓库只保留变量名和占位值。生成作业不获得内容发布写权限；发布作业只消费校验后的公开产物。
- 首轮 `ai.languages=["zh"]`，分析与 enrichment 并发均为 1；不配置 provider chain 或跨渠道 fallback。不能照搬上游双语、并发 5、max_items=null 的 Actions 示例。
- 在本地 SDK factory 处复用 `chat.completions.stream()` 和最终聚合，保持 Horizon 接收完整响应，不修改锁定上游源码。60 秒涵盖打开与读取整个流；必须有 stop 终态和合法 JSON object。错误或不完整输出恢复为原生不可重试错误。具体诊断、用量未知状态及 1 MiB 响应界限见运行说明。
- 先用原生 `validate_config`、操作签名和 fixture 做离线检查；不运行 minimal-completion、ping、doctor --live 等测活。

## 原生调用与预算控制

调用 `skills/horizon/scripts/horizon_ops.py`；参数使用 `--params-file`，运行目录显式使用 `--runs-root`。该 helper 直接调用原生服务，不需要启动 MCP server。

首轮及常规任务均使用阶段接口，在 `fetch_items` 后、`score_items` 前核对实际数量。超出本次批准输入上限时停止，不偷偷截断来源或扩大成本。然后复用 `score_items -> filter_items -> enrich_items -> generate_summary`，读取原生 stage/meta，不另写新闻处理算法。已知完整配置也可用 `run_pipeline`，但其一次性运行不提供采集后的预算暂停点，首版不以它绕过此检查。

成本随评分输入数、入选条数、重试和工具循环变化。`digest.max_items=15` 仅限制精选/后续 enrichment；Markdown 渲染本身是程序化操作。离线阶段需核对锁定版本的每项调用、SDK 重试和工具上限，形成首次业务运行预算，再请求该次真实生成授权；只设 job timeout 不能宣称硬金额上限。生产预算在首期验收前固定，超限/限流立即停止，不自动重跑整期生成。

## 条目隔离修订

用户已批准的 [隔离与恢复合同](item-isolation.md) 更新发布检查。采集仍必须完整；模型阶段按单项调用原生服务并保存产物，失败记录与完整成功项分离。配置哈希绑定阈值；发布端再次核验数量、完成比例和遗漏说明，禁止失败项进入最终原生 summary。思考参数和渠道保持现行设置。

## 发布前检查

只有全部满足以下条件才封装为可发布期刊：

1. 明确的 run_id、配置版本、时间窗口和完整的采集报告；所有已启用源采集成功，实际输入非空。首版对部分源失败保守拒绝整期，记录缺口；未来容错策略另作调整。
2. 原始输入分别计入成功评分或明确隔离失败，至少 50% 完成；筛选结果非空，不降低评分标准凑数。
3. 入选项分别计入完整摘要或明确隔离失败，至少 50% 完成且至少 1 条。只把完整项传入原生摘要，要求 `source_stage=enriched`、`language=zh`、使用条数匹配；达到整期中止阈值时拒绝发布。
4. 每项保留有效 HTTP(S) 原始来源，完整 Markdown 文件非空且在大小限制内，期次/时间/哈希通过校验。源发布时间不可得时保留未知，不从展示文字反推精确 ISO 时间。
5. 内容来源及正文安全检查通过，不含凭据、私有路径或原始错误响应；首期另由用户审阅事实、中文表达、AI 相关性与覆盖。

上游 `run_pipeline` 在 enrichment 全失败时仍可能返回 filtered 摘要；exit 0、`ok:true` 或“有 Markdown”均不代表可发布。失败产物不能更新 public index。

完整采集的空输入、完整评分后的空筛选为正常 `skipped`，附 `no-input` / `no-qualified-items` 原因；没有 bundle，也不调用后续模型。采集缺口、损坏产物与超预算仍报错。Actions 只对 `generated` 执行 preview，只有 preview 成功才上传和发布；运行摘要保存数量、实际请求与用量覆盖，不将空结果归为模型渠道失败。

## 期次、时间与历史

- cron 为 `17 0 * * *` 与 `17 12 * * *`，对应上海 08:17 / 20:17，以事件中的 schedule 区分早晚，期次 `scheduledFor` 保留 08:00 / 20:00。错开整点降低 GitHub 高负载风险；创建时间不得早于触发分钟，跨槽截止仍为下一期次锚点。Actions 可能延迟/跳过，公开仓库长时间无活动可能暂停 schedule；界面不承诺准点完成。
- `editionId=YYYY-MM-DD-morning|evening` 的日期以 Asia/Shanghai 为准。计划时段、实际开始、生成完成、首次发布分别记录；手动补跑需显式指定期次。
- 使用定时事件的 cron、workflow run 创建时间与实际开始时间识别计划槽位；如果延迟导致无法可靠确定期次或已经跨过下一槽位，则停止并使用显式手动补跑，不能仅按进程当前小时猜早晚刊。同一期已存在时自动运行跳过生成。
- 已观测晚报 cron 延迟至上海次日 01:45 才创建 run。以 cron 对应锚点和创建时间定位最近一次锚点，允许晚报跨午夜但必须早于次日 08:00；创建早于当次 :17 触发分钟或执行时已跨下一槽位仍拒绝。不能把上海日历换日误当成跨期。
- 单一 concurrency group 串行运行，`cancel-in-progress=false`；发布前再次检查最新内容分支，禁止旧任务把最新指针倒退。
- 原生 `horizon-{date}-{lang}.md` 使用 UTC 日期，同日重跑会覆盖。直接读取 run-specific `summary_path` 保存早晚独立版本，不能把 `TZ` 设置当作修复上游 UTC 代码。
- 回看实际采集开始前 24 小时，保存原生 `meta.since` 和真实开始时间。history_search 是历史 Markdown 的 BM25 查询，不是跨期去重账本；首版允许窗口重叠产生少量重复。
- 若启用 history_search，从已持久化期刊恢复最近摘要到上游要求的 summaries 目录，同 UTC 日期只恢复最新一份；本站仍保留两个版次。首版可以不启用此工具，无需建立新的历史索引。

## 最小公开契约

`index.json` 仅含 schemaVersion、最新 editionId 和按期次排序的摘要索引。每期保存小 JSON 元数据和原样 Markdown；正文不拆成旧 Flash DTO。

| 字段 | 语义 |
| --- | --- |
| schemaVersion / editionId | 独立的期刊契约版本、稳定期次 ID |
| editionDate / slot / timezone | 上海日期、morning/evening、Asia/Shanghai |
| title / language / itemCount | 期刊标题、zh、实际条数 |
| scheduledFor / generatedAt / publishedAt | 计划时刻、真实生成完成、首次公开时刻；均含时区 |
| windowStart / windowEnd | 本次实际采集窗口 |
| sourceLinks | 从原生入选阶段取得的来源名称/原文 URL，不靠抓取 Markdown 标题重建新闻对象 |
| markdownPath / contentSha256 | 受控相对文件路径与正文校验值 |
| revision / updatedAt | 内容修正版本与真实修正时间；正常读取不更改 |

来源自身发布时间留在 Markdown/原生可用字段中；没有明确日期的消息不能伪装为当日新增。内部 run_id、配置哈希、引擎版本和用量留在运营记录，用户页面只展示对阅读有用的信息。不存在 `approvedAt`，自动发布不伪造人工批准。

## 原子发布与读取

- 不可变产物路径含 editionId 和正文哈希。元数据、Markdown 与新索引在一个 Git commit 中更新，以非强推方式推进内容分支；冲突重新读取后处理，禁止覆盖别的发布。
- 同期同内容重试为 no-op。自动任务不能替换已发布期次；纠错显式产生新 revision，保留旧文件与原 publishedAt。索引只指向完整验证的文件。
- 发布重试只重试同一已生成产物，不重新调用模型；上传中断不推进索引。Actions artifact/cache 只能中转，不能代替内容分支持久化。
- 同源 API 使用固定仓库/分支，仅允许索引和符合期次/哈希规则的路径，设置超时与响应大小限制；不接受任意代理 URL。先校验结构与哈希，再返回给浏览器。
- index 缓存短、不可变正文缓存长，建议最新索引缓存 5 分钟。读取失败可保留已验证的缓存/页面内容；冷启动且没有缓存时明确报错，不能保证上游故障期间任何新访客都有旧内容。
- 生成失败时持久索引保持最后成功期刊，超过 18 小时未更新显示延迟提示。既无成功期刊时显示真实空状态。

## 本站展示与兼容

沿用 `/ai-daily` 和详情路由。列表按日期/早晚展示期刊，详情显示完整正文、目录、引用、更新时间与原文入口。界面文案改为“AI 汇编，原文见来源”；保留纠错/撤回操作的可追溯记录。旧 publicId 若有历史内容继续走旧读取分支，不把旧链接误解析成新期次。

已安装 `markdown-to-jsx`，优先复用依赖与项目链接组件。助手渲染器目前禁用 raw HTML 并将链接变为 span，不能直接用于日报引用。实施时为日报增加受限渲染策略：只允许所需文本、列表、链接、目录 anchor 和 details/summary，阻断 script/iframe/事件属性/危险 URL；若现有库无法可靠做到，再增加成熟 sanitizer，不自制 Markdown parser 或直接注入原始 HTML。

旧 Studio、数据库和 migrations 保留；其生成/Cron/Feed 开关不因接入 Horizon 打开。部署时版本化新读契约并同步旧“逐条人工批准”文案、readiness 和 manual gates，保留历史失败证据。新内容不强行转成 BlogPost 或加入公开助手知识库。

## 启用与恢复

离线适配默认关闭自动任务；完成有界首期生成后，只展示本地样稿供用户验收，不把未验收内容传入公开分支。首期通过后按用户已选策略配置 Secrets、发布首期、切换阅读入口并启用早晚自动更新，无需后续逐期审批。线上 Secret 传递和部署状态需实际验证。

失败时保留最后成功期刊；暂停只关闭 schedule/自动发布开关。纠错以新 revision 或撤回记录处理。应用回滚复用上一部署/功能开关，内容恢复只回退索引至有效版本，不删除历史文件、旧数据库或其他任务成果。
