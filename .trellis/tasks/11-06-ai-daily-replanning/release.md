# Horizon 首期发布与自动更新

日期：2026-11-07（Asia/Shanghai）。状态：发布进行中；生产检查完成后补充结果，不提前标记成功。

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
