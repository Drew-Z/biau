# BIAU Port 内容工作台

内容工作台是站长侧内部编辑面，用来把博客、AI 日报来源、审核状态和发布导出记录先保存到后端数据库，再导出到公开静态内容。

生产验收和分库变量边界见 [`docs/studio-ai-daily-production-readiness.md`](./studio-ai-daily-production-readiness.md)。

## 架构边界

- 公开站仍然读取已审核的静态内容产物。
- `/studio` 是内部工作台页面，不直接公开未审核数据库草稿。
- `/studio/api/*` 只在本地 `ASSISTANT_SERVICE_MODE=all` 和独立内容工作台
  服务 `studio` 中可用；公开助手、Operator 和 RAG Orchestrator 不挂载
  Studio API 路由。Operator 的 `studio.draft` 直接写共享 Studio 数据库。
- 第一版认证使用 `STUDIO_ADMIN_TOKEN`，未设置时回退到 `ADMIN_TOKEN`。
- Studio 默认使用 `STUDIO_DATABASE_URL`；未设置时才回退到 `DATABASE_URL`。
- 模型辅助默认不启用；AI 日报来源和草稿编辑都可以先人工录入。

## 本地使用

1. 在 `.env.local` 或部署平台设置后端变量：

```text
DATABASE_URL=<postgres connection string>
STUDIO_DATABASE_URL=<optional dedicated studio postgres connection string>
ADMIN_TOKEN=<owner token>
STUDIO_ADMIN_TOKEN=<optional owner token>
```

2. 启动后端与前端：

```powershell
npm.cmd run server:dev
npm.cmd run dev
```

3. 前端 API base：

```text
VITE_STUDIO_API_BASE_URL=http://localhost:8787
```

如果不设置 `VITE_STUDIO_API_BASE_URL`，前端会回退到 `VITE_CHAT_API_BASE_URL`。

4. 打开：

```text
/studio
```

在页面里粘贴 `STUDIO_ADMIN_TOKEN` 或 `ADMIN_TOKEN`。token 只保存在当前浏览器 localStorage，用于调用受保护的 Studio API。

## 当前能力

- 读取 Studio API health。
- 创建、编辑、提交审核、重新提交、批准和归档内容草稿。
- 创建发布导出记录。
- 把已审核草稿通过本地导出器写入公开静态博客数据。
- 保存 AI 日报来源池条目。
- 创建 AI 日报 issue 并关联来源 ID。
- 后端会拦截明显的 key、token、数据库连接串等敏感内容。

## 草稿生命周期与审核

1. 新建草稿保存后状态为 `draft`，必须点击“提交审核”进入 `review-needed`，不能直接批准。
2. 审核摘要会区分普通“待审核”和最新 review 为 `needs-changes` 的“待修改”。后端会验证草稿保存时间晚于退回时间；未保存真实修订时不能重新提交。
3. 重新提交会新增 `pending` review；只有普通 `review-needed` 草稿才会启用“审核通过”。
4. 编辑 `approved`、`published` 或 `rejected` 草稿会使旧终态结论失效，并在同一事务中重新进入 `review-needed + pending`；`rejected` 不提供绕过编辑的直接重提入口。
5. `draft`、`review-needed`、`approved`、`rejected` 可以归档；归档后自动变为 `hidden + archived` 并只读。`published` 必须先完成公开撤回，不能直接归档。
6. 审核通过后才允许创建 Publish Export。退回修改、重新提交、批准和归档都不会直接公开内容。

草稿的 `needs-changes` 是最新 review 状态，不是独立的 draft 状态；页面会把这类 `review-needed` 草稿显示为“待修改”。
编辑、审核、归档和创建导出记录都会提交浏览器当前看到的草稿 `updatedAt`；服务端以该版本执行条件写入。如果另一个窗口已保存较新版本，当前操作会提示刷新，而不是覆盖较新的结果。空补丁或只修改 `updatedBy` 不会触发状态迁移。

## 发布导出

公开站不让线上 Studio 服务直接写 Git 仓库。审核通过后，先在 `/studio`
里创建发布导出记录，然后在本地或 CI 执行导出器：

```powershell
$env:STUDIO_EXPORT_API_BASE="https://<studio-service>.onrender.com"
$env:STUDIO_ADMIN_TOKEN="<owner token>"
npm.cmd run studio:export -- --draft <draft-id-or-slug> --publish-export-id <export-id> --run-checks
```

导出器会写入：

```text
src/data/blog-posts/<slug>.ts
src/data/blog.ts
src/data/blogContent.ts
src/data/blogCuration.ts
```

默认会拒绝覆盖已有 slug；确认重写时加 `--force`。`--run-checks` 会在写文件后自动运行
`blog:audit`、`blog:check`、`lint` 和 `build`，并在提供 `--publish-export-id`
时回写导出文件列表和检查结果。每条新 Publish Export 会绑定草稿 ID、草稿 `updatedAt` 和批准 review ID；导出器会在写文件前、写文件后和回写事务中核对三者。若最终回写因草稿并发变化或连接失败而未被 Studio 接受，导出器会恢复写入前文件，避免留下未绑定的旧版本内容。已经 `passed` 的记录会锁定，不能再次覆盖。不写文件的检查命令：

```powershell
npm.cmd run studio:export -- --sample --dry-run
```

更完整的本地离线 smoke gate：

```powershell
npm.cmd run studio:smoke
```

`studio:smoke` 会串行检查 Studio sample export、项目详情导出计划、状态页导出计划和 AI Daily 样例草稿生成。它只写入系统临时目录，不调用模型、不访问外部 URL、不要求生产数据库。

导出后运行：

```powershell
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run lint
npm.cmd run build
```

## 平台边界与当前 Gate

部署基线已经完成：Studio 使用独立内容数据库，Operator 通过同一个 `STUDIO_DATABASE_URL` 写入待审核草稿，`20260717000000_publish_export_version_binding` migration 已在生产 Studio 服务执行。受保护的 health、草稿、来源和 Publish Export 只读接口已通过低敏复核，版本绑定能力可以在生产使用。真实变量仍只保存在平台控制台。

当前人工步骤以 [`docs/manual-gates.md`](./manual-gates.md) 为准，当前 Content Studio gate 只有：

- 使用生产 Studio token 修改或归档 `needs-changes` 草稿；token 不写入聊天或仓库。
- 审核一份证据完整的新版草稿并创建 Publish Export。
- 在本地或 CI 运行卡片中显示的 `studio:export` 命令，审核公开内容 diff 后再提交。
- 真实模型辅助只允许用于用户批准的具体内容任务，不进行测活。

## 验证

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:studio
npm.cmd run studio:smoke
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run lint
npm.cmd run build
```

## 独立部署推荐

Operator 数据库和内容工作台数据库应分开维护，Studio 使用独立 Render Web Service：

```text
ASSISTANT_SERVICE_MODE=studio
STUDIO_DATABASE_URL=<Aiven PostgreSQL Service URI>
STUDIO_ADMIN_TOKEN=<owner token>
CORS_ORIGIN=<main site origin>
NODE_VERSION=22
```

`CORS_ORIGIN` 填主站 origin，不要带路径或尾斜杠，例如：

```text
https://biau.playlab.eu.cc
```

Build Command：

```bash
npm install && npm run prisma:generate && npm run server:build
```

Start Command：

```bash
npm run prisma:migrate:studio && npm run server:start
```

然后让主站前端指向这个服务：

```text
VITE_STUDIO_API_BASE_URL=https://<studio-service>.onrender.com
```
