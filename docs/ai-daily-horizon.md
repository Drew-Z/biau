# Horizon AI 行业早晚刊

本链路复用 [Thysrael/Horizon](https://github.com/Thysrael/Horizon/tree/d7406f738c711df82b8f060fa1d5e9999d36cca0)。源码不入本站，运行目录使用固定提交与其 `uv.lock`；Python 3.12、uv 0.11.3。`scripts/horizon/upstream.json` 保存版本和源码/依赖哈希，启动时拒绝版本漂移。许可见 [Horizon attribution](./horizon-license.txt)。

2026-11-07 用户接受最终首期样稿，首期与网站已上线，早晚自动更新已启用；执行状态见 [上线记录](../.trellis/tasks/11-06-ai-daily-replanning/release.md)。接入 SDK 流式聚合后，当前 DeepSeek 渠道的 10 次真实新闻调用均完成，单次 3.719–7.860 秒；最终从 2 条输入筛选出 1 条中文快讯。原文核对发现前两版把 RSS 信息缺失误写成原文未披露，已调整评分/摘要 profile，最终稿消除了此推断。此结果证明本次链路成功，不证明长期可靠性或广泛覆盖。此前 524 的具体故障层仍未确认；记录见 [首期试跑记录](../.trellis/tasks/11-06-ai-daily-replanning/first-live-trial.md)。

## 首版自动运行配置和预算

- 来源：已在旧 manifest 启用的 OpenAI News、Google AI Blog、Google DeepMind Blog RSS；读取实际采集开始前 24 小时。上线前检查可达性和摘要使用边界。
- 采集后最多 20 条去重输入，超过则停止，不自动截取或扩大预算；全部源成功且输入非空才能评分。
- 完整采集但没有输入时返回 `outcome=skipped / reason=no-input`；所有输入评分完成但无达标项时返回 `skipped / no-qualified-items`。两者退出码为 0、不写 bundle、不调用后续模型、不更新公开索引；部分源失败、计数不一致、超预算和模型错误仍退出码 1。正常空结果不能诊断为渠道故障。
- 明确指定 `ai-news` profile，避免额外分类调用；复用 Horizon URL 去重和评分筛选，关闭 AI 主题去重及搜索/history 工具。
- RSS 可能只包含导语；评分 summary/reason 也只是模型判断。不能据此断言原文未公布方法、结果或价格。快讯允许 1–3 句，只写来源支持的事实，不为凑句数添加“尚未明确”。首期需核对原文，prompt 约束不等于事实正确的自动保证。
- 最多 5 条中文成稿，单评分并发、单摘要并发。`digest.max_items` 不是请求预算。首版自动运行沿用通过验收的 3 个来源和该上限；15 条及更广来源属于后续覆盖扩展，须验证后调整配置。
- 当前模型与用户本地填写一致，为 `deepseek-v4.1-flash`，OpenAI-compatible Chat Completions。用户已授权新填渠道的所有模型；短请求能返回不代表完整新闻生成链路已通过。当前不配置自动跨渠道 fallback，业务验证使用真实新闻，不使用 ping、空 prompt 或测活替代内容任务。
- 整个运行最多 **60 次实际模型 HTTP 请求**（评分、格式修复、兼容重试合计）；单请求输入最多 24,000 个字符，输出参数最多 2,048 tokens；60 秒单请求、20 分钟总时限、SDK retries=0。达到请求/时间预算立即停止。输入字符上限不等于精确 token 计费，模型实际计费与思考 token 规则未知，不承诺金额上限。
- 无重试正常路径最多 20 次评分 + 5 次中文摘要 = 25 次。上游评分每项最多 3 次尝试，每次最多一次修复；摘要最多一次格式修复且每次调用有内部重试。适配层在实际 HTTP 发送前计数，60 次总预算覆盖这些路径。400/422 仅保留上游有限兼容行为；401/403/429/5xx/传输失败立即停止，无整期自动重跑。
- HTTP SDK 会把 transport 的异常包装成连接异常；适配层恢复 Horizon 的 `AIProviderUnavailableError`，避免上游将预算/限流停止信号当作普通项错误继续重试。
- 模型请求使用已有 SDK 的 `chat.completions.stream()` 聚合，保留 Horizon 完整响应接口和原生业务校验；不改上游源码或自写 SSE parser。每请求 60 秒覆盖响应头、完整流读取与最终聚合，响应字节最多 1 MiB；要求单 choice、`finish_reason=stop`、非空且可解析的 JSON object，拒绝 refusal/tool call、无终态 EOF、截断输出和流内错误。原生评分/摘要仍校验具体业务字段。
- 失败输出含阶段、实际发送尝试数、经过秒数、固定类别、可得 HTTP 状态和请求级 `attempts`。每个 attempt 仅含安全的关联 ID、响应头/首片段/完成耗时、结束原因、已返回 token 和结果类别；只保留特定格式的 `x-request-id` / `cf-ray` 值，不输出任意响应头、地址、凭据或正文。这些诊断只留在本地运行记录，不投影到公开期刊。
- `usageCoverage` 明确区分 `reportedRequests` 与 `unknownRequests`；未返回 usage 就是未知用量，不能将原生累计零值解释为零费用。HTTP 524 单独标记为 `provider-edge-timeout`，网关可能已经转发并继续计费，禁止自动重试；流内错误、无终态、无效 JSON 和超时同样停止。400/422 的原生有限参数兼容尝试继续计入预算。`--request-limit` 只允许调低本次请求上限，不能增加配置预算。

配置为 `scripts/horizon/config.json`、`budget.json`、`profiles/ai-news/`；`publication.json` 初始 `enabled=false`。配置哈希由这组文件的相对路径和内容计算（UTF-8/LF），Python 与 TypeScript 共用相同算法。

## 本地操作

先在受控临时目录取得固定源码并安装锁定依赖。不要在工作区另建 Horizon clone。以下 `$horizonRoot` 是该临时源码路径，`$taskTemp` 是本轮明确创建的临时目录，输出不能位于 Git 跟踪的公开目录。

```powershell
uv sync --project $horizonRoot --frozen --no-dev --python 3.12
& "$horizonRoot/.venv/Scripts/python.exe" scripts/horizon/run.py validate --horizon-path $horizonRoot
& "$horizonRoot/.venv/Scripts/python.exe" scripts/horizon/check.py --horizon-path $horizonRoot
npm.cmd run ai-daily:editions-check
npm.cmd run ai-daily:editions-ui
```

`validate` 仅检查原生配置，不测活；`check.py` 在网络阻断下，用 fixture RSS 和模型响应执行原生 fetch/score/filter/enrich/summary 全程。适配直接调用原生 skill helper 使用的 `HorizonPipelineService`，避免另建新闻算法；不调用会生成旁置备份的 `save_config`。

经批准的小型真实业务任务才执行：

```powershell
# 先 collect 核对当前实际输入；这一步不调用模型。
& "$horizonRoot/.venv/Scripts/python.exe" scripts/horizon/run.py collect --horizon-path $horizonRoot --edition-id YYYY-MM-DD-morning
# 以下环境授权仅用于获批的本次生成；完成后移除本进程变量。
$env:HORIZON_GENERATION_APPROVED = 'true'
try {
  $generationResult = & "$horizonRoot/.venv/Scripts/python.exe" scripts/horizon/run.py generate --horizon-path $horizonRoot --edition-id YYYY-MM-DD-morning --env-file .env.local --output "$taskTemp/edition-bundle.json" | ConvertFrom-Json
  $generationResult | ConvertTo-Json -Depth 8
} finally {
  Remove-Item Env:HORIZON_GENERATION_APPROVED
}
if ($generationResult.ok -and $generationResult.outcome -eq 'generated') {
  npm.cmd exec -- tsx scripts/horizon/editions.ts preview --bundle "$taskTemp/edition-bundle.json" --output "$taskTemp/preview"
}
```

显式存在任意 `HORIZON_BASE_URL/API_KEY/MODEL` 时，脚本整组只读 `HORIZON_*`；留空或缺字段就拒绝，不与博客凭据混搭。仅当三项都不存在时，才兼容整组 `BLOG_DRAFT_FAST_*`，不读默认、legacy 或 review。临时配置不含 API key，路径/上游错误不写公开日志。原始 run 与配置随 `TemporaryDirectory` 清理；仅显式样稿包含正文、原文链接、脱敏完整性检查、用量和配置哈希，供本地验收。公开发布仅投影白名单字段。

### 本地渠道填写入口

- 根目录 `.env.local` 是本地私有填写文件，已被 Git 忽略。2026-11-06 用户要求清理旧渠道后，旧模型值、凭据、`GEMINI_*` 和备用渠道已移至集中恢复点；随后用户已填写新的 Horizon 三项。代理没有改写用户新填的地址或凭据。
- 日报只需填写顶部 `HORIZON_BASE_URL`、`HORIZON_API_KEY`、`HORIZON_MODEL`；地址为 HTTPS API 根地址（通常含 `/v1`），模型为该渠道准确 ID。模型未选时可先填地址/凭据，再读取目录选型；真实生成前同步 `config.json` 的模型与配置哈希。
- 下方 `BLOG_DRAFT_STRONG_*`、`BLOG_DRAFT_REVIEW_*`、`BLOG_DRAFT_FAST_*` 分别供博客长文、润色、提纲使用，可留空；它们不是日报必填项。
- `.env.example` 是可提交的变量模板，不是实际凭据来源；`scripts/horizon/config.json` 保存模型/来源/摘要策略，`budget.json` 保存运行上限，均不放渠道 URL 或 key。
- Horizon 仅在显式传入 `--env-file .env.local` 时加载该文件；进程已有环境变量优先，包括显式空值。GitHub Actions 使用自己的 Secrets/Variables，清理本地文件不会修改线上配置。

## 期次与发布

早晚期次是上海日期的 `YYYY-MM-DD-morning|evening`，`scheduledFor` 仍为期次锚点 08:00/20:00；实际 cron 为 `17 0 * * *` / `17 12 * * *`，北京时间 08:17/20:17 触发。保存 `scheduledFor/generatedAt/publishedAt/updatedAt/windowStart/windowEnd`，页面刷新不改变内容时间。自动任务以 cron 和 GitHub run 创建时间定槽，创建时间不得早于触发分钟；跨过下一期次锚点停止，手动补跑必须指定期次。采集窗口重叠，允许早晚重复报道。

[GitHub schedule 文档](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)说明整点可能因负载高而延迟甚至丢弃排队任务，并建议错开分钟。此次偏移用于降低该风险，不证明此前缺少 schedule 事件的具体原因，也不保证准点启动。

生成步骤通过 `--github-actions` 输出明确的 `generated/skipped/failed` 结果与脱敏 job summary，含阶段、输入/评分/入选数量、真实请求数、已报告 token 和未知用量请求数；失败保留原诊断。只有 `generated` 才执行 bundle preview，preview 通过后才上传 artifact、进入发布 job。`generated` 仅代表成稿，`published=false`，不能当作发布成功；空结果即使退出码 0 也不进入发布。摘要不含新闻正文、私有渠道、凭据或原始上游响应。已发布期次在采集前跳过，并明确记录 0 次模型调用。

不使用上游按 UTC 日期写入的可覆盖摘要；读取本次 run 的 `summary_path`。正文路径包含期次和 SHA-256；JSON 元数据和索引与正文在一个 commit 中更新，使用独立 Git index 和 non-force push，不切换主站工作树。发布冲突停止，重试发布同一个 bundle；不要重新运行模型。同内容同期重试无操作，不同内容必须显式 `--correction`，保留首次 publishedAt、旧文件并增加 revision。晚报与早报独立保存，补发旧期不倒退最新指针。

公开索引最多 2048 期 / 2 MiB，Markdown 最多 256 KiB；满额时停止发布，不隐式删除历史，需另行规划归档分页。大约两年多的早晚刊会触及数量上限。

首期验收后在 `publication.json` 记录实际 `configurationHash/firstEditionId/firstContentSha256` 并启用；再配置 GitHub Secrets `HORIZON_BASE_URL/HORIZON_API_KEY`、Variables `HORIZON_MODEL/AI_DAILY_AUTOMATION_ENABLED=true`。未验收样稿不得上传 Actions artifact 或内容分支；首次试跑在本地进行。生成 job 只有 contents:read，发布 job 有 contents:write 且不持有模型 Secret。Actions 每日北京时间早晚启动，可能延迟。

配置变更导致哈希变化会停止自动任务，必须按变更风险验证后更新验收记录。首期接受后的普通合格期刊自动发布，不要求逐期人工批准。

## 阅读与恢复

`src/data/aiDailyEditions.ts` 是发布、Functions、浏览器共用的解码契约。Functions 仅访问固定仓库和分支，正文哈希校验通过才返回；不接受代理 URL。404 为未知期次，503 为关闭/缺配置，502 为上游失败/坏 JSON/超大响应/坏哈希；成功响应有 ETag，index 短缓存。正文路径不可变，但详情 API 仍随索引读取当前 revision，不能长期缓存旧修正。

页面每 5 分钟在可见时更新，失败保留该页面已验证内容；首次进入且无缓存时显示错误。索引未更新时保持最后成功刊，超过 18 小时显示延迟。Markdown 由现有解析器处理，组件只允许有限元素/属性，保留 details/目录/公开 HTTP(S) 原文链接，阻止脚本、图片、事件、样式和危险链接。正文标注中文，固定 UI 支持三主题和中英。

暂停：关闭 Actions 自动变量即可，页面继续读取最后成功内容。应用回滚：关闭 Vite 新入口并重新部署；旧 publicId 仍走旧读取分支。纠错：用获批的修正 bundle 运行 publish `--correction`；撤回可将索引回到经验证的历史版本并保留记录，不删文件、不强推。冷启动时不能承诺 GitHub 故障期间新访客一定有旧内容。

## 离线验收与上线限制

上线已验证两个生产域的列表/详情/ETag/未知期次、桌面与移动阅读，以及云端离线校验和重复期次跳过；首个云端早报已成功取得模型完整响应，但筛选为空而停止，旧期刊保留；新的合格一期由 Actions 自动发布仍待实证，详见 release.md。检查覆盖早晚隔离、旧期补发、同内容幂等、修正版本、日期歧义、阶段失败、输入/请求/时间预算、首期 gate、API 超大/损坏/哈希、Markdown 安全，以及 320/390/430/1440 × 三主题 × 中英阅读矩阵。旧 payload/feed 检查继续用于兼容回归。真实来源、渠道内容、GitHub Secrets、分支权限、Cloudflare 分支排除和自动周期须在首期业务验收阶段确认。
