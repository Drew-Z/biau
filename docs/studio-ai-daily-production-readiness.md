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

## 既有部署基线与当前 schema 变更

以下部署基线已经完成，不应作为每轮内容工作的前置 setup 重复执行：

- `biau-content-studio-api` 使用 `ASSISTANT_SERVICE_MODE=studio`，既有 Studio migration 与独立内容数据库边界已建立。
- `biau-operator-api` 使用 `ASSISTANT_SERVICE_MODE=operator`，并通过共享 `STUDIO_DATABASE_URL` 写入同一内容库。
- `/studio` 已能读取 health、草稿、来源、AI Daily 和 Publish Export；Operator artifact 能定位 `hidden + review-needed` 草稿。

后续每个真实内容周期只执行：

1. 在 Studio 修改或归档 `needs-changes` 草稿，保存后重新提交审核。
2. 人工复核事实、来源、结构、版权与公开安全边界；通过后创建 Publish Export。
3. 使用 Publish Export 卡片显示的本地命令执行 `studio:export -- --run-checks`。
4. 审查 Git diff 和博客检查结果后再提交，不让线上 Studio 直接写仓库。

`20260717000000_publish_export_version_binding` migration 已在生产 Studio 服务执行。它给 Publish Export
增加可空的草稿版本与批准记录字段、新增记录更新时间字段，同时创建 `(draftId, draftUpdatedAt)` 唯一索引，并增加指向 `ContentReview` 的外键。部署后，受保护的 health、草稿、来源和 Publish Export 只读接口均返回 `200`；Publish Export 查询成功使用新版 schema。既有旧记录不会被猜测回填，继续导出时应在 Studio 中重新创建一条记录。

当前人工顺序和低敏成功标准只在 [`docs/manual-gates.md`](./manual-gates.md) 维护。

## 发布边界

- 线上 Studio 不直接写 Git 仓库。
- hidden draft、issue 和未审核 source 不进入公开博客、公开助手知识或 sitemap。
- AI Daily 必须包含具体来源、发布日期、事实摘要和逐条影响判断，不能把来源主页或流程说明当日报正文。
- 模型渠道只能用真实内容任务验收，禁止测活 prompt。
