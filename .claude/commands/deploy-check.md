# Deploy Check

请执行 Cloudflare Pages 部署前检查。

检查项：

1. `git status --short --branch` 是否干净或只包含本次预期改动。
2. `package.json` 的构建命令是否是 `npm run build`。
3. 构建产物目录是否是 `dist`。
4. `npm run lint` 是否通过。
5. `npm run build` 是否通过。
6. 路由是否适合静态部署，刷新详情页是否需要 SPA fallback。
7. 是否存在敏感信息、真实 IP、账号、密钥、连接串。
8. 输出 Cloudflare Pages 建议配置：框架预设、构建命令、输出目录、Node 版本、环境变量。

不要自动推送，除非用户明确要求。
