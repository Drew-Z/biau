# Reliability status and synthetic checks

## Goal

让主站 `/status` 和相关 synthetic 脚本更清楚地反映各项目当前可控程度：公开入口、功能 synthetic、metrics/observability、manual gate 必须分层表达，避免把计划能力误写成已上线。

## Requirements

- 检查 `src/data/statusTargets.ts`、`scripts/check-*-synthetic.mjs`、`scripts/check-reliability-suite.mjs`、`public/status/*` 的当前状态。
- 优先补强主站可本地验证的 status/synthetic 逻辑和文案。
- 不触发模型测活；公开助手 live chat 只能显式 opt-in。
- 对生产 base URL、demo 凭据、metrics scrape、APK 下载等人工事项只记录 gate。

## Acceptance Criteria

- [ ] 状态页能区分 entry、synthetic、metrics、observability 和 manual gate。
- [ ] 运行并记录 `npm.cmd run site:status` 和 `npm.cmd run reliability:check` 结果。
- [ ] 受影响 synthetic 脚本至少运行最小相关检查。
- [ ] 公开状态数据不包含密钥、私有后台、真实账号密码或数据库 URL。
- [ ] 必要时更新父任务 `manual-gates.md`。
