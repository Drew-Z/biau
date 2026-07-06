# Round 5 reliability status manual gate followup

## Goal

复查主站可靠性状态页、外链/synthetic 脚本、项目状态数据和 Round 4/5 人工门禁，做一个不依赖真实平台凭据的本地可验证增强，让访客和维护者更清楚地区分：已验证在线、可本地验证、需要 demo 凭据、需要云平台操作、需要发布审批。

## Requirements

- R1. 检查 `src/data/statusTargets.ts`、`public/status/*`、可靠性/站点监控脚本、状态详情页或相关文档。
- R2. 不调用真实模型、不跑 provider 测活、不请求私有后台、不使用生产 token。
- R3. 不把平台 URL、数据库 URL、真实账号密码、模型渠道、私有监控地址、签名路径或未批准 APK 链接写入仓库。
- R4. 将无法本地完成的事项归类为 manual gate，并写清楚“谁来做、需要什么、完成后怎样验证”。
- R5. 实现一个能被脚本或构建验证的改进，例如状态数据一致性检查、manual gate 汇总检查、状态解释文案结构化、synthetic 输出契约检查或文档规范同步。
- R6. 改动应反哺主站公开展示和长期维护，不为通过检查而掩盖 degraded / gated / unchecked 状态。

## Acceptance Criteria

- [x] 找到可靠性状态相关数据、脚本、页面和文档。
- [x] 实现一个本地可验证的可靠性/门禁改进。
- [x] 人工门禁继续集中记录，且不阻塞其他可推进任务。
- [x] 运行相关 synthetic/status/check/lint/build 或完整 `verify`。
- [ ] 完成提交并推送 `main`。

## Notes

- 这个子任务优先处理 `blog-semi` 主站的状态表达和本地验证；如果进入关联项目主体，必须先读该项目自己的规则和脚本。
