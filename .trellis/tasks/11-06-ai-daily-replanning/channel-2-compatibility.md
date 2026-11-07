# 渠道 2：JSON 兼容修复与 429 停止记录

2026-11-08：确认本站适配器误拒绝了完整 Markdown JSON 代码块。修复后渠道 2 的 `gemini-3.5-flash-lite` 连续完成 6 次评分和 1 次摘要，第 8 次请求返回 HTTP 429，整期停止。它现在是本地候选模型，尚未完成整期验收或切换生产；原渠道 DeepSeek 保留为显式备用。

写作模式：真实新闻诊断与原生 Horizon 生成，Codex 对照来源审阅。沿用用户已授权的渠道模型和候选轮预算，不重置额度，不改思考参数。结构化记录见 [channel-2-compatibility-evidence.json](channel-2-compatibility-evidence.json)，前轮比较见 [channel-2-selection.md](channel-2-selection.md)。

## 已证实的根因

用 GitHub Copilot 周报进行了 2 次真实内容诊断。评分 4.062 秒返回 JSON object；摘要 4.875 秒返回 `finish_reason=stop`、完整 usage 和包在单个 `json` 代码块中的合法对象。Horizon 原生解析器能处理该对象，本站提前调用 `json.loads(message.content)` 却拒绝了代码块。

这证明此前不能把 `invalid-model-json` 直接解释为模型没有生成能力；前轮两次失败未保存正文，无法追认它们全部属于同一原因。也不能据此声称 TLS、503、524 等问题已经解决。

修复仅剥除全字符串匹配的完整单个 `json` 或无标签代码块，然后仍要求严格 JSON object 和原生业务字段验证。前后说明、多段或不闭合代码块、数组、损坏 JSON、无终态仍拒绝；没有新增格式修复请求。

## 整期业务结果

沿用固定七源、24 小时窗口和评分线，显式补跑 `2026-11-07-evening`；实际开始于北京时间 11 月 8 日 00:58。全部来源采集完成，冻结输入 6 条，给本次运行的请求上限为 12。

| 阶段 | 结果 |
| --- | --- |
| 评分 | 6/6 完成，4 条评分 4–5，2 条评分 6 达到筛选线 |
| 摘要 | NVIDIA Reshard 完整；GitHub Slack/Teams GA 请求返回 429 |
| 完整响应耗时 | 2.766–4.610 秒；7 次中 6 次需要去除 JSON 代码块 |
| 产物 | 保存原生产物和停止账本，无完整 bundle，无发布 |

NVIDIA 摘要保留来源归因和 weight refit 场景，未虚构性能、价格或独立结论；中文“权重重构”仍可改善。诊断中的 GitHub 周报摘要保留 Xcode 27.3 beta 公共预览限定，整期评分 5，因此未强行选入。不得把诊断与部分摘要拼成可发布整期，也不得清除旧账本的停止标志。

本次成功路径使用本机显式系统代理，不能据此证明直连或 GitHub runner 的生成可达性。429 时尚未加入机器码诊断，具体属于 RPM/TPM 限流、模型/每日额度还是账户余额问题仍未知。

## 当前候选修订

- `adapter.channelModels` 将主用 2 映射到 Gemini Lite、备用 1 映射到 DeepSeek，纳入配置哈希；原生运行与发布端都核对所选组和模型，禁止混组。私有文件只改 `HORIZON_MODEL2`，用户 URL/key 保留。
- `ai.throttle_sec=10` 同时应用于评分和摘要。整期 429 试跑时配置仍为 1 秒且只在评分阶段生效；新增节奏只通过离线验证，不宣称已经修复 429，也不把 10 秒当作服务商公布的限额。
- 429 先硬停止，再限量读取至多 16 KiB / 1 秒，仅保存白名单机器码对应的限流/额度/未知类别及合法数字 Retry-After。迟缓或损坏的错误正文不会把 429 降为可继续的超时，不保留原始错误信息，不自动重试。
- 手动 Actions 增加 `request_limit`，沿用 CLI 下调规则；后续验证必须使用候选轮剩余额度，不能以新 dispatch 重置 60 次授权。

整期试跑配置哈希为 `a7b4f2100c2b036ad01856e77de9b605853a14b607fd39fcfe0e518db66a5cd6`；最终 10 秒候选为 `20e997ac47866b7be4a082b62fdd373f6557fd2c36977f7c6e127d4c190c8ebb`。生产验收 hash 未更新，GitHub 渠道 2 Secrets/模型变量尚未设置。

## 预算与验证

此前 29 次 + 本轮诊断 2 次 + 整期 8 次 = **39/60，剩余 21 次**。本轮 9 次返回 usage，共 14,321 tokens；429 用量未知，不推算费用，也不把错误请求视为免费。

原生断网测试覆盖严格代码块兼容、原生评分/摘要、两阶段节奏传参、429 机器码/迟缓正文/不重试和主备模型隔离；期刊/原子发布、lint、build、部署与门禁文档检查通过。

提交 `5d971e8a` 已推送候选分支，Actions [42398050641](https://github.com/Drew-Z/biau/actions/runs/42398050641) 于北京时间 11 月 8 日 01:48 完成 `validate`：Linux 原生断网与发布合同通过，0 模型请求、0 上传 artifact，采集/生成/发布均跳过。该结果证明修复在 runner 上通过离线合同，不证明真实云端模型生成或 429 已修复。

正式私有证据保存在 `D:/Agent/codex/artifacts/ai-daily/20261108-channel2-compatibility/`：38 份诊断/原生阶段/冻结输入/停止账本 JSON，加 1 份云端验证记录；`artifacts.json` 记录 SHA-256。复制前扫描私有地址/凭据、复制后哈希核验通过，原始运行目录不进 Git。

恢复点继续使用 `D:/Agent/codex/backups/tasks/20261106T133109757Z-ai-daily-replanning/manifest.json`。干净代码/任务/日志以 `f250dbba` 为阶段恢复点；私有环境已保存独立阶段实体、核验哈希与 ACL，未覆盖原始基线。

收尾重新核验全部 12 份实体恢复点和 39 份证据；私有环境相较阶段快照仅 `HORIZON_MODEL2` 变化。已删除本轮临时目录 `C:/Users/zhang/AppData/Local/Temp/horizon-channel-repair-ddzb8d4c`（8,587 文件、732 子目录）：删除前确认范围、无重解析点、无关联运行进程。既存桌宠/UI 改动、` .trellis/`、`undefined/`、vendor 包和 4 个旧 worktree 保留。

下一步需要渠道后台的 429 原因或已修复证据。明确 RPM/TPM 后据实际限额调整节奏，额度/余额不足则先处理渠道配置；随后在剩余 21 次内做新的有界整期及云端生成验证。完整成稿与原文核对通过后才更新验收配置、配置渠道 2 Secrets 并合并上线。AC12 仍未完成，任务保持 `in_progress`。
