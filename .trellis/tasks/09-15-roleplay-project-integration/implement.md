# 实施与验证

1. 读取现有项目模型和公开发布契约。
2. 注册 Roleplay 产品、入口、项目详情和状态记录。
3. 运行产品注册检查、项目详情证据检查、lint 和 build。
4. 检查工作区 diff，确保不覆盖用户原有改动。
5. 运行 `npm.cmd run status:contract`，补齐 `public/status/site-status.json` 中的 Roleplay 入口与可靠性记录。
6. 使用 Cloudflare Pages 项目 `biau` 发布生产构建；最终部署为 `c307ad34-e9a9-44a9-b711-8bbbece91411`，自定义域名为 `https://biau.playlab.eu.cc`。
7. 线上回归确认首页、`/projects/roleplay-demo`、`/status` 均返回 HTTP 200；项目详情页的角色库和江迟野演示链接均指向 `https://roleplay.playlab.eu.cc`。

## 验证结果

- `npm.cmd run lint`：通过。
- `npm.cmd run build`：通过。
- `npm.cmd run status:contract`：通过（9 个可靠性项目、8 个公开入口、36 个检查项）。
- `npx.cmd tsx scripts/check-product-registry.ts`：通过。
- `npx.cmd tsx scripts/check-project-detail-evidence.ts`：通过。
- `npm.cmd run docs:manual-gates-check`：通过。
- Cloudflare Pages 生产部署和自定义域名浏览器回归：通过。

首次全量 UI 矩阵使用 Vite dev server 时，`site-language` fixture 无法拦截生产 lazy route chunk；改用 Vite preview 后该组通过。随后发现新增 Roleplay 卡片使旧的“8 个原始项目”断言失效，已改为读取 `heroContent.projects.length`，避免项目注册增长触发错误。最新 UI 矩阵已通过语言、博客/项目发现、阅读导航、公开助手、路由恢复和交互门禁；首页视觉检查另有既有晨曦主题 `BIAU PORT` 对比度 4.09:1 低于 4.5:1 的独立问题，未改变主题 CSS。
