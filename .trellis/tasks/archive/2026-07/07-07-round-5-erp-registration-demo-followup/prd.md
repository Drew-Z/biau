# Round 5 ERP registration demo followup

## Goal

复查 `D:\workspace4Cursor\erp` 的注册与演示可用性：确认生产普通注册是否已经在代码层开放、登录/注册页面是否足够清楚、主站状态说明是否与 ERP 实际代码一致，并完成一个低风险、可本地验证的改进。

## Requirements

- R1. 进入 ERP 项目前先读取 ERP 自己的 `AGENTS.md`、`CLAUDE.md`、`.cursor/rules`、README、构建脚本和 git 状态。
- R2. 不使用真实 ERP 账号、密码、店铺凭据、生产数据库、后台链接或平台 token。
- R3. 不访问真实店铺、订单、SKU、同步任务或外部商业 API。
- R4. 如果代码层注册已经开放，优先把演示路径、状态说明、synthetic 或文档契约补清楚；如果未开放，再做低风险本地代码修复。
- R5. 任何需要 Render/Cloudflare/数据库/生产账号的验证都记录为 manual gate，不阻塞本地可推进工作。
- R6. 如果修改 ERP 仓库主体，必须运行该仓库最小相关验证；是否推送该仓库根据其 git 规则和敏感 diff 再决定。
- R7. 如果只修改主站状态/文档/检查，也要运行 `blog-semi` 的相关验证。

## Acceptance Criteria

- [x] 读取 ERP 项目规则、README、脚本和 git 状态。
- [x] 确认当前注册/登录/演示路径的真实代码状态。
- [x] 完成一个低风险可验证改进，或把需要人工处理的生产 gate 记录清楚。
- [x] 运行 ERP 或主站相关验证。
- [ ] 提交并推送 `blog-semi`；ERP 仓库只在安全且符合规则时提交/推送。

## Notes

- 优先不要新造账号；先以代码、配置示例、bootstrap/synthetic、公开状态解释和本地构建验证为主。
