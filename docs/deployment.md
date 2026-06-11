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
- `public/_redirects` 已加入，生产环境刷新 `/projects`、`/cases`、`/blogs` 会回退到 `index.html`。

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

已检查以下路径返回 `200 OK`：

```text
https://biau.playlab.eu.cc/
https://biau.playlab.eu.cc/projects
https://biau.playlab.eu.cc/cases
https://biau.playlab.eu.cc/blogs
```
