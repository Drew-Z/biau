# Horizon 首期发布与自动更新

日期：2026-11-07（Asia/Shanghai）。状态：首期与网站已发布，早晚自动更新已启用；首个云端早报因无达标内容停止，仍保留已验收晚刊。Actions 自动发布新一期尚无成功实证。

## 首次部署与发现的运行时差异

应用提交 `0bb99014` 已推送，Cloudflare 生产部署 `7aa4a7d9-0d1b-4ef9-ac2b-3d290e3de163` 成功，Site Quality 和 Actions 离线 validate（run `42302207548`）均通过。公开 API 首读为 502，自动开关仍关闭。Wrangler/workerd 重现 `Invalid redirect value`：Workers 不支持 Node 支持的 `redirect: error`，在访问内容源前就抛错。修复为 `manual` 并保留非 2xx 拒绝，新增重定向拒绝检查。实际公网验收仍须通过，编译/Node fixture 不替代运行时检查。

本机 Python 访问 Pages 出现 403/browser_signature_banned；浏览器的默认域请求到达 Function 并得到固定 502 JSON，自定义域一次得到边缘 502 HTML。GitHub 原始内容为 200，哈希正确；这些路径差异分别记录，未关闭 TLS 或改网络设置。

## 授权与固定范围

用户针对首期样稿验收提示回复“继续”，按此前确认的“首期验收后自动更新”执行首期发布、网站入口切换和 GitHub Actions 早晚任务。无需逐期审批。使用当前已验收 3 来源、20 输入、5 成稿、60 HTTP/60 秒请求/20 分钟整期预算，单并发、SDK retries=0，不扩大来源或模型范围。

- 期次：`2026-11-06-evening`（显式补跑）。
- 生成时间：`2026-11-06T20:53:01.693Z`，保留真实时间。
- 正文 SHA-256：`d1716687d66e953d178f56c5d1e5658a11c58c2b6fd6e1d5a96aa772eeba32f8`。
- 配置 SHA-256：`0f9231b71a223c0277067ab772a997e879ea397220a9ecf7cb4e12f5f07f88ea`。
- 首期内容提交：`72c19e2e304a35938ae814d4acce0bcc472a4153`，分支 `codex/ai-daily-content`。

## 平台准备

- 远端 main 与本地发布基线均为 `0e7547482daac76a53f8cb81ad2b3cd221b6435d`。
- Cloudflare Pages `biau` 生产分支为 main，原生产部署 `60da669e-289a-4a33-9d27-079db5677bec`。
- Preview 改为 custom，保留 `*` 包含规则，精确排除内容分支；其他生产变量逐项核对保留。
- 新增生产变量 `VITE_AI_DAILY_EDITIONS_ENABLED=true`、`AI_DAILY_EDITIONS_ENABLED=true`、`AI_DAILY_CONTENT_REPOSITORY=Drew-Z/biau`。
- 从私有文件安全传入 GitHub Secrets `HORIZON_BASE_URL/HORIZON_API_KEY`，变量 `HORIZON_MODEL=deepseek-v4.1-flash`；自动开关暂为 false，网站与 Actions 检查后最后启用。

平台字段依据：[Cloudflare branch controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)、[Pages project PATCH](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/edit/)。通过 smart-search fetch 读取官方文档，未执行模型测活。

## 恢复与验证边界

复用现有集中恢复组，增加 `publication.json` 的修改前基线，并保存仅含分支规则、3 项新公开变量的原状态和前一部署 ID 的 `cloudflare-horizon-settings-before.json`；不读取/备份无关 Secret 值。清单已校验 10 个实体基线。

精确日报发布快照（HEAD + 本任务暂存文件）通过 lint、启用入口后的 build、Wrangler Functions 编译、期刊合同/原子发布/幂等/冲突保护、部署文档/门禁检查和 24 组阅读 UI。内容分支仅含 index、期刊元数据与 Markdown 三个文件，正文哈希核对通过，不包含 runtime/模型诊断。Cloudflare 该内容提交记录 is_skipped=true、skip_reason=branch_config，证明排除规则实际生效。公网与 Actions 验证待后续记录。桌宠、历史 UI 任务、未知目录和旧 worktree 不纳入本次提交。完整站点的历史 verify/UI 限制仍见 validation.md。

## 网站与自动开关验证

- 修复提交 `e6e16c8b`，Cloudflare 生产部署 `6eaa1506-581a-465b-97e4-21f4900a4b57` 成功；Site Quality run `42311479713` 成功。
- 自定义域与 Pages 默认域的列表/首期详情均 200，ETag 条件请求 304，未知期次 404。公开正文 SHA-256 与已验收稿一致，保留原 generatedAt 与首次 publishedAt；未包含运行配置哈希/凭据。
- 1440px 中文晨曦、390px 英文星空：列表、整期、原文入口、刷新恢复通过，无横向溢出或 pageerror。正文仍标注 zh-CN；自定义域 TLS 1.3 与正确域名证书通过，未关闭证书校验。
- `AI_DAILY_AUTOMATION_ENABLED=true`，workflow state=active，cron 对应北京时间 08:00 / 20:00。
- Actions `42311723782` 指定已发布首期：离线检查与 slot 判断成功，generation/artifact/publish 均 skipped，内容分支仍为 `72c19e2e`，新增模型调用 0。此结果证明云端读取、配置哈希与跳过规则；不冒充新一期真实生成证据。
- 完整低敏公网证据与两张截图保存在正式本地 artifacts 的 `production-verification.json`、`production-1440-zh.png`、`production-390-en.png`。
- 本地 workerd 在修复 redirect 后遇到自己的 remote internal error，未据此修改生产网络或放宽断言；实际两个生产域的成功请求才作为生产读取证据。

## 暂停与恢复

```powershell
# 暂停后续生成；网站继续显示最后成功期刊。
gh variable set AI_DAILY_AUTOMATION_ENABLED --repo Drew-Z/biau --body false
# 恢复同一已验收配置下的定时。
gh variable set AI_DAILY_AUTOMATION_ENABLED --repo Drew-Z/biau --body true
```

生成失败不自动重试整期，最后成功索引保持；待故障解除后使用 workflow_dispatch 指定已到期的 edition_id 补跑。若只发生发布失败，下载同一 bundle 重放 publish，避免再次调用模型。应用回滚可恢复先前 Cloudflare 部署并关闭前端入口；内容历史不删除、不强推。

## 首个云端早报（2026-11-07）

北京时间 08:05 尚未观察到 schedule 事件，因此按已授权自动运行范围手动触发同一早刊 `2026-11-07-morning`，run `42316220748`。没有更改已验收配置、模型或预算；同一期后续 schedule 仍会先检查已发布索引。

- 云端离线合同、配置哈希和 slot 检查成功，三路 RSS 完整性检查通过后进入评分。
- 仅 1 次实际模型请求，HTTP 200、finishReason=stop、约 3.558 秒；488 输入 / 247 输出 tokens，usage 已返回，费用金额未知。由此证明 GitHub Secrets 可供真实模型调用，不能把失败 workflow 归为渠道不可用。
- 流程在 filter 阶段以 `empty-or-over-budget-selection` 停止。固定上游逐条评分与本轮仅 1 个已完成请求、max_items=5 结合表明本次为空筛选；没有原始 scored artifact，不能断言具体评分值或理由。
- 未进入 enrichment，artifact/publish job 均 skipped；内容分支仍为 `72c19e2e304a35938ae814d4acce0bcc472a4153`，没有覆盖晚刊或伪造早刊。
- 未降低 threshold、扩充来源或重跑该手动任务。后续定时仍使用已验收配置。首个 schedule 的实际触发和合格新一期的 Actions 发布写权限仍待后续实证；不能把本地首期发布或云端跳过记录当作该环节成功。
- 此次上线阶段新增模型请求 1；累计历史有精确计数的请求 18，最早缺计数的限制保留。脱敏结果保存在 `actions-morning-attempt.json` 与 release-verification.json。

后续工作应优先根据正常期刊覆盖调整来源，而不是继续轮换模型或部署新的通用网关；来源扩展另行验证采集数量、相关性与预算，不为验收制造新新闻。
