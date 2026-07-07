# Studio / AI Daily 生产就绪记录

这份记录用于收口内部助手、Content Studio 和 AI 日报之间的生产边界。它只记录公开安全的配置形状、验证命令和人工 gate，不包含真实 token、数据库 URL、模型渠道或后台地址。跨项目人工队列统一记录在 [`docs/manual-gates.md`](./manual-gates.md)。

## 当前结论

- 本地安全链路已经可用：`npm.cmd run studio:smoke` 会离线验证 Studio sample export、项目详情计划、状态页计划和 AI Daily 样例草稿。
- AI Daily 的默认生产路径是 Studio-first：来源池 -> AI Daily issue -> hidden/review-needed 内容草稿 -> 人工审核 -> Publish Export -> 静态博客数据。
- 内部助手可以创建 Studio 草稿，但只允许 `hidden + review-needed` 的 draft-write，不会审核、导出或发布。
- AI Daily 自动化当前只应推进到草稿/审核态；每日自动抓取来源、模型摘要、自动发布都还是后续单独任务。

## 服务与数据库边界

| 服务 | 主要变量 | 应指向 | 说明 |
|---|---|---|---|
| `biau-internal-assistant-api` | `DATABASE_URL` | 内部助手数据库 | 成员、邀请码、会话、消息、用量和成员模型渠道。 |
| `biau-internal-assistant-api` | `STUDIO_DATABASE_URL` | 内容工作台数据库 | 让内部助手把 draft-write 写入和 Studio API 相同的内容库。 |
| `biau-content-studio-api` | `STUDIO_DATABASE_URL` | 内容工作台数据库 | 草稿、AI Daily issue、source item、review 和 publish export。 |
| `biau-content-studio-api` | `DATABASE_URL` | 通常不需要 | 只作为本地/简单部署 fallback；生产分库时不要依赖它。 |

生产分库时，最重要的规则是：

- `biau-content-studio-api` 的 `STUDIO_DATABASE_URL` 和 `biau-internal-assistant-api` 的 `STUDIO_DATABASE_URL` 必须是同一个内容工作台数据库。
- `biau-internal-assistant-api` 的 `DATABASE_URL` 不能填成 Studio 数据库，否则成员 token、邀请码和会话会走错库。
- 前端只配置 `VITE_STUDIO_API_BASE_URL` 指向 Studio API 服务；真实数据库连接串、admin token 和模型渠道只放服务端环境变量。

## 已验证的本地命令

```powershell
npm.cmd run studio:smoke
```

最近一次本地结果：通过。该命令不会调用模型、不会抓取外部 URL、不会要求生产数据库，也不会在 `content-drafts/` 留下 smoke 草稿。

`studio:smoke` 覆盖：

- `studio:export -- --sample --dry-run --allow-dirty`
- `studio:project-detail-plan -- --sample legal-rag`
- `studio:status-plan -- --sample legal-rag`
- `ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --out <system-temp>/ai-daily-smoke.md --force`

## 生产验收顺序

1. Render 上确认 `biau-content-studio-api` 使用 `ASSISTANT_SERVICE_MODE=studio`。
2. Render 上确认 `STUDIO_DATABASE_URL` 指向内容工作台数据库。
3. Render 上确认 `STUDIO_ADMIN_TOKEN` 已设置，且不要写进前端变量。
4. 若内部助手需要写 Studio 草稿，确认 `biau-internal-assistant-api` 的 `STUDIO_DATABASE_URL` 与 Studio API 相同。
5. 执行生产 migration：`npm run prisma:migrate:studio`。
6. 用浏览器打开 `/studio`，粘贴 Studio token，检查 `/studio/api/health` 能返回低敏状态。
7. 创建一条公开安全 source item，再创建 AI Daily issue，并在 `/studio/ai-daily/:issueId` 转为内容草稿。
8. 确认生成的草稿是 `hidden + review-needed + aiAssistance: none`。
9. 人工审核通过后再创建 Publish Export，并在本地或 CI 执行 `studio:export -- --run-checks`。

## 仍需人工 gate

- 生产数据库连接串和 Render 环境变量填写。
- Studio production migration 执行与服务重启。
- 首次真实 `/studio` token 登录和 `/studio/api/health` 验收。
- 首次真实 AI Daily issue 到内容草稿转换。
- AI Daily 是否接入自动来源采集、定时任务、模型摘要或模型润色。
- Publish Export 生成的公开内容 diff 审核和提交。

## 不应做的事

- 不把 `STUDIO_ADMIN_TOKEN`、数据库 URL、模型中转站地址或真实请求头写入仓库。
- 不让线上 Studio 服务直接写 Git 仓库。
- 不把 issue 或 hidden draft 自动公开到博客列表、助手知识或 sitemap。
- 不用模型 ping / doctor live 证明渠道可用；真实模型调用必须服务于一次明确内容任务。
