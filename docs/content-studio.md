# BIAU Port 内容工作台

内容工作台是站长侧内部编辑面，用来把博客、AI 日报来源、审核状态和发布导出记录先保存到后端数据库，再导出到公开静态内容。

## 架构边界

- 公开站仍然读取已审核的静态内容产物。
- `/studio` 是内部工作台页面，不直接公开未审核数据库草稿。
- `/studio/api/*` 在本地 `ASSISTANT_SERVICE_MODE=all`、内部助手服务
  `internal`、以及独立内容工作台服务 `studio` 中可用；公开助手和 RAG
  Orchestrator 服务不挂载 Studio 路由。
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

如果不设置 `VITE_STUDIO_API_BASE_URL`，前端会回退到 `VITE_INTERNAL_ASSISTANT_API_BASE_URL`，再回退到 `VITE_CHAT_API_BASE_URL`。

4. 打开：

```text
/studio
```

在页面里粘贴 `STUDIO_ADMIN_TOKEN` 或 `ADMIN_TOKEN`。token 只保存在当前浏览器 localStorage，用于调用受保护的 Studio API。

## 当前能力

- 读取 Studio API health。
- 创建、编辑和审核内容草稿。
- 创建发布导出记录。
- 把已审核草稿通过本地导出器写入公开静态博客数据。
- 保存 AI 日报来源池条目。
- 创建 AI 日报 issue 并关联来源 ID。
- 后端会拦截明显的 key、token、数据库连接串等敏感内容。

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
时回写导出文件列表和检查结果。不写文件的检查命令：

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

## 仍是人工 Gate 的事项

- 生产环境真实 `DATABASE_URL`。
- Render/Supabase 等平台上的 migration 执行。
- 生产 `STUDIO_ADMIN_TOKEN`。
- 第一次真实模型辅助摘要/润色任务。
- 将本地导出的公开内容 diff 审核后提交发布。

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

如果要把内部助手库和内容工作台库分开，推荐新建一个 Render Web Service：

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
