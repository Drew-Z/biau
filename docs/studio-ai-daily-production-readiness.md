# Studio / AI Daily 生产就绪记录

这份记录用于收口 BIAU Operator、Content Studio 与 AI Daily 的生产边界。真实 token、数据库 URL、模型渠道和后台地址只保存在平台环境变量中；当前人工步骤以 [`docs/manual-gates.md`](./manual-gates.md) 为准。

## 当前结论

- Studio-first 流程已建立：来源池 -> AI Daily issue -> `hidden + review-needed` 草稿 -> 人工审核 -> Publish Export -> 本地/CI 静态导出。
- BIAU Operator 可以通过 `studio.draft` 创建待审核草稿，但不能审核、导出或发布。
- Studio API 与 Operator 使用同一个 `STUDIO_DATABASE_URL`，Operator 自己的会话/记忆数据库仍使用独立 `DATABASE_URL`。
- AI Daily 自动抓取、自动摘要和自动发布保持关闭，直到人工来源审核与导出流程稳定。

## 服务边界

| 服务 | 数据库 | 责任 |
| --- | --- | --- |
| `biau-operator-api` | `DATABASE_URL` | owner session、message、memory、usage、站务知识。 |
| `biau-operator-api` | `STUDIO_DATABASE_URL` | 仅用于 `hidden + review-needed` draft-write。 |
| `biau-content-studio-api` | `STUDIO_DATABASE_URL` | 草稿、来源、review、AI Daily issue 和 Publish Export。 |

两个服务的 `STUDIO_DATABASE_URL` 必须指向同一个内容库；不要把 Studio 数据库填入 Operator 的 `DATABASE_URL`。

## 本地验证

```powershell
npm.cmd run studio:smoke
npm.cmd run studio:ai-daily-brief-check
npm.cmd run operator:knowledge-check
npm.cmd run assistant:agent-eval
```

这些命令不调用真实模型，不需要生产数据库，也不会自动公开内容。

## 生产验收顺序

1. `biau-content-studio-api` 使用 `ASSISTANT_SERVICE_MODE=studio` 并完成 `prisma:migrate:studio`。
2. `biau-operator-api` 使用 `ASSISTANT_SERVICE_MODE=operator`，并将 `STUDIO_DATABASE_URL` 指向同一 Studio 内容库。
3. 在 `/studio` 保存 Studio token，确认 health、草稿、来源、AI Daily 和 export 列表可读。
4. 通过 `/operator` 提交一个真实、公开安全的草稿任务。
5. 确认 Operator 返回 `/studio?draft=<id>` artifact，草稿状态为 `review-needed`、可见性为 `hidden`。
6. 在 Studio 预览、修改和人工审核；通过后创建 Publish Export。
7. 在本地或 CI 执行 `studio:export -- --run-checks`，审查 Git diff 后再提交。

## 发布边界

- 线上 Studio 不直接写 Git 仓库。
- hidden draft、issue 和未审核 source 不进入公开博客、公开助手知识或 sitemap。
- AI Daily 必须包含具体来源、发布日期、事实摘要和逐条影响判断，不能把来源主页或流程说明当日报正文。
- 模型渠道只能用真实内容任务验收，禁止测活 prompt。
