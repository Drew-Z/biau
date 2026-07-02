# 部署方案

## 当前线上地址

```text
https://biau.playlab.eu.cc
```

## 部署结论

当前站点部署在 Cloudflare Pages，并通过 GitHub `main` 分支自动更新。

推荐继续使用 Cloudflare Pages 的原因：

- 当前站点是 React + Vite 静态应用，生产产物是 `dist`，非常适合 Pages 的 GitHub 自动构建。
- 页面主要是官网展示、项目展示、案例中心和博客内容，不依赖常驻 Node 服务。
- Cloudflare Pages 自带 CDN、HTTPS、预览环境和回滚能力。
- `public/_redirects` 已加入，生产环境刷新 `/projects`、`/blog` 和详情页会回退到 `index.html`。

## Cloudflare Pages 配置

GitHub 仓库：

```text
git@github.com-bill:ciallo-bill/biau.git
```

Cloudflare Pages 项目配置：

```text
Framework preset: None
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: 留空
```

如果 Cloudflare 需要指定 Node 版本，建议使用：

```text
NODE_VERSION=22
```

前端如果要连接内部助手 API，需要在 Cloudflare Pages 环境变量中增加：

```text
VITE_CHAT_API_BASE_URL=https://<render-assistant-api>.onrender.com
```

未配置该变量时，公开助手和内部助手页面会使用本地公开知识回退，不会调用远程 API。

## 内部助手 API 部署

助手后端位于当前仓库的 `server/`，和静态前端独立部署。推荐第一版部署到 Render Web Service，数据库使用 Aiven PostgreSQL。

Render 配置建议：

```text
Runtime: Node
Build Command: npm ci && npm run assistant:index && npm run prisma:generate && npm run server:build
Start Command: npm run prisma:migrate && npm run server:start
```

Render 环境变量：

```text
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://biau.playlab.eu.cc
ADMIN_TOKEN=<生成一个长随机字符串>
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=<OpenAI 或兼容服务 Key，可留空使用本地回退>
OPENAI_MODEL=gpt-4.1-mini
PORT=10000
```

本地后端开发：

```bash
npm run assistant:index
npm run prisma:validate
npm run prisma:generate
npm run server:dev
```

生产数据库迁移：

```bash
npm run prisma:migrate
```

### 邀请码初始化

管理员用 `ADMIN_TOKEN` 创建邀请码：

```bash
curl -X POST "$ASSISTANT_API/admin/invites" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"BIAU-PORT-ALPHA","label":"Alpha member","role":"MEMBER","dailyQuota":24,"maxUses":1}'
```

内部成员用邀请码兑换成员 token：

```bash
curl -X POST "$ASSISTANT_API/auth/redeem-invite" \
  -H "Content-Type: application/json" \
  -d '{"code":"BIAU-PORT-ALPHA","name":"成员名称"}'
```

前端内部助手第一版在 `/assistant` 提供邀请码兑换表单。兑换成功后会把 `biau-assistant-member-token`、基础成员信息和当前 `biau-assistant-session-id` 保存在当前浏览器的 `localStorage`。未配置 API、未兑换 token、数据库不可用或模型服务不可用时，页面会退回到已脱敏的公开站点知识，并明确说明限制。

隐藏管理页位于 `/assistant/admin`。第一版通过手动输入并本地保存 `ADMIN_TOKEN` 调用 `GET /admin/summary` 和 `POST /admin/invites`，只用于验证轻量管理链路，不包含完整成员列表、历史记录浏览、删除/禁用、导出或私有知识源管理。

当前公开助手和内部助手都只使用生成的公开站点知识。网站博客页和项目页内容后续可以继续优化；在这之前，助手应在低置信度问题上说明公开内容不足，而不是补造细节。

### API 健康检查

```bash
curl "$ASSISTANT_API/health"
```

最小接口包括：

```text
GET /health
POST /auth/redeem-invite
POST /chat/public
POST /chat/internal
GET /admin/summary
POST /admin/invites
```

## 自定义域名

当前绑定域名：

```text
biau.playlab.eu.cc
```

域名已在 Cloudflare Pages 的 `Custom domains` 中绑定，线上访问地址为：

```text
https://biau.playlab.eu.cc
```

## 自动更新流程

以后每次修改站点后，在本地执行：

```bash
npm run lint
npm run build
git add .
git commit -m "Update site"
git push
```

推送到 GitHub 的 `main` 分支后，Cloudflare Pages 会自动触发构建并更新线上站点。

## 如果 GitHub 已更新但线上还是旧版本

本地确认方式：

```bash
git log --oneline -3
git ls-remote origin refs/heads/main
```

如果两边都能看到最新 commit，但线上页面仍加载旧的 `/assets/index-*.js`，优先检查 Cloudflare Pages 后台：

- `Deployments` 是否出现最新 commit。
- 最新部署是否成功。
- `Production branch` 是否仍是 `main`。
- `Root directory` 是否留空。
- `Build command` 是否为 `npm run build`。
- `Build output directory` 是否为 `dist`。

如果没有出现最新部署，可以在 Cloudflare Pages 项目中手动点击 `Retry deployment` 或 `Create deployment`。

## 手动部署备用方案

如果 Git 集成暂时没有触发，可以用 Wrangler 直接上传本地构建产物。首次使用需要在本机登录 Cloudflare：

```bash
npx wrangler login
```

确认登录状态：

```bash
npx wrangler whoami
```

构建并部署：

```bash
npm run build
npx wrangler pages deploy dist --project-name=biau
```

如果 Cloudflare Pages 项目名不是 `biau`，把 `--project-name` 改成 Pages 后台显示的项目名。

## hidencloud 适用场景

hidencloud 当前更适合作为桌宠项目的公开 API、社区数据和生成代理层，而不是第一版静态官网的主托管入口。

适合放到 hidencloud 的内容：

- 桌宠社区 API
- 生成任务、审核、发布等后端接口
- 需要和桌宠 App 同域或同服务编排的页面
- 未来官网中需要读取真实社区数据的接口代理

不建议第一版官网直接放到 hidencloud 的原因：

- 静态官网不需要常驻服务，放在 Pages 更简单。
- hidencloud 已经承担社区 API 和生成代理职责，继续叠加官网静态托管会增加运维耦合。
- 官网内容更新更适合走 GitHub -> Cloudflare Pages 的自动部署链路。

## 线上检查记录

线上站点健康检查已固化为脚本：

```bash
npm run site:monitor
```

默认会检查以下核心路径返回状态、HTML SEO 基础信息、`sitemap.xml` 和 `robots.txt`：

```text
https://biau.playlab.eu.cc/
https://biau.playlab.eu.cc/projects
https://biau.playlab.eu.cc/blog
https://biau.playlab.eu.cc/assistant
https://biau.playlab.eu.cc/projects/legal-rag
https://biau.playlab.eu.cc/projects/ozon-erp
https://biau.playlab.eu.cc/projects/biau-playlab
https://biau.playlab.eu.cc/projects/xunqiu
https://biau.playlab.eu.cc/blog/legal-rag-review
https://biau.playlab.eu.cc/sitemap.xml
https://biau.playlab.eu.cc/robots.txt
```

如需检查预览环境或外链：

```bash
npm run site:monitor -- --base https://<preview-domain>
npm run site:monitor -- --check-links
npm run site:monitor -- --check-external
```

访问人数、来源、热门页面、搜索曝光和事件统计查看方式见 `docs/site-monitoring.md`。
